import type { AnalysisWarning, BudgetDocumentIdentity, BudgetLogicalRow } from "./analysisTypes";

export type DetailWorkbookIdentityResult = {
  identity: BudgetDocumentIdentity;
  hasRevenueSection: boolean;
  hasExpenditureSection: boolean;
  warnings: AnalysisWarning[];
};

function rowText(row: BudgetLogicalRow): string {
  return row.cells
    .filter((cell): cell is string | number => typeof cell === "string" || typeof cell === "number")
    .map(String)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string): string {
  return value.replace(/[\s·ㆍ:：()（）\-]/g, "");
}

function accountingYear(values: readonly string[]): number | null {
  for (const value of values) {
    const match = /(?:^|\D)(20\d{2})(?:\s*학년도|\D|$)/.exec(value);
    if (match) return Number(match[1]);
  }
  return null;
}

function schoolName(values: readonly string[]): string | null {
  for (const value of values) {
    const match = /([가-힣A-Za-z0-9]+(?:유치원|초등학교|중학교|고등학교))/.exec(value.replace(/\s+/g, ""));
    if (match && !["학교회계", "초등학교", "중학교", "고등학교"].includes(match[1])) return match[1];
  }
  return null;
}

function fileStem(fileName: string): string {
  const stem = fileName.replace(/\.(?:xls|xlsx)$/i, "").replace(/20\d{2}/g, "").trim();
  return stem || "학교명 미표시";
}

export function parseDetailWorkbookIdentity(rows: BudgetLogicalRow[], fileName: string): DetailWorkbookIdentityResult {
  const texts = rows.map(rowText);
  const normalized = texts.map(compact);
  const year = accountingYear([...texts, fileName]);
  const warnings: AnalysisWarning[] = [];
  if (year === null) {
    warnings.push({ code: "ACCOUNTING_YEAR", message: "회계연도를 확인할 수 없어 현재 연도로 표시합니다.", severity: "warning" });
  }
  return {
    identity: {
      schoolName: schoolName(texts) ?? fileStem(fileName),
      accountingYear: year ?? new Date().getFullYear(),
      budgetType: "본예산",
    },
    hasRevenueSection: normalized.some((text) => text.includes("세입예산명세서")),
    hasExpenditureSection: normalized.some((text) => text.includes("세출예산명세서")),
    warnings,
  };
}
