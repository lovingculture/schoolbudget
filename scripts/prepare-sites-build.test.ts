import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const buildScript = readFileSync(join(process.cwd(), "scripts/prepare-sites-build.mjs"), "utf8");
const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  scripts: { build: string };
};

describe("Sites 다운로드 응답", () => {
  it("게시용 화면을 TypeScript Vite 설정으로 빌드한다", () => {
    expect(packageJson.scripts.build).toContain("vite build --config vite.config.ts");
  });

  it("매크로 통합문서를 Edge 미리보기 대신 첨부파일로 내려보낸다", () => {
    expect(buildScript).toContain('"/download/expenditure-performance-budget-revision.xlsm"');
    expect(buildScript).toContain('asset: "/resources/expenditure-performance-budget-revision.xlsm"');
    expect(buildScript).toContain('"Content-Type", "application/vnd.ms-excel.sheet.macroEnabled.12"');
    expect(buildScript).toContain('"Content-Disposition",');
    expect(buildScript).toContain("filename*=UTF-8''");
    expect(buildScript).toContain('"/download/school-main-budget-foundation-template.xlsm"');
    expect(buildScript).toContain('asset: "/resources/school-main-budget-foundation-template.xlsm"');
    expect(buildScript).toContain('headers.set("X-Content-Type-Options", "nosniff")');
  });
});
