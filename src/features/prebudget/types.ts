import type { DraftItem } from "../../domain/prebudget";

export type PrebudgetSource = "보조금(구청)" | "목적사업비(교육청)" | "수익자부담경비(학부모)";
export type PrebudgetSchoolLevel = "초등학교" | "중학교" | "고등학교" | "공통";

export interface PrebudgetFormDraft {
  schoolName: string;
  fiscalYear: number;
  source: PrebudgetSource;
  title: string;
  department: string;
  requester: string;
  officialDocument: string;
  items: DraftItem[];
  savedAt?: string;
  schoolLevel: PrebudgetSchoolLevel;
  grantingAgency: string;
  projectPeriod: string;
  reason: string;
  basis: string;
  exampleSourceId?: string;
  reviewRequiredFields: string[];
}

export interface PrebudgetValidationIssue { field: string; itemIndex?: number; message: string; }
