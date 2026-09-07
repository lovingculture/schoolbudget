import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homeCss = readFileSync(join(process.cwd(), "src/features/home/home.css"), "utf8");
const indexHtml = readFileSync(join(process.cwd(), "index.html"), "utf8");

describe("홈 화면 혜택 아이콘", () => {
  it("문자 인코딩과 무관하게 체크 표시를 렌더링한다", () => {
    expect(homeCss).toContain('content: ""');
    expect(homeCss).toContain("border-right: 2px solid");
    expect(homeCss).toContain("border-bottom: 2px solid");
    expect(homeCss).not.toContain('content: "✓"');
    expect(homeCss).not.toContain('content: "\\2713"');
  });
});

describe("홈 화면 구축 목적", () => {
  it("다른 홈 카드와 어울리는 부드러운 카드 형태로 표시한다", () => {
    expect(homeCss).toMatch(/\.home-intro-layout \{[\s\S]*?border: 1px solid #dce9e7;/);
    expect(homeCss).toMatch(/\.home-intro-layout \{[\s\S]*?border-radius: 30px;/);
    expect(homeCss).toMatch(/\.home-intro-layout \{[\s\S]*?background: linear-gradient\(135deg, #f7fcfb 0%, #ffffff 62%, #f2f8ff 100%\);/);
    expect(homeCss).toMatch(/\.home-intro-layout \{[\s\S]*?box-shadow: 0 18px 45px rgba\(32, 76, 72, \.08\);/);
  });
});

describe("모바일 홈 화면", () => {
  it("휴대폰 실제 화면 너비를 사용하고 업무 카드를 한 열로 표시한다", () => {
    expect(indexHtml).toContain('name="viewport"');
    expect(indexHtml).toContain("width=device-width, initial-scale=1");
    expect(homeCss).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.home-work-grid,[\s\S]*?grid-template-columns: 1fr/);
    expect(homeCss).toMatch(/@media \(max-width: 420px\)[\s\S]*?\.home-work-card[\s\S]*?min-height: auto/);
  });

  it("빠른 서비스를 중간 화면에서는 두 열, 휴대폰에서는 한 열로 표시한다", () => {
    expect(homeCss).toMatch(/@media \(max-width: 1050px\)[\s\S]*?\.home-quick-services[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(homeCss).toMatch(/@media \(max-width: 760px\)[\s\S]*?\.home-quick-services[\s\S]*?grid-template-columns: 1fr/);
  });
});
