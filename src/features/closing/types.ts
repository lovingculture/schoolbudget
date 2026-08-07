export type IncomeRow = {
  id: string;
  chapter: string;
  section: string;
  amount: number;
  ratio: number;
};

export type ExpenseRow = {
  id: string;
  policy: string;
  amount: number;
  ratio: number;
};

export type ClosingSource = {
  fiscalYear: number;
  schoolName: string;
  budget: number;
  currentBudget: number;
  incomeTotal: number;
  expenseTotal: number;
  surplus: number;
  carryovers: {
    specified: number;
    accident: number;
    continuing: number;
  };
  subsidyReturn: number;
  priorTransfer: number;
  afterTransfer: number;
  netSurplus: number;
  incomeRows: IncomeRow[];
  expenseRows: ExpenseRow[];
};

export type ValidationResult = {
  id: string;
  label: string;
  expected: number;
  actual: number;
  ok: boolean;
};

export type ClosingAgendaDraft = ClosingSource & {
  title: string;
  agendaNumber: string;
  proposalDate: string;
  proposer: string;
  presenter: string;
  basis: string;
  reason: string;
  attachment: string;
};
