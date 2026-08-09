import type { ExpenditureSummary, MainBudgetExpenditureRow } from "./types";

export function summarizeExpenditures(rows: MainBudgetExpenditureRow[]): ExpenditureSummary {
  const requestedTotal = rows.reduce((sum, row) => sum + (row.requestedAmount ?? 0), 0);
  const priorTotal = rows.reduce((sum, row) => sum + (row.priorRequestedAmount ?? 0), 0);
  return {
    requestedTotal,
    priorTotal,
    variance: requestedTotal - priorTotal,
    departmentCount: new Set(rows.map((row) => row.department.trim()).filter(Boolean)).size,
    rowCount: rows.length,
    unresolvedCount: rows.filter((row) => row.requestedAmount === undefined).length,
    errorCount: rows.reduce((sum, row) => sum + row.issues.filter((item) => item.level === "error").length, 0),
    warningCount: rows.reduce((sum, row) => sum + row.issues.filter((item) => item.level === "warning").length, 0),
    reviewCount: rows.reduce((sum, row) => sum + row.issues.filter((item) => item.level === "review").length, 0),
  };
}
