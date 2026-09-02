export type BudgetFileFormat = "pdf" | "xls" | "xlsx";

export type BudgetCellCoordinate = {
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type BudgetLogicalRow = {
  cells: unknown[];
  sourcePage?: number;
  sourceSheet?: string;
  sourceRow?: number;
  coordinates?: BudgetCellCoordinate[];
  confidence?: number;
};

export type BudgetSource = {
  fileName: string;
  format: BudgetFileFormat;
  pageCount?: number;
  sheetCount?: number;
};

export type RevenueFact = {
  label: string;
  amount: number | null;
  row?: BudgetLogicalRow;
};

export type GeneralBusinessExpense = {
  id: string;
  policy: string;
  unit: string;
  business: string;
  detail: string;
  costItem: string;
  amount: number | null;
  row?: BudgetLogicalRow;
};

export type AnalysisWarning = {
  code: string;
  message: string;
  severity: "warning" | "error";
  row?: BudgetLogicalRow;
};

export type RevenueFactCollection = {
  facts: RevenueFact[];
  isComplete: boolean;
};

export type GeneralBusinessExpenseCollection = {
  facts: GeneralBusinessExpense[];
  isComplete: boolean;
};

export type ParsedMainBudgetInput = {
  source: BudgetSource;
  totalRevenue: RevenueFact;
  purposeRevenue: RevenueFact;
  beneficiaryRevenue: RevenueFact;
  verificationRevenue: RevenueFactCollection;
  generalBusinessExpenses: GeneralBusinessExpenseCollection;
  warnings: AnalysisWarning[];
};

export type MainBudgetComparison = {
  status: "match" | "mismatch" | "needs-review";
  revenueBaseline: number | null;
  verificationRevenueTotal: number | null;
  difference: number | null;
};

export type MainBudgetAnalysisResult = {
  source: BudgetSource;
  totalRevenue: RevenueFact;
  purposeRevenue: RevenueFact;
  beneficiaryRevenue: RevenueFact;
  revenueBaseline: number | null;
  verificationRevenue: RevenueFactCollection;
  verificationRevenueTotal: number | null;
  generalBusinessExpenses: GeneralBusinessExpense[];
  generalBusinessExpenseFacts: GeneralBusinessExpenseCollection;
  generalBusinessExpenseTotal: number | null;
  ratio: number | null;
  comparison: MainBudgetComparison;
  warnings: AnalysisWarning[];
};
