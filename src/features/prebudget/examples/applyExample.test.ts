import { describe, expect, it } from "vitest";
import { createPrebudgetDraft } from "../draft";
import { applyPrebudgetExample } from "./applyExample";
import { PREBUDGET_EXAMPLES } from "./data";

describe("성립전예산 예시 불러오기", () => {
  it("현재 학교명과 회계연도를 유지한다", () => {
    const current = { ...createPrebudgetDraft("서울우리학교"), fiscalYear: 2026 };
    const result = applyPrebudgetExample(current, PREBUDGET_EXAMPLES[0]);
    expect(result.schoolName).toBe("서울우리학교");
    expect(result.fiscalYear).toBe(2026);
    expect(result.exampleSourceId).toBe(PREBUDGET_EXAMPLES[0].id);
  });

  it("재원 분류를 기존 입력값에 맞게 변환한다", () => {
    expect(applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES.find((item) => item.fundingCategory === "목적사업비")!).source).toBe("목적사업비(교육청)");
    expect(applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES.find((item) => item.fundingCategory === "구청보조금")!).source).toBe("보조금(구청)");
    expect(applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES.find((item) => item.fundingCategory === "수익자부담금")!).source).toBe("수익자부담경비(학부모)");
  });

  it("예산항목을 고유 ID로 깊은 복사하고 원본을 바꾸지 않는다", () => {
    const example = PREBUDGET_EXAMPLES[0];
    const result = applyPrebudgetExample(createPrebudgetDraft("학교"), example);
    result.items[0].description = "사용자 수정";
    expect(example.items[0].description).not.toBe("사용자 수정");
    expect(new Set(result.items.map((item) => item.id)).size).toBe(result.items.length);
  });

  it("예시 적용 시 사업담당자와 예산(품의) 권한 부여 대상을 유지한다", () => {
    const current = { ...createPrebudgetDraft("학교"), requester: "박담당", approvalGranter: "이담당" };
    const result = applyPrebudgetExample(current, PREBUDGET_EXAMPLES[0]);
    expect(result.requester).toBe("박담당");
    expect(result.approvalGranter).toBe("이담당");
    expect(result.reviewRequiredFields).toEqual(["officialDocument"]);
  });

  it.each([
    ["purpose-neulbom", "방과후 학교운영", "늘봄학교 운영", "맞춤형 늘봄교실 운영"],
    ["purpose-care", "방과후 학교운영", "돌봄교실운영", "오후돌봄교실 운영"],
    ["district-facility", "교육여건 개선", "교육환경개선", "시설·환경개선"],
    ["beneficiary-yearbook", "학생 복지", "학생 복지운영", "졸업앨범 제작"],
    ["beneficiary-field-trip", "창의적 체험활동", "현장체험학습 활동", "(수) 5학년 현장체험학습"],
  ])("%s 예시의 3단계 사업분류를 작성 화면에 복사한다", (id, unit, business, detail) => {
    const example = PREBUDGET_EXAMPLES.find((candidate) => candidate.id === id)!;
    const result = applyPrebudgetExample(createPrebudgetDraft("학교"), example);
    expect(result.items[0]).toMatchObject({ unitBusiness: unit, business, detail });

    result.items[0].detail = "사용자 수정 세부항목";
    expect(example.items[0].detail).toBe(detail);
  });
});
