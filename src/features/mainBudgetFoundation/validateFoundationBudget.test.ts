import { describe, expect, it } from "vitest";
import { validateFoundationBudget } from "./validateFoundationBudget";
import type { FoundationBudgetDocument } from "./types";

const source = { line: 1, raw: "" };
function document(overrides: Partial<FoundationBudgetDocument> = {}): FoundationBudgetDocument {
  return {
    fileName: "budget.csv", encoding: "utf-8", fiscalYear: 2026, budgetType: "본예산", unit: "천원",
    sourceRevenueTotal: 100, sourceExpenseTotal: 100, warnings: [],
    revenueRows: [{ chapter: "자체수입", division: "", section: "", item: "", costItem: "이자수입", currentAmount: 100, priorAmount: 0, changeAmount: 100, calculationBasis: "", calculationAmount: null, source }],
    expenseRows: [{ policy: "학교일반운영", unit: "", business: "", detail: "", costItem: "일반수용비", currentAmount: 100, priorAmount: 0, changeAmount: 100, calculationBasis: "", calculationAmount: null, department: "", manager: "", source }],
    ...overrides,
  };
}

describe("validateFoundationBudget", () => {
  it("allows export when source, detail and balance totals agree", () => {
    expect(validateFoundationBudget(document())).toMatchObject({
      revenueDetailTotal: 100, expenseDetailTotal: 100, balanceDifference: 0, canExport: true,
    });
  });

  it("blocks export when source revenue and expense totals do not reconcile", () => {
    const result = validateFoundationBudget(document({ sourceExpenseTotal: 90 }));
    expect(result.canExport).toBe(false);
    expect(result.balanceDifference).toBe(10);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "REVENUE_EXPENSE_MISMATCH", severity: "error" }));
  });

  it("warns but does not block when a revenue row needs manual classification", () => {
    const result = validateFoundationBudget(document({ revenueRows: [document().revenueRows[0], { ...document().revenueRows[0], chapter: "", currentAmount: 0, costItem: "새로운수입" }] }));
    expect(result.canExport).toBe(true);
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: "UNCLASSIFIED_REVENUE", severity: "warning" }));
  });
});
