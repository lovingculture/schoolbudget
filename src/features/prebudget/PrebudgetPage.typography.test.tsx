import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PrebudgetPage } from "./PrebudgetPage";
import type { DraftStorage } from "./storage";

const storage: DraftStorage = {
  load: () => null,
  save: vi.fn(),
  clear: vi.fn(),
};

const styles = readFileSync("src/styles.css", "utf8");

describe("성립전예산 작성 화면 글자 크기", () => {
  it("작성 화면에만 전용 범위를 적용한다", () => {
    const { container } = render(
      <PrebudgetPage initialSchoolName="서울한빛초등학교" storage={storage} />,
    );

    expect(container.querySelector(".content.prebudget-page")).not.toBeNull();
  });

  it("라벨 입력값 설명과 중요 안내의 최소 크기를 선언한다", () => {
    expect(styles).toMatch(
      /\.prebudget-page \.form-grid label[^}]*font-size:\s*16px/,
    );
    expect(styles).toMatch(
      /\.prebudget-page \.form-grid input[^}]*font-size:\s*16px/,
    );
    expect(styles).toMatch(
      /\.prebudget-page \.category-help b[^}]*font-size:\s*16px/,
    );
    expect(styles).toMatch(
      /\.prebudget-page \.category-help p[^}]*font-size:\s*15px/,
    );
    expect(styles).toMatch(
      /\.prebudget-page \.prebudget-errors\s*>\s*b[^}]*font-size:\s*18px/,
    );
  });
});
