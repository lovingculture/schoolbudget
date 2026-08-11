import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/features/prebudget/prebudget.css", "utf8");

describe("성립전예산 홈 일치형 스타일", () => {
  it("승인된 색상 토큰을 페이지 범위에 둔다", () => {
    expect(css).toMatch(/\.prebudget-page\s*\{[^}]*--prebudget-navy:\s*#14334e/i);
    expect(css).toMatch(/--prebudget-blue:\s*#188bc1/i);
    expect(css).toMatch(/--prebudget-teal:\s*#1596a3/i);
    expect(css).toMatch(/--prebudget-sky:\s*#eef8fc/i);
    expect(css).toMatch(/--prebudget-mint:\s*#effaf7/i);
  });

  it("A4 문서 출력 영역을 직접 선택하지 않는다", () => {
    expect(css).not.toMatch(/\.prebudget-paper/);
    expect(css).not.toMatch(/(^|})\s*(body|button|input|select|textarea)\s*\{/m);
  });

  it("페이지의 주요 입력과 버튼을 44px 이상으로 유지한다", () => {
    expect(css).toMatch(/\.prebudget-page[^}]*input[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.prebudget-page[^}]*button[^}]*min-height:\s*44px/);
  });
});
