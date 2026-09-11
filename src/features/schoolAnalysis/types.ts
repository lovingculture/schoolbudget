export type Won = number;

export interface SchoolManifestEntry {
  schoolName: string;
  schoolCode: string;
  fiscalYear: number;
  referenceMonth: string;
  file: string;
}

export interface SchoolPeriod {
  schoolCode: string;
  schoolName: string;
  fiscalYear: number;
  referenceMonth: string;
}

export interface LinkedSchoolProfile {
  schoolCode: string;
  schoolName: string;
  referenceYear: number;
  studentCount: number | null;
  siteAreaM2: number | null;
  buildingGrossAreaM2: number | null;
  sourceType: "open-api" | "official-download" | "official-web-page";
  sourceUrl: string;
  collectedAt: string;
  disclosureSchoolCode: string;
  linkageBasis: "same-year+unique-code-suffix+exact-name";
  rawSiteAreaM2?: number | null;
  siteShared?: string | null;
  siteAreaNote?: string;
  buildingAreaNote?: string;
}

export interface BudgetSummary extends SchoolPeriod {
  budgetAmount: Won | null;
  currentBudget: Won | null;
  incomeSettlement: Won | null;
  expenseSettlement: Won | null;
  surplus: Won | null;
  note: string;
  collectionStatus: string;
  sourceUrl: string;
}

export const INCOME_LEVELS = ["장소계", "관소계", "항소계", "목상세"] as const;
export const EXPENSE_LEVELS = [
  "정책사업소계",
  "단위사업소계",
  "세부사업소계",
  "세부항목상세",
] as const;

export type IncomeRowType = (typeof INCOME_LEVELS)[number] | "합계";
export type ExpenseRowType = (typeof EXPENSE_LEVELS)[number] | "합계";

export interface SourceAmounts extends SchoolPeriod {
  sourceBundleNumber: number;
  duplicateBundleCount: number;
  sourceRowNumber: number;
  budgetAmount: Won;
  currentBudget: Won;
  settlementAmount: Won;
  difference: Won;
  sourceUrl: string;
}

export interface IncomeRow extends SourceAmounts {
  rowType: IncomeRowType;
  chapter: string;
  section: string;
  subsection: string;
  item: string;
}

export interface ExpenseRow extends SourceAmounts {
  rowType: ExpenseRowType;
  policyProgram: string;
  unitProgram: string;
  detailProgram: string;
  lineItem: string;
}

export interface BudgetDataset {
  schoolProfile?: LinkedSchoolProfile | null;
  summary: BudgetSummary;
  incomeRows: IncomeRow[];
  expenseRows: ExpenseRow[];
  findings: string[];
  collectedAt: string;
}

export interface BudgetNode {
  id: string;
  name: string;
  path: string[];
  hasChildren: boolean;
  currentBudget: Won;
  settlementAmount: Won;
  difference: Won;
  sourceDifference: Won;
  settlementRate: number | null;
  share: number | null;
  sourceUrl: string;
  sourceRowNumber: number;
}

export type IncomeStructureMetricId =
  | "educationOfficeDependencyRate"
  | "ownRevenueRate"
  | "parentBurdenRate"
  | "localGovernmentTransferRate"
  | "carryoverRate"
  | "incomeSettlementRate";

export interface IncomeStructureMetric {
  id: IncomeStructureMetricId;
  label: string;
  numeratorLabel: string;
  numerator: Won;
  denominatorLabel: string;
  denominator: Won;
  rate: number | null;
  formula: string;
  description: string;
}

export type ExpenseAnalysisMetricId =
  | "educationActivity"
  | "meal"
  | "facilityMaintenance"
  | "publicUtility";

export interface ExpenseAnalysisMetric {
  id: ExpenseAnalysisMetricId;
  label: string;
  settlementAmount: Won;
  totalSettlementAmount: Won;
  rate: number | null;
  description: string;
}

export type PublicUtilityCategory = "electricity" | "water" | "fuel" | "other";

export interface PublicUtilityMetric {
  id: PublicUtilityCategory;
  label: string;
  settlementAmount: Won;
}

export type RigidExpenseCategory =
  | PublicUtilityCategory
  | "facilityService"
  | "cleaningService"
  | "securityService"
  | "otherService"
  | "regularMaintenance"
  | "rental"
  | "essentialOperation";

export interface RigidExpenseMetric {
  id: RigidExpenseCategory;
  group: "공공요금" | "용역비" | "기타 고정성 운영비";
  label: string;
  settlementAmount: Won;
  source: "analysisCategory";
}

export interface RigidExpenseGroupMetric {
  group: RigidExpenseMetric["group"];
  label: string;
  settlementAmount: Won;
}

export interface RigidExpenseSummary {
  totalSettlementAmount: Won;
  totalExpenseSettlementAmount: Won;
  rate: number | null;
  groups: RigidExpenseGroupMetric[];
}

export type MoneyUnit = "원" | "만원" | "억원";
export type SortKey = "currentBudget" | "settlementAmount" | "difference";
