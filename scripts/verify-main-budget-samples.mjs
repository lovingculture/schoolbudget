import { readFile } from "node:fs/promises";
import { File as NodeFile } from "node:buffer";
import { basename, extname } from "node:path";
import { createServer } from "vite";

const EXPECTED_BY_FILE = {
  "옥정2.xls": [807_573, 23_020, 2.85],
  "옥정.xls": [807_573, 23_020, 2.85],
  "옥정추가 xlsx.xlsx": [807_573, 23_020, 2.85],
  "옥정2025.xlsx": [764_117, 19_060, 2.49],
};

const MIME_TYPES = {
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function roundedRatio(value) {
  return value === null ? null : Number(value.toFixed(2));
}

function formatValue(value, suffix) {
  return value === null ? `확인 필요${suffix}` : `${value.toLocaleString("ko-KR")}${suffix}`;
}

function matchesExpected(fileName, result) {
  const expected = EXPECTED_BY_FILE[fileName];
  return expected
    && result.revenueBaseline === expected[0]
    && result.generalBusinessExpenseTotal === expected[1]
    && roundedRatio(result.ratio) === expected[2]
    && !result.warnings.some((warning) => warning.severity === "error");
}

async function main() {
  const paths = process.argv.slice(2).filter((argument) => argument !== "--");
  if (paths.length === 0) {
    console.error("사용법: node scripts/verify-main-budget-samples.mjs -- <예산서.xls|xlsx> [...]");
    process.exitCode = 1;
    return;
  }

  const vite = await createServer({
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  let failed = false;

  try {
    const { analyzeBudgetFile } = await vite.ssrLoadModule("/src/features/mainBudget/analyzeBudgetFile.ts");
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
        const passed = matchesExpected(fileName, result);
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
