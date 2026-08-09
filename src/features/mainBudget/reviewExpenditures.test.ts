import { describe, expect, it } from "vitest";
import type { MainBudgetExpenditureRow } from "./types";
import { reviewExpenditures } from "./reviewExpenditures";

const row = (overrides: Partial<MainBudgetExpenditureRow> = {}): MainBudgetExpenditureRow => ({
  id: "1", sourceFile: "a.xls", sourceSheet: "세출예산서식", sourceRow: 2,
  department: "교육부", business: "교육과정", detail: "교재", costCategory: "교육운영비",
  description: "교재 구입", expression: "100000*2", originalRequestedAmount: 200000,
  requestedAmount: 200000, manager: "김담당", priorExpression: "100000", priorRequestedAmount: 100000,
  originalVariance: 100000, variance: 100000, issues: [], ...overrides,
});

describe("본예산 세출 자동검토", () => {
  it("필수값 누락과 산출식 해석 실패를 표시한다", () => {
    const [reviewed] = reviewExpenditures([row({ department: "", requestedAmount: undefined })]);
    expect(reviewed.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["REQUIRED_DEPARTMENT", "EXPRESSION_UNSUPPORTED"]));
  });

  it("계산액과 원본 요구금액 및 증감 불일치를 표시한다", () => {
    const [reviewed] = reviewExpenditures([row({ originalRequestedAmount: 190000, originalVariance: 80000 })]);
    expect(reviewed.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["REQUEST_AMOUNT_MISMATCH", "VARIANCE_MISMATCH"]));
  });

  it("같은 부서·사업·항목·산출내역을 중복 의심으로 표시한다", () => {
    const reviewed = reviewExpenditures([row(), row({ id: "2", sourceRow: 3 })]);
    expect(reviewed.every((item) => item.issues.some((issue) => issue.code === "DUPLICATE_SUSPECTED"))).toBe(true);
  });

  it("정상 행에는 검토 항목을 만들지 않는다", () => {
    expect(reviewExpenditures([row()])[0].issues).toEqual([]);
  });
});
