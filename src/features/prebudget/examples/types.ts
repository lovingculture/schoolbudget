import type { DraftItem } from "../../../domain/prebudget";

export type ExampleFundingCategory = "목적사업비" | "구청보조금" | "수익자부담금";
export interface PrebudgetExampleItem extends Omit<DraftItem, "id"> {}
export interface PrebudgetExample {
  id: string; fundingCategory: ExampleFundingCategory; title: string; searchAliases: string[]; summary: string;
  useWhen: string[]; prepareBeforeWriting: string[]; documentTitle: string;
  officialDocument: string; items: PrebudgetExampleItem[];
  draftPreview: string; autoCheckNotes: string[]; reviewRequiredFields: string[];
  sourceCategory: "사용자 제공 익명화 표본" | "서울교육재정 공개예산 분석" | "복합 분석"; sourceReviewedAt: "2026-08-08";
}
export interface ExampleValidationIssue { exampleId: string; field: string; message: string; }
