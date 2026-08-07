export type ExecutionRow = {
  id: string;
  policy: string;
  unitBusiness: string;
  detailBusiness: string;
  detailItem: string;
  account: string;
  subAccount: string;
  costCategory: string;
  description: string;
  budgetAmount: number;
  committedAmount: number;
  paidAmount: number;
  original: Record<string, unknown>;
};

export type ExecutionWorkbook = {
  fiscalYear: number;
  executionDate: string;
  schoolName: string;
  sourceSheetName: string;
  headers: string[];
  originalRows: unknown[][];
  rows: ExecutionRow[];
};

export type CalculatedExecutionRow = ExecutionRow & {
  balance: number;
  discrepancy: number;
  executionRate: number;
  plannedAmount: number;
  availableSupplement: number;
  supplementProposal: number;
};

export type UnitBusinessSummary = {
  policy: string;
  unitBusiness: string;
  budgetAmount: number;
  committedAmount: number;
  paidAmount: number;
  balance: number;
  executionRate: number;
};
