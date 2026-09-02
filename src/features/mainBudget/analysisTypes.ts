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
  amount: number | null;
  row?: BudgetLogicalRow;
};

export type AnalysisWarning = {
  code: string;
  message: string;
  severity: "warning" | "error";
  row?: BudgetLogicalRow;
};

export type RevenueVerification = Record<string, number | null>;

export type ParsedMainBudgetInput = {
  source: BudgetSource;
  totalRevenue: number | null;
  purposeRevenue: number | null;
  beneficiaryRevenue: number | null;
  verificationRevenue: RevenueVerification;
  generalBusinessExpenses: GeneralBusinessExpense[];
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
  totalRevenue: number | null;
  purposeRevenue: number | null;
  beneficiaryRevenue: number | null;
  revenueBaseline: number | null;
  verificationRevenue: RevenueVerification;
  verificationRevenueTotal: number | null;
  generalBusinessExpenses: GeneralBusinessExpense[];
  generalBusinessExpenseTotal: number | null;
  ratio: number | null;
  comparison: MainBudgetComparison;
  warnings: AnalysisWarning[];
};
