import { beforeEach, describe, expect, it, vi } from "vitest";
import { foundationStorage } from "./foundationStorage";
import type { FoundationDraft } from "./types";

const KEY = "school-budget:main-budget-foundation:v1";
const source = { line: 1, raw: "" };
const draft: FoundationDraft = {
  edits: {},
  document: {
    fileName: "budget.csv", encoding: "utf-8", fiscalYear: 2026, budgetType: "본예산", unit: "천원",
    sourceRevenueTotal: 100, sourceExpenseTotal: 100, warnings: [],
    revenueRows: [{ chapter: "자체수입", division: "", section: "", item: "", costItem: "이자수입", currentAmount: 100, priorAmount: 0, changeAmount: 100, calculationBasis: "", calculationAmount: null, source }],
    expenseRows: [{ policy: "학교일반운영", unit: "", business: "", detail: "", costItem: "일반수용비", currentAmount: 100, priorAmount: 0, changeAmount: 100, calculationBasis: "", calculationAmount: null, department: "", manager: "", source }],
  },
};

describe("foundationStorage", () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

  it("restores validated normalized data without source file bytes", () => {
    expect(foundationStorage.save({ ...draft, sourceBytes: new Uint8Array([1, 2]) } as FoundationDraft)).toBe(true);
    expect(foundationStorage.load()).toEqual(draft);
    expect(localStorage.getItem(KEY)).not.toContain("sourceBytes");
  });

  it("removes malformed or old-version data", () => {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 0, ...draft }));
    expect(foundationStorage.load()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("handles unavailable and full browser storage without breaking the page", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    expect(foundationStorage.save(draft)).toBe(false);
  });
});
