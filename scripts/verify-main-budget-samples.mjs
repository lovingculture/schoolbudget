import { readFile } from "node:fs/promises";
import { File as NodeFile } from "node:buffer";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";

const EXPECTED = {
  revenueBaseline: 803_573,
  generalBusinessExpenseTotal: 23_020,
  ratioRounded: 2.86,
};

const MIME_TYPES = {
  ".pdf": "application/pdf",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function installNodePdfAdapters() {
  if (!Uint8Array.prototype.toHex) {
    Object.defineProperty(Uint8Array.prototype, "toHex", {
      value() {
        return Array.from(this, (byte) => byte.toString(16).padStart(2, "0")).join("");
      },
    });
  }
  if (!Map.prototype.getOrInsertComputed) {
    Object.defineProperty(Map.prototype, "getOrInsertComputed", {
      value(key, callback) {
        if (!this.has(key)) this.set(key, callback(key));
        return this.get(key);
      },
    });
  }
  if (!Math.sumPrecise) {
    Object.defineProperty(Math, "sumPrecise", {
      value(values) {
        return Array.from(values).reduce((sum, value) => sum + value, 0);
      },
    });
  }
}

function roundedRatio(value) {
  return value === null ? null : Number(value.toFixed(2));
}

function formatValue(value, suffix) {
  return value === null ? `확인 필요${suffix}` : `${value.toLocaleString("ko-KR")}${suffix}`;
}

function matchesExpected(result) {
  return result.revenueBaseline === EXPECTED.revenueBaseline
    && result.generalBusinessExpenseTotal === EXPECTED.generalBusinessExpenseTotal
    && roundedRatio(result.ratio) === EXPECTED.ratioRounded
    && !result.warnings.some((warning) => warning.severity === "error");
}

async function main() {
  const paths = process.argv.slice(2).filter((argument) => argument !== "--");
  if (paths.length === 0) {
    console.error("사용법: node scripts/verify-main-budget-samples.mjs -- <예산서.xls|xlsx|pdf> [...]");
    process.exitCode = 1;
    return;
  }

  installNodePdfAdapters();
  const vite = await createServer({
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let failed = false;

  try {
    const { analyzeBudgetFile } = await vite.ssrLoadModule("/src/features/mainBudget/analyzeBudgetFile.ts");
    const { GlobalWorkerOptions } = await import("pdfjs-dist");
    GlobalWorkerOptions.workerSrc = pathToFileURL(resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs")).href;
    for (const filePath of paths) {
      const fileName = basename(filePath);
      try {
        const bytes = await readFile(filePath);
        const extension = extname(fileName).toLowerCase();
        const RuntimeFile = globalThis.File ?? NodeFile;
        const file = new RuntimeFile([bytes], fileName, { type: MIME_TYPES[extension] ?? "" });
        const result = await analyzeBudgetFile(file, {
          signal: new AbortController().signal,
          onProgress: () => {},
        });
        const warnings = result.warnings.length === 0
          ? "없음"
          : result.warnings.map((warning) => `${warning.severity}:${warning.code}`).join(", ");
        const passed = matchesExpected(result);
        failed ||= !passed;
        console.log([
          passed ? "PASS" : "FAIL",
          fileName,
          result.source.format.toUpperCase(),
          `세입 ${formatValue(result.revenueBaseline, "천원")}`,
          `일반업무추진비 ${formatValue(result.generalBusinessExpenseTotal, "천원")}`,
          `비율 ${formatValue(roundedRatio(result.ratio), "%")}`,
          `경고 ${warnings}`,
        ].join(" | "));
      } catch (error) {
        failed = true;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAIL | ${fileName} | ${message}`);
      }
    }
  } finally {
    await vite.close();
  }

  if (failed) process.exitCode = 1;
}

await main();
