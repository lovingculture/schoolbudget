import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const prebudgetCss = readFileSync(join(process.cwd(), "src/features/prebudget/prebudget.css"), "utf8");

describe("성립전예산 예시 표", () => {
  it("각 항목을 한 줄로 표시하고 좁은 화면에서는 가로로 스크롤한다", () => {
    expect(prebudgetCss).toContain(".prebudget-example-detail table { width: 100%; min-width: 1500px;");
    expect(prebudgetCss).toContain(".prebudget-example-detail td { padding: 11px 12px;");
    expect(prebudgetCss).toContain("font-size: 13px;");
    expect(prebudgetCss).toContain("white-space: nowrap;");
    expect(prebudgetCss).toContain("overflow-x: auto;");
  });
});
