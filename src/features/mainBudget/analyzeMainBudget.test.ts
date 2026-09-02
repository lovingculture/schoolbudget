import { describe, expect, it } from "vitest";

import { analyzeMainBudget } from "./analyzeMainBudget";
import type { ParsedMainBudgetInput } from "./analysisTypes";

function input(overrides: Partial<ParsedMainBudgetInput> = {}): ParsedMainBudgetInput {
  return {
    source: { fileName: "sample.xlsx", format: "xlsx" },
    totalRevenue: 1010749,
    purposeRevenue: 0,
    beneficiaryRevenue: 207176,
    verificationRevenue: {
      학교운영비전입금: 721573,
      사용료: 0,
      수수료: 0,
      자산매각대: 0,
      지난년도수입: 0,
      이자수입: 2000,
      기타행정활동수입: 0,
      순세계잉여금: 80000,
    },
    generalBusinessExpenses: Array.from({ length: 18 }, (_, index) => ({
      id: String(index), policy: "", unit: "", business: "", detail: "", amount: index === 0 ? 23020 : 0,
    })),
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

  it("reports mismatched independent revenue verification totals", () => {
    const result = analyzeMainBudget(input({
      verificationRevenue: { 학교운영비전입금: 700000 },
    }));

    expect(result.comparison).toMatchObject({
      status: "mismatch",
      verificationRevenueTotal: 700000,
      difference: 103573,
    });
    expect(result.warnings).toContainEqual(expect.objectContaining({ severity: "warning" }));
  });

  it("keeps missing facts unresolved and marks the result for review", () => {
    const result = analyzeMainBudget(input({
      totalRevenue: null,
      generalBusinessExpenses: [{ id: "1", policy: "", unit: "", business: "", detail: "", amount: null }],
    }));

    expect(result.revenueBaseline).toBeNull();
    expect(result.generalBusinessExpenseTotal).toBeNull();
    expect(result.ratio).toBeNull();
    expect(result.comparison.status).toBe("needs-review");
    expect(result.warnings).toContainEqual(expect.objectContaining({ severity: "error" }));
  });

  it("refuses a ratio with a zero denominator", () => {
    const result = analyzeMainBudget(input({
      totalRevenue: 207176,
      purposeRevenue: 0,
      beneficiaryRevenue: 207176,
      verificationRevenue: { 학교운영비전입금: 0 },
    }));

    expect(result.revenueBaseline).toBe(0);
    expect(result.ratio).toBeNull();
    expect(result.comparison.status).toBe("match");
  });
});
