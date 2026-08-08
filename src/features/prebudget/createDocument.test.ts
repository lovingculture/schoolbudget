import { describe, expect, it } from "vitest";
import { createPrebudgetDraft } from "./draft";
import { createPrebudgetDocument } from "./createDocument";

const activeDraft = () => {
  const draft = createPrebudgetDraft("학교");
  Object.assign(draft, {
    title: "학생안전 인력 운영 성립전예산 편성",
    requester: "김담당",
    approvalGranter: "이담당",
    officialDocument: "교육지원과-1111(2022. 1. 1.)",
  });
  draft.items[0] = {
    ...draft.items[0],
    unitBusiness: "생활지도 운영",
    business: "학생안전교육",
    detail: "학교안전인력 운영",
    category: "교육운영비",
    description: "학생안전 인력 운영 물품 및 프로그램비",
    manualAmount: 800_000,
  };
  return draft;
};

describe("성립전예산 기안문", () => {
  it("사업담당자와 품의권한 부여자를 승인된 순서로 생성한다", () => {
    const document = createPrebudgetDocument(activeDraft());
    expect(document.bodyLines).toEqual(expect.arrayContaining([
      "가. 재원구분: 목적사업비(교육청)",
      "나. 요구부서: 체육안전교육부",
      "다. 사업담당자: 김담당",
      "라. 품의권한 부여자: 이담당",
      "마. 예산요구 총액: 800,000원",
      "바. 성립전예산 요구내역",
    ]));
    expect(document.copyText).toContain("관련: 교육지원과-1111(2022. 1. 1.)");
    expect(document.copyText).toContain("가. 재원구분: 목적사업비(교육청)");
    expect(document.copyText).toContain("나. 요구부서: 체육안전교육부");
    expect(document.copyText).toContain("다. 사업담당자: 김담당");
    expect(document.copyText).toContain("라. 품의권한 부여자: 이담당");
    expect(document.copyText).toContain("마. 예산요구 총액: 800,000원");
    expect(document.copyText).toContain("바. 성립전예산 요구내역");
    expect(document.copyText).toContain("단위사업) 생활지도 운영 / 세부사업) 학생안전교육 / 세부항목) 학교안전인력 운영 / 원가통계비목) 교육운영비 / 산출기초) 학생안전 인력 운영 물품 및 프로그램비 / 800,000원");
    expect(document.copyText).not.toContain("1. 관련");
    expect(document.copyText).not.toContain("요구자:");
    expect(document.copyText).not.toContain("붙임");
  });

  it("품의권한 부여자가 공란이면 번호를 건너뛰지 않고 기안문을 생성한다", () => {
    const draft = activeDraft();
    draft.approvalGranter = "";
    const document = createPrebudgetDocument(draft);
    expect(document.copyText).not.toContain("품의권한 부여자");
    expect(document.copyText).toContain("라. 예산요구 총액: 800,000원\n마. 성립전예산 요구내역");
  });
});
