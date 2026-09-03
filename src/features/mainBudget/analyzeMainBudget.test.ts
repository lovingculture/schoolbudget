import { describe, expect, it } from "vitest";

import { analyzeMainBudget } from "./analyzeMainBudget";
import type { ParsedMainBudgetInput } from "./analysisTypes";

const verificationAmounts = { 학교운영비전입금: 721573, 사용료: 0, 수수료: 0, 자산매각대: 0, 지난년도수입: 0, 이자수입: 2000, 기타행정활동수입: 0, 순세계잉여금: 80000 };

function verificationFacts(overrides: Partial<typeof verificationAmounts> = {}) {
  return Object.entries({ ...verificationAmounts, ...overrides }).map(([label, amount]) => ({ label, amount }));
}

function input(overrides: Partial<ParsedMainBudgetInput> = {}): ParsedMainBudgetInput {
  return {
    source: { fileName: "sample.xlsx", format: "xlsx" },
    identity: { schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" },
    totalRevenue: { label: "세입예산총액", amount: 1010749 },
    purposeRevenue: { label: "목적사업비전입금", amount: 0 },
    beneficiaryRevenue: { label: "수익자부담수입", amount: 207176 },
    verificationRevenue: { facts: verificationFacts(), isComplete: true },
    generalBusinessExpenses: { facts: Array.from({ length: 18 }, (_, index) => ({ id: String(index), policy: "", unit: "", business: "", detail: "", costItem: "일반업무추진비", amount: index === 0 ? 23020 : 0 })), isComplete: true },
    warnings: [],
    ...overrides,
  };
}

describe("analyzeMainBudget", () => {
  it("calculates the baseline, expense total, and unrounded ratio for matching facts", () => {
    const result = analyzeMainBudget(input());
    expect(result.revenueBaseline).toBe(803573);
    expect(result.generalBusinessExpenseTotal).toBe(23020);
    expect(result.ratio).toBeCloseTo(2.8647, 4);
    expect(result.comparison.status).toBe("match");
  });

  it("includes only exact general-business cost items", () => {
    const result = analyzeMainBudget(input({ generalBusinessExpenses: { facts: [
      { id: "general", policy: "", unit: "", business: "", detail: "", costItem: "일반업무추진비", amount: 23020 },
      { id: "purpose", policy: "", unit: "", business: "", detail: "", costItem: "목적사업업무추진비", amount: 99000 },
    ], isComplete: true } }));
    expect(result.generalBusinessExpenseTotal).toBe(23020);
    expect(result.generalBusinessExpenses.map((expense) => expense.id)).toEqual(["general"]);
  });

  it("reports mismatched independent revenue verification totals", () => {
    const result = analyzeMainBudget(input({ verificationRevenue: { facts: verificationFacts({ 학교운영비전입금: 700000 }), isComplete: true } }));
    expect(result.comparison).toMatchObject({ status: "mismatch", verificationRevenueTotal: 782000, difference: 21573 });
    expect(result.warnings).toContainEqual(expect.objectContaining({ severity: "warning" }));
  });

  it("keeps incomplete verification and expense collections unresolved", () => {
    const result = analyzeMainBudget(input({ verificationRevenue: { facts: [], isComplete: false }, generalBusinessExpenses: { facts: [], isComplete: false } }));
    expect(result.verificationRevenueTotal).toBeNull();
    expect(result.generalBusinessExpenseTotal).toBeNull();
    expect(result.ratio).toBeNull();
    expect(result.comparison.status).toBe("needs-review");
    expect(result.warnings).toContainEqual(expect.objectContaining({ severity: "error" }));
  });

  it("preserves source provenance and confidence for all analysis facts", () => {
    const totalRow = { cells: ["1,010,749"], sourcePage: 2, confidence: 0.91 };
    const purposeRow = { cells: ["0"], sourcePage: 3, confidence: 0.92 };
    const beneficiaryRow = { cells: ["207,176"], sourceSheet: "표지", sourceRow: 44, confidence: 0.93 };
    const verificationRow = { cells: ["721,573"], sourceSheet: "표지", sourceRow: 51, confidence: 0.94 };
    const expenseRow = { cells: ["23,020"], sourcePage: 13, confidence: 0.95 };
    const result = analyzeMainBudget(input({
      totalRevenue: { label: "세입예산총액", amount: 1010749, row: totalRow },
      purposeRevenue: { label: "목적사업비전입금", amount: 0, row: purposeRow },
      beneficiaryRevenue: { label: "수익자부담수입", amount: 207176, row: beneficiaryRow },
      verificationRevenue: { facts: [{ label: "학교운영비전입금", amount: 721573, row: verificationRow }, ...verificationFacts().slice(1)], isComplete: true },
      generalBusinessExpenses: { facts: [{ id: "expense", policy: "", unit: "", business: "", detail: "", costItem: "일반업무추진비", amount: 23020, row: expenseRow }], isComplete: true },
    }));
    expect(result.totalRevenue).toMatchObject({ row: totalRow });
    expect(result.purposeRevenue).toMatchObject({ row: purposeRow });
    expect(result.beneficiaryRevenue).toMatchObject({ row: beneficiaryRow });
    expect(result.verificationRevenue.facts[0]).toMatchObject({ row: verificationRow });
    expect(result.generalBusinessExpenses[0]).toMatchObject({ row: expenseRow });
  });

  it("refuses a ratio with a zero denominator", () => {
    const result = analyzeMainBudget(input({ totalRevenue: { label: "세입예산총액", amount: 207176 }, purposeRevenue: { label: "목적사업비전입금", amount: 0 }, beneficiaryRevenue: { label: "수익자부담수입", amount: 207176 }, verificationRevenue: { facts: verificationFacts({ 학교운영비전입금: 0, 이자수입: 0, 순세계잉여금: 0 }), isComplete: true } }));
    expect(result.revenueBaseline).toBe(0);
    expect(result.ratio).toBeNull();
    expect(result.comparison.status).toBe("match");
  });
});
