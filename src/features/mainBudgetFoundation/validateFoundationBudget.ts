import { classifyRevenue } from "./classifyFoundationRows";
import type { FoundationBudgetDocument, FoundationValidation, FoundationWarning } from "./types";

export function validateFoundationBudget(document: FoundationBudgetDocument): FoundationValidation {
  const revenueDetailTotal = document.revenueRows.reduce((sum, row) => sum + row.currentAmount, 0);
  const expenseDetailTotal = document.expenseRows.reduce((sum, row) => sum + row.currentAmount, 0);
  const balanceDifference = document.sourceRevenueTotal - document.sourceExpenseTotal;
  const warnings: FoundationWarning[] = [...document.warnings];

  if (revenueDetailTotal !== document.sourceRevenueTotal) warnings.push({
    code: "REVENUE_DETAIL_MISMATCH",
    message: `세입 상세 합계와 원본 세입합계가 ${Math.abs(document.sourceRevenueTotal - revenueDetailTotal).toLocaleString("ko-KR")}천원 차이 납니다.`,
    severity: "error",
  });
  if (expenseDetailTotal !== document.sourceExpenseTotal) warnings.push({
    code: "EXPENSE_DETAIL_MISMATCH",
    message: `세출 상세 합계와 원본 세출합계가 ${Math.abs(document.sourceExpenseTotal - expenseDetailTotal).toLocaleString("ko-KR")}천원 차이 납니다.`,
    severity: "error",
  });
  if (balanceDifference !== 0) warnings.push({
    code: "REVENUE_EXPENSE_MISMATCH",
    message: `세입합계와 세출합계가 ${Math.abs(balanceDifference).toLocaleString("ko-KR")}천원 차이 납니다.`,
    severity: "error",
  });
  const firstUnclassified = document.revenueRows.find((row) => classifyRevenue(row) === "확인");
  if (firstUnclassified) warnings.push({
    code: "UNCLASSIFIED_REVENUE",
    message: "자동 분류되지 않은 세입 항목이 있어 예산성격 확인이 필요합니다.",
    severity: "warning",
    line: firstUnclassified.source.line,
  });

  return {
    revenueDetailTotal,
    expenseDetailTotal,
    balanceDifference,
    canExport: !warnings.some((warning) => warning.severity === "error"),
    warnings,
  };
}
