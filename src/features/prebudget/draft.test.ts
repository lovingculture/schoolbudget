import { describe, expect, it } from "vitest";
import { activePrebudgetItems, createPrebudgetDraft, normalizePrebudgetDraft } from "./draft";

describe("성립전예산 초안", () => {
  it("기본 초안에 학교명과 빈 예산항목 1개를 만들고 빈 항목을 출력에서 제외한다", () => {
    const draft = createPrebudgetDraft("서울한빛초등학교");
    expect(draft.schoolName).toBe("서울한빛초등학교");
    expect(draft.title).toBe("");
    expect(draft.source).toBe("목적사업비(교육청)");
    expect(draft.department).toBe("");
    expect(draft.requester).toBe("");
    expect(draft.approvalGranter).toBe("");
    expect(draft).not.toHaveProperty("grantingAgency");
    expect(draft).not.toHaveProperty("projectPeriod");
    expect(draft).not.toHaveProperty("reason");
    expect(draft).not.toHaveProperty("basis");
    expect(draft.items).toHaveLength(1);
    expect(activePrebudgetItems(draft.items)).toEqual([]);
  });
});

describe("legacy draft normalization", () => {
  it("기존 저장 자료에 수량 단위가 없으면 명을 기본값으로 적용한다", () => {
    const result = normalizePrebudgetDraft({ items: [{ description: "운영비", quantity: 2 }] });
    expect(result.items[0].quantityUnit).toBe("명");
  });

  it("저장된 수량 단위를 유지한다", () => {
    const result = normalizePrebudgetDraft({ items: [{ description: "물품", quantity: 3, quantityUnit: "개" }] });
    expect(result.items[0].quantityUnit).toBe("개");
  });

  it("collapses legacy blank starter rows to one item", () => {
    const blank = { unitBusiness: "", business: "", detail: "", category: "일반수용비", description: "", unitPrice: 0, quantity: 0, count: 0, note: "" };
    expect(normalizePrebudgetDraft({ items: Array.from({ length: 5 }, () => ({ ...blank })) }).items).toHaveLength(1);
  });

  it("preserves entered rows while removing unused legacy starter rows", () => {
    const blank = { unitBusiness: "", business: "", detail: "", category: "일반수용비", description: "", unitPrice: 0, quantity: 0, count: 0, note: "" };
    const entered = { ...blank, business: "돌봄교실운영", description: "운영비", unitPrice: 10000, quantity: 2, count: 1 };
    const result = normalizePrebudgetDraft({ items: [blank, entered, blank] });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ business: "돌봄교실운영", description: "운영비" });
  });

  it("ignores removed legacy fields and supplies an empty approval granter", () => {
    const result = normalizePrebudgetDraft({
      requester: "김담당",
      grantingAgency: "기존 교육지원청",
      projectPeriod: "2026. 1. 1. ~ 2026. 12. 31.",
      reason: "기존 사유",
      basis: "기존 근거",
    });

    expect(result.requester).toBe("");
    expect(result.approvalGranter).toBe("");
    expect(result).not.toHaveProperty("grantingAgency");
    expect(result).not.toHaveProperty("projectPeriod");
    expect(result).not.toHaveProperty("reason");
    expect(result).not.toHaveProperty("basis");
  });

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
      approvalGranter: "",
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

  it("drops removed review fields from legacy saved examples", () => {
    const result = normalizePrebudgetDraft({
      reviewRequiredFields: ["grantingAgency", "officialDocument", "projectPeriod"],
    });
    expect(result.reviewRequiredFields).toEqual(["officialDocument"]);
  });

  it("기존 기본 예시값은 실제 입력값이 아닌 빈칸으로 복원한다", () => {
    expect(normalizePrebudgetDraft({ schoolName: "학교예산 업무공간", title: "안전인력 봉사비 성립전예산" })).toMatchObject({ schoolName: "", title: "" });
  });
});
