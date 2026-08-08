import type { PrebudgetFormDraft, PrebudgetSource } from "../types";
import type { ExampleFundingCategory, PrebudgetExample } from "./types";

const SOURCE_MAP: Record<ExampleFundingCategory, PrebudgetSource> = {
  목적사업비: "목적사업비(교육청)",
  구청보조금: "보조금(구청)",
  수익자부담금: "수익자부담경비(학부모)",
};

export function applyPrebudgetExample(current: PrebudgetFormDraft, example: PrebudgetExample): PrebudgetFormDraft {
  const { savedAt: _savedAt, ...withoutSavedAt } = current;
  return {
    ...withoutSavedAt,
    schoolName: current.schoolName,
    fiscalYear: current.fiscalYear,
    source: SOURCE_MAP[example.fundingCategory],
    title: example.documentTitle,
    grantingAgency: example.grantingAgency,
    officialDocument: example.officialDocument,
    projectPeriod: example.projectPeriod,
    reason: example.reason,
    basis: example.basis,
    exampleSourceId: example.id,
    reviewRequiredFields: [...example.reviewRequiredFields],
    items: example.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
  };
}
