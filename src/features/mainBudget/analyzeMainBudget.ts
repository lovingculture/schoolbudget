import type {
  AnalysisWarning,
  MainBudgetAnalysisResult,
  ParsedMainBudgetInput,
} from "./analysisTypes";

function isKnownAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function missingFactWarning(code: string, label: string): AnalysisWarning {
  return {
    code,
    message: `${label} 금액을 확인할 수 없습니다.`,
    severity: "error",
  };
}

export function analyzeMainBudget(input: ParsedMainBudgetInput): MainBudgetAnalysisResult {
  const warnings = [...input.warnings];
  const requiredRevenueFacts = [
    [input.totalRevenue, "TOTAL_REVENUE", "세입예산총액"],
    [input.purposeRevenue, "PURPOSE_REVENUE", "목적사업비전입금"],
    [input.beneficiaryRevenue, "BENEFICIARY_REVENUE", "수익자부담수입"],
  ] as const;

  for (const [amount, code, label] of requiredRevenueFacts) {
    if (!isKnownAmount(amount)) warnings.push(missingFactWarning(code, label));
  }

  const revenueBaseline = requiredRevenueFacts.every(([amount]) => isKnownAmount(amount))
    ? input.totalRevenue! - (input.purposeRevenue! + input.beneficiaryRevenue!)
    : null;

  const verificationAmounts = Object.entries(input.verificationRevenue);
  const missingVerificationFact = verificationAmounts.some(([, amount]) => !isKnownAmount(amount));
  if (missingVerificationFact) {
    warnings.push(missingFactWarning("VERIFICATION_REVENUE", "세입 검증 항목"));
  }
  const verificationRevenueTotal = missingVerificationFact
    ? null
    : verificationAmounts.reduce((total, [, amount]) => total + amount!, 0);

  const missingExpense = input.generalBusinessExpenses.some((expense) => !isKnownAmount(expense.amount));
  if (missingExpense) {
    warnings.push(missingFactWarning("GENERAL_BUSINESS_EXPENSE", "일반업무추진비"));
  }
  const generalBusinessExpenseTotal = missingExpense
    ? null
    : input.generalBusinessExpenses.reduce((total, expense) => total + expense.amount!, 0);

  const ratio = revenueBaseline === null || revenueBaseline === 0 || generalBusinessExpenseTotal === null
    ? null
    : generalBusinessExpenseTotal / revenueBaseline * 100;

  if (revenueBaseline === 0 && generalBusinessExpenseTotal !== null) {
    warnings.push({
      code: "ZERO_REVENUE_BASELINE",
      message: "세입 기준금액이 0이어서 비율을 계산할 수 없습니다.",
      severity: "warning",
    });
  }

  const comparison = revenueBaseline === null || verificationRevenueTotal === null
    ? { status: "needs-review" as const, revenueBaseline, verificationRevenueTotal, difference: null }
    : {
      status: revenueBaseline === verificationRevenueTotal ? "match" as const : "mismatch" as const,
      revenueBaseline,
      verificationRevenueTotal,
      difference: revenueBaseline - verificationRevenueTotal,
    };

  if (comparison.status === "mismatch") {
    warnings.push({
      code: "REVENUE_BASELINE_MISMATCH",
      message: "세입 기준금액과 세입 검증 항목 합계가 일치하지 않습니다.",
      severity: "warning",
    });
  }

  return {
    source: input.source,
    totalRevenue: input.totalRevenue,
    purposeRevenue: input.purposeRevenue,
    beneficiaryRevenue: input.beneficiaryRevenue,
    revenueBaseline,
    verificationRevenue: input.verificationRevenue,
    verificationRevenueTotal,
    generalBusinessExpenses: input.generalBusinessExpenses,
    generalBusinessExpenseTotal,
    ratio,
    comparison,
    warnings,
  };
}
