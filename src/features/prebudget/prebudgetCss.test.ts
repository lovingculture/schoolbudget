import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const prebudgetCss = readFileSync(join(process.cwd(), "src/features/prebudget/prebudget.css"), "utf8");

describe("성립전예산 예시 표", () => {
  it("모든 열을 한 화면에 표시하고 긴 내용은 셀 안에서 줄바꿈한다", () => {
    expect(prebudgetCss).toContain(".prebudget-example-detail table { width: 100%; min-width: 0; table-layout: fixed;");
    expect(prebudgetCss).toContain(".prebudget-example-detail td { padding: 8px 7px;");
    expect(prebudgetCss).toContain("font-size: 12px;");
    expect(prebudgetCss).toContain("white-space: normal;");
    expect(prebudgetCss).toContain("overflow-wrap: anywhere;");
    expect(prebudgetCss).toContain("overflow-x: auto;");
  });
});
