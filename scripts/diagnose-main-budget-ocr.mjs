import { createServer as createHttpServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { spawn } from "node:child_process";
import { createServer as createViteServer } from "vite";

const MIME_TYPES = { ".pdf": "application/pdf" };
const browserCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

function blankReport(fatalReason = "") {
  return { pages: [], summary: {}, revenue: {}, expenditure: {}, fatalReason };
}

async function availableBrowser() {
  for (const candidate of browserCandidates) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // Try the next installed browser location.
    }
  }
  throw new Error("Chrome 또는 Edge 실행 파일을 찾지 못했습니다.");
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function unusedPort() {
  const probe = createHttpServer();
  const port = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function waitForDebugger(port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) return await response.json();
    } catch {
      // Browser startup is still in progress.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("진단 브라우저가 제한 시간 안에 시작되지 않았습니다.");
}

async function connectDebugger(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("진단 브라우저에 연결하지 못했습니다.")), { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  return {
    call(method, params = {}) {
      const id = ++nextId;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close() { socket.close(); },
  };
}

async function waitForResult(client, timeoutMs = 15 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const evaluated = await client.call("Runtime.evaluate", {
      expression: "window.__mainBudgetDiagnosticResult ?? null",
      returnByValue: true,
      awaitPromise: true,
    });
    if (evaluated.result?.value) return evaluated.result.value;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("OCR 진단이 제한 시간 안에 완료되지 않았습니다.");
}

function harnessHtml(inputName) {
  return `<!doctype html><html><body><script type="module">
    import { analyzeBudgetFile } from "/src/features/mainBudget/analyzeBudgetFile.ts";
    import { rowText } from "/src/features/mainBudget/parseBudgetSummary.ts";
    const report = ${JSON.stringify(blankReport())};
    const pages = new Map();
    const clipped = value => String(value).slice(0, 120);
    const warnings = values => values.map(({ code, severity, row }) => ({
      code, severity, page: row?.sourcePage, row: row?.sourceRow,
      sourceText: row ? clipped(rowText(row)) : undefined,
    }));
    const parserState = value => ({
      hasValidStructure: value.hasValidStructure,
      isComplete: value.isComplete,
      warnings: warnings(value.warnings),
    });
    const onDiagnostic = diagnostic => {
      if (diagnostic.kind === "pdf-page") {
        const headingCandidates = diagnostic.rows.map(rowText)
          .filter(text => /(예산|세입|세출|학교|유치원|업무추진비)/.test(text))
          .map(clipped).slice(0, 20);
        pages.set(diagnostic.pageNumber, {
          pageNumber: diagnostic.pageNumber,
          classification: diagnostic.classification,
          textRowCount: diagnostic.rowCount,
          coverage: diagnostic.coverage,
          hasLargeRaster: diagnostic.hasLargeRaster,
          ocrRowCount: 0,
          ocrAverageConfidence: null,
          headingCandidates,
        });
      } else if (diagnostic.kind === "ocr-page") {
        const page = pages.get(diagnostic.pageNumber) ?? { pageNumber: diagnostic.pageNumber };
        page.ocrRowCount = diagnostic.rowCount;
        page.ocrAverageConfidence = diagnostic.averageConfidence;
        page.headingCandidates = diagnostic.rows.map(rowText)
          .filter(text => /(예산|세입|세출|학교|유치원|업무추진비)/.test(text))
          .map(clipped).slice(0, 20);
        pages.set(diagnostic.pageNumber, page);
      } else {
        report.summary = {
          ...parserState(diagnostic.summary),
          sectionFound: diagnostic.summary.warnings.every(({ code }) => code !== "BUDGET_SUMMARY_SECTION"),
          identity: diagnostic.summary.identity,
          budgetTypeEvidence: diagnostic.summary.budgetTypeEvidence,
        };
        report.revenue = {
          ...parserState(diagnostic.revenue),
          sectionFound: diagnostic.revenue.warnings.every(({ code }) => code !== "REVENUE_SECTION"),
        };
        report.expenditure = {
          ...parserState(diagnostic.expenditure),
          sectionFound: diagnostic.expenditure.warnings.every(({ code }) => code !== "EXPENDITURE_SECTION"),
        };
      }
    };
    try {
      const response = await fetch("/__input");
      if (!response.ok) throw new Error("입력 파일을 읽지 못했습니다.");
      const blob = await response.blob();
      const file = new File([blob], ${JSON.stringify(inputName)}, { type: "application/pdf" });
      await analyzeBudgetFile(file, {
        signal: new AbortController().signal,
        onProgress: () => {},
        onDiagnostic,
      });
    } catch (error) {
      report.fatalReason = error instanceof Error ? error.message : String(error);
    } finally {
      report.pages = [...pages.values()].sort((a, b) => a.pageNumber - b.pageNumber);
      window.__mainBudgetDiagnosticResult = report;
    }
  </script></body></html>`;
}

async function diagnose(filePath) {
  const bytes = await readFile(filePath);
  const fileName = basename(filePath);
  const vite = await createViteServer({ appType: "custom", logLevel: "error", server: { middlewareMode: true } });
  const http = createHttpServer((request, response) => {
    if (request.url === "/__input") {
      response.writeHead(200, { "Content-Type": MIME_TYPES[extname(fileName).toLowerCase()] ?? "application/octet-stream" });
      response.end(bytes);
      return;
    }
    if (request.url === "/__diagnose") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(harnessHtml(fileName));
      return;
    }
    vite.middlewares(request, response, () => {
      response.writeHead(404);
      response.end();
    });
  });
  const port = await listen(http);
  const debugPort = await unusedPort();
  const profile = join(tmpdir(), `main-budget-diagnostic-browser-${process.pid}-${Date.now()}`);
  const browser = spawn(await availableBrowser(), [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    `http://127.0.0.1:${port}/__diagnose`,
  ], { stdio: "ignore" });
  try {
    const targets = await waitForDebugger(debugPort);
    const target = targets.find(({ type, url }) => type === "page" && url.includes("/__diagnose"));
    if (!target) throw new Error("진단 페이지를 찾지 못했습니다.");
    const client = await connectDebugger(target.webSocketDebuggerUrl);
    try {
      return await waitForResult(client);
    } finally {
      client.close();
    }
  } finally {
    browser.kill();
    if (browser.exitCode === null) {
      await new Promise((resolve) => {
        browser.once("exit", resolve);
        setTimeout(resolve, 5_000);
      });
    }
    await new Promise((resolve) => http.close(resolve));
    await vite.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => undefined);
  }
}

async function main() {
  const paths = process.argv.slice(2).filter((argument) => argument !== "--");
  if (paths.length !== 1) {
    console.log(JSON.stringify(blankReport("사용법: node scripts/diagnose-main-budget-ocr.mjs -- <스캔-예산서.pdf>"), null, 2));
    process.exitCode = 1;
    return;
  }
  try {
    const report = await diagnose(paths[0]);
    console.log(JSON.stringify(report, null, 2));
    if (report.fatalReason) process.exitCode = 1;
  } catch (error) {
    console.log(JSON.stringify(blankReport(error instanceof Error ? error.message : String(error)), null, 2));
    process.exitCode = 1;
  }
}

await main();
