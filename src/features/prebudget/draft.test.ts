import { describe, expect, it } from "vitest";
import { activePrebudgetItems, createPrebudgetDraft, normalizePrebudgetDraft } from "./draft";

describe("성립전예산 초안", () => {
  it("기본 초안에 학교명과 빈 예산항목 5개를 만들고 빈 항목을 출력에서 제외한다", () => {
    const draft = createPrebudgetDraft("서울한빛초등학교");
    expect(draft.schoolName).toBe("서울한빛초등학교");
    expect(draft.source).toBe("목적사업비(교육청)");
    expect(draft.items).toHaveLength(5);
    expect(activePrebudgetItems(draft.items)).toEqual([]);
  });
});

describe("legacy draft normalization", () => {
  it("fills new fields when loading a legacy draft", () => {
    const legacy = {
      schoolName: "기존학교",
      fiscalYear: "2026",
      source: "목적사업비",
      title: "기존",
      department: "",
      requester: "",
      officialDocument: "",
      items: [],
      savedAt: 1,
    };

    expect(normalizePrebudgetDraft(legacy)).toMatchObject({
      schoolName: "기존학교",
      fiscalYear: 2026,
      schoolLevel: "공통",
      grantingAgency: "",
      projectPeriod: "",
      reason: "",
      basis: "",
      reviewRequiredFields: [],
    });
  });

  it("converts a legacy numeric-string year to a number", () => {
    const result = normalizePrebudgetDraft({ fiscalYear: "2026" });
    expect(result.fiscalYear).toBe(2026);
    expect(typeof result.fiscalYear).toBe("number");
  });

  it("uses the blank-draft year for an invalid legacy year", () => {
    const fallback = createPrebudgetDraft("학교").fiscalYear;
    expect(normalizePrebudgetDraft({ fiscalYear: "20XX" }, "학교").fiscalYear).toBe(fallback);
  });

  it("rejects an unknown legacy funding source", () => {
    expect(normalizePrebudgetDraft({ source: "임의재원" }).source).toBe(createPrebudgetDraft("").source);
  });

  it("does not share mutable review fields between blank drafts", () => {
    const first = createPrebudgetDraft("A");
    const second = createPrebudgetDraft("B");

    first.reviewRequiredFields.push("grantingAgency");

    expect(second.reviewRequiredFields).toEqual([]);
  });
});
