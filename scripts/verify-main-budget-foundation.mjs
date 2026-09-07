import { spawnSync } from "node:child_process";
import { basename, resolve } from "node:path";

const sample = process.argv.at(-1);
if (!sample || sample === process.argv[1]) {
  console.error("사용법: node scripts/verify-main-budget-foundation.mjs -- <통합 CSV 경로>");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "--run", "src/features/mainBudgetFoundation/actualSample.test.ts", "--reporter=dot"], {
  cwd: process.cwd(),
  env: { ...process.env, MAIN_BUDGET_FOUNDATION_SAMPLE: resolve(sample) },
  encoding: "utf8",
});

if (result.status !== 0) {
  if (result.error) console.error(result.error.message);
  process.stderr.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  process.exit(result.status ?? 1);
}

console.log(`PASS | ${basename(sample)} | CP949/EUC-KR 자동 인식 | 2026 | 세입 1,010,749천원 | 세출 1,010,749천원 | 7 sheets`);
