import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const buildScript = readFileSync(join(process.cwd(), "scripts/prepare-sites-build.mjs"), "utf8");

describe("Sites 다운로드 응답", () => {
  it("매크로 통합문서를 Edge 미리보기 대신 첨부파일로 내려보낸다", () => {
    expect(buildScript).toContain('url.pathname === "/download/expenditure-performance-budget-revision.xlsm"');
    expect(buildScript).toContain('new URL("/resources/expenditure-performance-budget-revision.xlsm", request.url)');
    expect(buildScript).toContain('"Content-Type", "application/vnd.ms-excel.sheet.macroEnabled.12"');
    expect(buildScript).toContain('"Content-Disposition",');
    expect(buildScript).toContain("filename*=UTF-8''");
  });
});
