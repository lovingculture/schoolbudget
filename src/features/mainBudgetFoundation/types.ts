export type FoundationSection = "revenue" | "expense";

export interface FoundationSourceLocation {
  line: number;
  raw: string;
}

export interface FoundationRevenueRow {
  chapter: string;
  division: string;
  section: string;
  item: string;
  costItem: string;
  currentAmount: number;
  priorAmount: number;
  changeAmount: number;
  calculationBasis: string;
  calculationAmount: number | null;
  source: FoundationSourceLocation;
}

export interface FoundationExpenseRow {
  policy: string;
  unit: string;
  business: string;
  detail: string;
  costItem: string;
  currentAmount: number;
  priorAmount: number;
  changeAmount: number;
  calculationBasis: string;
  calculationAmount: number | null;
  department: string;
  manager: string;
  source: FoundationSourceLocation;
}

export interface FoundationWarning {
  code: string;
  message: string;
  severity: "warning" | "error";
  line?: number;
}

export interface FoundationBudgetDocument {
  fileName: string;
  encoding: "utf-8" | "euc-kr";
  fiscalYear: number;
  budgetType: string;
  unit: "천원";
  revenueRows: FoundationRevenueRow[];
  expenseRows: FoundationExpenseRow[];
  sourceRevenueTotal: number;
  sourceExpenseTotal: number;
  warnings: FoundationWarning[];
}

export interface FoundationValidation {
  revenueDetailTotal: number;
  expenseDetailTotal: number;
  balanceDifference: number;
  canExport: boolean;
  warnings: FoundationWarning[];
}

export interface FoundationDraft {
  document: FoundationBudgetDocument;
  edits: Record<string, string | number>;
}
