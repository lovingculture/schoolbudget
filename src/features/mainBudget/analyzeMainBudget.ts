import type { AnalysisWarning, BudgetLogicalRow, MainBudgetAnalysisResult, ParsedMainBudgetInput } from "./analysisTypes";

const verificationLabels = ["학교운영비전입금", "사용료", "수수료", "자산매각대", "지난년도수입", "이자수입", "기타행정활동수입", "순세계잉여금"];

function isKnownAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function missingFactWarning(code: string, label: string, row?: BudgetLogicalRow): AnalysisWarning {
  return { code, message: `${label} 금액을 확인할 수 없습니다.`, severity: "error", row };
}

export function analyzeMainBudget(input: ParsedMainBudgetInput): MainBudgetAnalysisResult {
  const warnings = [...input.warnings];

  const verificationFacts = verificationLabels.map((label) => input.verificationRevenue.facts.find((fact) => fact.label === label));
  const missingVerificationFact = !input.verificationRevenue.isComplete || verificationFacts.some((fact) => !fact || !isKnownAmount(fact.amount));
  if (missingVerificationFact) warnings.push(missingFactWarning("VERIFICATION_REVENUE", "세입 검증 항목"));
  const verificationRevenueTotal = missingVerificationFact ? null : verificationFacts.reduce((total, fact) => total + fact!.amount!, 0);
  const revenueBaseline = verificationRevenueTotal;

  const generalBusinessExpenses = input.generalBusinessExpenses.facts.filter((expense) => expense.costItem === "일반업무추진비");
  const missingExpense = !input.generalBusinessExpenses.isComplete || generalBusinessExpenses.some((expense) => !isKnownAmount(expense.amount));
  if (missingExpense) warnings.push(missingFactWarning("GENERAL_BUSINESS_EXPENSE", "일반업무추진비"));
  const generalBusinessExpenseTotal = missingExpense ? null : generalBusinessExpenses.reduce((total, expense) => total + expense.amount!, 0);

  const ratio = revenueBaseline === null || revenueBaseline === 0 || generalBusinessExpenseTotal === null
    ? null
    : generalBusinessExpenseTotal / revenueBaseline * 100;
  if (revenueBaseline === 0 && generalBusinessExpenseTotal !== null) {
    warnings.push({ code: "ZERO_REVENUE_BASELINE", message: "세입 기준금액이 0이어서 비율을 계산할 수 없습니다.", severity: "warning" });
  }

  return {
    source: input.source,
    identity: input.identity,
    revenueBaseline,
    verificationRevenue: input.verificationRevenue,
    verificationRevenueTotal,
    generalBusinessExpenses,
    generalBusinessExpenseFacts: input.generalBusinessExpenses,
    generalBusinessExpenseTotal,
    ratio,
    warnings,
  };
}
