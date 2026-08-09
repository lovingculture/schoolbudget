export type ReviewLevel = "error" | "warning" | "review";

export interface ReviewIssue {
  code: string;
  level: ReviewLevel;
  message: string;
  basis: string;
}

export interface MainBudgetExpenditureRow {
  id: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  department: string;
  business: string;
  detail: string;
  costCategory: string;
  description: string;
  expression: string;
  originalRequestedAmount?: number;
  requestedAmount?: number;
  manager: string;
  priorExpression: string;
  priorRequestedAmount?: number;
  originalVariance?: number;
  variance?: number;
  issues: ReviewIssue[];
}

export type ExpressionResult =
  | { ok: true; value: number }
  | { ok: false; reason: string };

export interface ParsedExpenditureFile {
  fileName: string;
  sheetName: string;
  rows: MainBudgetExpenditureRow[];
  originalTotal: number;
  warnings: string[];
}

export interface ExpenditureSummary {
  requestedTotal: number;
  priorTotal: number;
  variance: number;
  departmentCount: number;
  rowCount: number;
  unresolvedCount: number;
  errorCount: number;
  warningCount: number;
  reviewCount: number;
}
