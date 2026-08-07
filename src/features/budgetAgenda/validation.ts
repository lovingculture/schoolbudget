import type { BudgetAgendaDraft, BudgetAgendaValidation } from "./types";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const item = (id: string, label: string, expected: number, actual: number, tolerance = 0): BudgetAgendaValidation => ({
  id,
  label,
  expected,
  actual,
  ok: Math.abs(expected - actual) <= tolerance,
});

export function validateBudgetAgenda(draft: BudgetAgendaDraft): BudgetAgendaValidation[] {
  return [
    item("change", "경정예산액 - 기정예산액", draft.changeAmount, draft.revisedBudget - draft.previousBudget),
    item("income-current", "세입 금회 합계", draft.changeAmount, sum(draft.incomeRows.map(row => row.current))),
    item("expense-current", "세출 금회 합계", draft.changeAmount, sum(draft.expenseRows.map(row => row.current))),
    item("income-cumulative", "세입 누계 합계", draft.revisedBudget, sum(draft.incomeRows.map(row => row.cumulative))),
    item("expense-cumulative", "세출 누계 합계", draft.revisedBudget, sum(draft.expenseRows.map(row => row.cumulative))),
    item("income-ratio", "세입 구성비 합계", 100, sum(draft.incomeRows.map(row => row.ratio)), 0.2),
    item("expense-ratio", "세출 구성비 합계", 100, sum(draft.expenseRows.map(row => row.ratio)), 0.2),
  ];
}
