import { describe, expect, it } from "vitest";
import {
  DEFAULT_ACCOUNT_CATEGORIES,
  PREBUDGET_BUSINESS_OPTIONS,
  calculateRequestedAmount,
  convertWon,
  getAccountCategoryDescription,
  getDetailBusinesses,
  validatePrebudgetDraft,
} from "./prebudget";

describe("성립전예산 계산", () => {
  it("단가×수량×횟수를 계산한다", () => {
    expect(calculateRequestedAmount({ unitPrice: 30_000, quantity: 10, count: 1 })).toBe(300_000);
  });

  it.each([
    [800, 1_000],
    [1_000, 1_000],
    [1_001, 2_000],
  ])("산출금액 %d원을 천 원 단위로 올림한다", (rawAmount, expected) => {
    expect(calculateRequestedAmount({ unitPrice: rawAmount, quantity: 1, count: 1 })).toBe(expected);
  });

  it("직접 입력 금액도 천 원 단위로 올림한다", () => {
    expect(calculateRequestedAmount({ manualAmount: 286_500 })).toBe(287_000);
  });

  it("음수 금액은 유효성 검사에서 발견할 수 있도록 유지한다", () => {
    expect(calculateRequestedAmount({ manualAmount: -800 })).toBe(-800);
  });

  it("직접 입력 금액을 우선한다", () => {
    expect(calculateRequestedAmount({ unitPrice: 1, quantity: 1, count: 1, manualAmount: 450_000 })).toBe(450_000);
  });

  it("천원 단위 변환 잔액을 알려준다", () => {
    expect(convertWon(450_500, "floor")).toEqual({ displayed: 450, remainderWon: 500, rounding: "floor" });
  });

  it("필수정보와 음수 금액을 점검한다", () => {
    const issues = validatePrebudgetDraft({ title: "", fiscalYear: 2026, source: "교육청", department: "", requester: "", items: [{ manualAmount: -1 }] });
    expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["TITLE_REQUIRED", "DEPARTMENT_REQUIRED", "REQUESTER_REQUIRED", "NEGATIVE_AMOUNT"]));
  });

  it("21개 단위사업과 연결된 세부사업을 제공한다", () => {
    expect(PREBUDGET_BUSINESS_OPTIONS).toHaveLength(21);
    expect(getDetailBusinesses("교과 활동")).toEqual([
      "교과활동지원", "국어 교과활동", "사회 교과활동", "수학 교과활동",
      "과학 교과활동", "체육 교과활동", "예술 교과활동", "외국어 교과활동",
      "선택 교과활동", "특수교육 교과활동", "전문 교과활동", "유치원 교과활동",
      "부설기관 교과활동", "정보 교과활동",
    ]);
    expect(getDetailBusinesses("급식 관리")).toEqual(["학교급식운영"]);
    expect(getDetailBusinesses()).toEqual([]);
  });

  it.each([
    ["방과후 학교운영", "늘봄학교 운영"],
    ["방과후 학교운영", "돌봄교실운영"],
    ["교육여건 개선", "교육환경개선"],
    ["학생 복지", "학생 복지운영"],
  ])("%s에서 %s를 선택할 수 있다", (unit, detail) => {
    expect(getDetailBusinesses(unit)).toContain(detail);
  });

  it("원가통계비목 20개를 지정된 순서로 제공한다", () => {
    expect(DEFAULT_ACCOUNT_CATEGORIES.map(([name]) => name)).toEqual([
      "공무직인건비",
      "기간제교원인건비",
      "기간제근로자인건비",
      "기타수당",
      "일반수용비",
      "운영수당",
      "급식용식재료비",
      "우유급식비",
      "여비",
      "맞춤형복지비",
      "교직원복지비",
      "교육운영비",
      "학습준비물",
      "학생복지비",
      "기간제교원법정부담금",
      "기간제근로자법정부담금",
      "공무직법정부담금",
      "목적사업업무추진비",
      "비품구입비",
      "도서구입비",
    ]);
  });

  it("원가통계비목의 전체 설명을 조회하고 알 수 없는 비목은 빈 문자열을 반환한다", () => {
    expect(getAccountCategoryDescription("일반수용비")).toBe(
      "학교 운영에 소요되는 일반적인 경비(사무용품 구입비, 감사패·상패 등의 제작비, 인쇄비, 소모성 물품구입비, 비품 수선비, 각종 사용료(소프트웨어사용료 포함) 및 수수료, 시설물 소규모 수선비, 시설장비유지비, 청소용역비, 시설장비위탁 용역비, 임차료, 각종봉사료 등)",
    );
    expect(getAccountCategoryDescription("도서구입비")).toBe(
      "도서대장에 등재되는 도서구입비",
    );
    expect(getAccountCategoryDescription("없는 비목")).toBe("");
  });
});
