import { describe, expect, it } from "vitest";
import { closingFileBaseName, formatRatio, formatWon } from "./format";

describe("결산 문서 표시 규칙", () => {
  it("금액과 비율을 공식 문서 형식으로 표시한다", () => {
    expect(formatWon(0)).toBe("-");
    expect(formatWon(2724818217)).toBe("2,724,818,217");
    expect(formatRatio(5)).toBe("5.0");
  });

  it("학년도를 포함한 기본 파일명을 만든다", () => {
    expect(closingFileBaseName(2025)).toBe(
      "1.(심의안건) 2025학년도 학교회계 세입세출 결산 (안)",
    );
  });
});
