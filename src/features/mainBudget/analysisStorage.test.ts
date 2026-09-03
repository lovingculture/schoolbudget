import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MainBudgetAnalysisResult } from "./analysisTypes";
import { mainBudgetAnalysisStorage } from "./analysisStorage";

const KEY = "school-budget:main-budget:file-analysis:v1";
const OLD_EXPENDITURE_KEY = "school-budget:main-budget:expenditures:v1";
const OLD_PDF_KEY = "school-budget:main-budget:pdf-analysis:v1";

function validResult(): MainBudgetAnalysisResult {
  const revenueRow = {
    cells: ["이자수입", "2,000"],
    sourcePage: 4,
    sourceRow: 7,
    confidence: 0.91,
    coordinates: [{ x: 10, y: 20, width: 30, height: 12 }],
  };
  const expenseRow = { cells: ["일반업무추진비", 23_020], sourceSheet: "표지", sourceRow: 70 };
  const verificationFacts = [
    "학교운영비전입금", "사용료", "수수료", "자산매각대", "지난년도수입", "이자수입", "기타행정활동수입", "순세계잉여금",
  ].map((label, index) => ({ label, amount: index === 5 ? 2_000 : index === 0 ? 721_573 : index === 7 ? 80_000 : 0, row: revenueRow }));
  const expense = {
    id: "표지:70", policy: "학교일반운영", unit: "행정지원", business: "일반행정", detail: "기관운영",
    costItem: "일반업무추진비", amount: 23_020, row: expenseRow,
  };
  return {
    source: { fileName: "budget.pdf", format: "pdf", pageCount: 22 },
    identity: { schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" },
    totalRevenue: { label: "세입예산총액", amount: 1_010_749, row: revenueRow },
    purposeRevenue: { label: "목적사업비전입금", amount: 0, row: revenueRow },
    beneficiaryRevenue: { label: "수익자부담수입", amount: 207_176, row: revenueRow },
    revenueBaseline: 803_573,
    verificationRevenue: { facts: verificationFacts, isComplete: true },
    verificationRevenueTotal: 803_573,
    generalBusinessExpenses: [expense],
    generalBusinessExpenseFacts: { facts: [expense], isComplete: true },
    generalBusinessExpenseTotal: 23_020,
    ratio: 23_020 / 803_573 * 100,
    comparison: { status: "match", revenueBaseline: 803_573, verificationRevenueTotal: 803_573, difference: 0 },
    warnings: [{ code: "CHECK", message: "원본 확인", severity: "warning", row: revenueRow }],
  };
}

describe("mainBudgetAnalysisStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("restores a valid versioned result with fact provenance and confidence", () => {
    const result = validResult();
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 2, result }));

    expect(mainBudgetAnalysisStorage.load()).toEqual(result);
  });

  it("removes malformed JSON", () => {
    localStorage.setItem(KEY, "{");

    expect(mainBudgetAnalysisStorage.load()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("removes a schema-version mismatch", () => {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 1, result: validResult() }));

    expect(mainBudgetAnalysisStorage.load()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it.each([
    ["nested number", (stored: Record<string, unknown>) => { stored.ratio = "2.86"; }],
    ["warning enum", (stored: Record<string, unknown>) => {
      stored.warnings = [{ code: "BAD", message: "bad", severity: "info" }];
    }],
    ["nested array", (stored: Record<string, unknown>) => {
      stored.generalBusinessExpenses = [{ amount: 10 }];
    }],
  ])("removes a result with an invalid %s", (_label, mutate) => {
    const stored = validResult() as unknown as Record<string, unknown>;
    mutate(stored);
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 2, result: stored }));

    expect(mainBudgetAnalysisStorage.load()).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("saves only the validated result and never serializes source bytes or browser/PDF handles", () => {
    const unsafe = validResult() as MainBudgetAnalysisResult & Record<string, unknown>;
    unsafe.sourceFile = new File(["private source bytes"], "private-budget.pdf");
    unsafe.sourceBytes = new Uint8Array([1, 2, 3]);
    unsafe.pdfDocument = { fingerprint: "secret-pdf-handle" };
    unsafe.canvas = document.createElement("canvas");
    (unsafe.totalRevenue as unknown as Record<string, unknown>).rawFile = unsafe.sourceFile;

    mainBudgetAnalysisStorage.save(unsafe);

    const raw = localStorage.getItem(KEY)!;
    expect(raw).not.toMatch(/sourceFile|sourceBytes|pdfDocument|canvas|private-budget|secret-pdf-handle/);
    expect(JSON.parse(raw)).toEqual({ schemaVersion: 2, result: validResult() });
  });

  it("removes both legacy keys idempotently while preserving the new result and unrelated data", () => {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 2, result: validResult() }));
    localStorage.setItem(OLD_EXPENDITURE_KEY, "legacy workbook state");
    localStorage.setItem(OLD_PDF_KEY, "legacy pdf state");
    localStorage.setItem("school-budget:unrelated", "kept");

    mainBudgetAnalysisStorage.migrateLegacy();
    mainBudgetAnalysisStorage.migrateLegacy();

    expect(localStorage.getItem(OLD_EXPENDITURE_KEY)).toBeNull();
    expect(localStorage.getItem(OLD_PDF_KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).not.toBeNull();
    expect(localStorage.getItem("school-budget:unrelated")).toBe("kept");
  });

  it("clears only the current analysis key", () => {
    mainBudgetAnalysisStorage.save(validResult());
    localStorage.setItem("school-budget:unrelated", "kept");

    mainBudgetAnalysisStorage.clear();

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem("school-budget:unrelated")).toBe("kept");
  });

  it("round-trips inferred-absent revenue metadata and its provenance", () => {
    const result = validResult();
    result.purposeRevenue = {
      label: "목적사업비전입금",
      amount: 0,
      inferredAbsent: true,
      row: { cells: ["세입예산명세서"], sourcePage: 3, sourceRow: 1 },
    };

    expect(mainBudgetAnalysisStorage.save(result)).toBe(true);
    expect(mainBudgetAnalysisStorage.load()?.purposeRevenue).toEqual(result.purposeRevenue);
  });

  it("treats blocked get and cleanup operations as an empty nonfatal restore", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(mainBudgetAnalysisStorage.load()).toBeNull();
    expect(() => mainBudgetAnalysisStorage.clear()).not.toThrow();
  });

  it("returns false instead of throwing when a quota error blocks saving", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });

    expect(mainBudgetAnalysisStorage.save(validResult())).toBe(false);
  });
});
