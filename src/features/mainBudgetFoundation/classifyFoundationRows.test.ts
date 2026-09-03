import { describe, expect, it } from "vitest";
import { classifyRevenue, selectBusinessExpenses } from "./classifyFoundationRows";
import type { FoundationExpenseRow, FoundationRevenueRow } from "./types";

const source = { line: 1, raw: "" };
const revenueRow = (overrides: Partial<FoundationRevenueRow>): FoundationRevenueRow => ({
  chapter: "", division: "", section: "", item: "", costItem: "", currentAmount: 0,
  priorAmount: 0, changeAmount: 0, calculationBasis: "", calculationAmount: null, source, ...overrides,
});
const expenseRow = (overrides: Partial<FoundationExpenseRow>): FoundationExpenseRow => ({
  policy: "", unit: "", business: "", detail: "", costItem: "", currentAmount: 0,
  priorAmount: 0, changeAmount: 0, calculationBasis: "", calculationAmount: null,
  department: "", manager: "", source, ...overrides,
});

describe("본예산 재원 및 업무추진비 분류", () => {
  it("classifies common, integrated, general and beneficiary revenue", () => {
    expect(classifyRevenue(revenueRow({ costItem: "학교운영비전입금", calculationBasis: "학교기본운영비" }))).toBe("공");
    expect(classifyRevenue(revenueRow({ costItem: "학교운영비전입금", calculationBasis: "학생맞춤통합지원 운영" }))).toBe("통");
    expect(classifyRevenue(revenueRow({ chapter: "자체수입", costItem: "이자수입" }))).toBe("일");
    expect(classifyRevenue(revenueRow({ chapter: "학부모부담수입", costItem: "급식비" }))).toBe("수");
  });

  it("selects only exact general-business-expense cost items", () => {
    expect(selectBusinessExpenses([
      expenseRow({ costItem: "일반업무추진비" }),
      expenseRow({ costItem: "목적사업업무추진비" }),
    ])).toHaveLength(1);
  });
});
