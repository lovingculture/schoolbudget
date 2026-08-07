export type BudgetIncomeRow = {
  id: string;
  chapter: string;
  section: string;
  current: number;
  cumulative: number;
  ratio: number;
  note: string;
};

export type BudgetExpenseRow = {
  id: string;
  policy: string;
  current: number;
  cumulative: number;
  ratio: number;
  note: string;
};

export type BudgetAgendaSource = {
  fiscalYear: number;
  schoolName: string;
  budgetType: string;
  revisedBudget: number;
  previousBudget: number;
  changeAmount: number;
  changeRate: number;
  incomeRows: BudgetIncomeRow[];
  expenseRows: BudgetExpenseRow[];
};

export type BudgetAgendaDraft = BudgetAgendaSource & {
  title: string;
  agendaNumber: string;
  proposalDate: string;
  proposer: string;
  presenter: string;
  revisedBudgetLabel: string;
  previousBudgetLabel: string;
  reason: string;
  basis: string;
  contentTitle: string;
  majorContents: string[];
};

export type BudgetAgendaValidation = {
  id: string;
  label: string;
  expected: number;
  actual: number;
  ok: boolean;
};
