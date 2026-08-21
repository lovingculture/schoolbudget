import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const homeCss = readFileSync(join(process.cwd(), "src/features/home/home.css"), "utf8");

describe("홈 화면 혜택 아이콘", () => {
  it("문자 인코딩과 무관하게 체크 표시를 렌더링한다", () => {
    expect(homeCss).toContain('content: ""');
    expect(homeCss).toContain("border-right: 2px solid");
    expect(homeCss).toContain("border-bottom: 2px solid");
    expect(homeCss).not.toContain('content: "✓"');
    expect(homeCss).not.toContain('content: "\\2713"');
  });
});
