import { describe, expect, it } from "vitest";
import { getDetailBusinesses } from "../../../domain/prebudget";
import { PREBUDGET_EXAMPLES } from "./data";
import { validatePrebudgetExamples } from "./validateExamples";

const approvedMappings = {
  "purpose-basic-learning": ["교육격차해소", "기타 교육격차해소 지원", "단위학교 기초학력 책임지도"],
  "purpose-neulbom": ["방과후 학교운영", "늘봄학교운영", "(목)맞춤형교실 운영비"],
  "purpose-care": ["방과후 학교운영", "돌봄교실운영", "(목)오후돌봄교실 운영비"],
  "purpose-afterschool": ["방과후 학교운영", "늘봄학교운영", "(목)초등방과후교실사업 지원비"],
  "purpose-digital-ai": ["교과 활동", "교과활동지원", "디지털기반 학생 맞춤교육을 위한 연구학교운영"],
  "purpose-integrated-student": ["교육격차해소", "기타 교육격차해소 지원", "학생 맞춤통합지원"],
  "district-facility": ["교과 활동", "외국어 교과활동", "(보조)미래글로벌체험센터 초등 영어체험학습"],
  "district-curriculum": ["독서활동", "독서활동 운영", "(보조금)책향성독서교육"],
  "district-welfare": ["창의적 체험활동", "진로활동", "(보조금)진로교육 활성화사업 지원"],
  "beneficiary-yearbook": ["학생 복지", "학생 복지운영", "졸업앨범 제작"],
  "beneficiary-field-trip": ["창의적 체험활동", "현장체험학습 활동", "(수) 5학년 현장체험학습"],
  "beneficiary-afterschool": ["방과후 학교운영", "방과후 학교운영", "방과후학교 수강료"],
} as const;

describe("초보자용 성립전예산 예시", () => {
  it("승인된 6·3·3 구성의 예시 12종을 제공한다", () => {
    expect(PREBUDGET_EXAMPLES).toHaveLength(12);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "목적사업비")).toHaveLength(6);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "구청보조금")).toHaveLength(3);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "수익자부담금")).toHaveLength(3);
    expect(new Set(PREBUDGET_EXAMPLES.map((item) => item.id)).size).toBe(12);
  });

  it("필수값·금액계산·개인정보 검증을 모두 통과한다", () => {
    expect(validatePrebudgetExamples(PREBUDGET_EXAMPLES)).toEqual([]);
  });

  it("불필요한 기본정보를 예시에 저장하지 않는다", () => {
    for (const example of PREBUDGET_EXAMPLES) {
      expect(example).not.toHaveProperty("grantingAgency");
      expect(example).not.toHaveProperty("projectPeriod");
      expect(example).not.toHaveProperty("reason");
      expect(example).not.toHaveProperty("basis");
      expect(example.reviewRequiredFields).toEqual(["officialDocument"]);
    }
  });

  it("12개 예시에 승인된 단위·세부사업·세부항목을 지정한다", () => {
    for (const example of PREBUDGET_EXAMPLES) {
      const item = example.items[0];
      expect([item.unitBusiness, item.business, item.detail]).toEqual(
        approvedMappings[example.id as keyof typeof approvedMappings],
      );
    }
  });

  it("모든 예시의 단위사업과 세부사업이 유효한 연결 조합이다", () => {
    for (const example of PREBUDGET_EXAMPLES) {
      const item = example.items[0];
      expect(item.unitBusiness).toBeTruthy();
      expect(item.business).toBeTruthy();
      expect(item.detail).toBeTruthy();
      expect(getDetailBusinesses(item.unitBusiness)).toContain(item.business);
      if (!["purpose-neulbom", "purpose-care", "purpose-afterschool", "beneficiary-field-trip"].includes(example.id)) {
        expect(item.detail).not.toMatch(/^\((목|구청|수)\)/);
      }
    }
  });

  it("구청보조금과 수익자부담금 예시는 작성 전 준비사항을 표시하지 않는다", () => {
    const examplesWithoutPreparation = PREBUDGET_EXAMPLES.filter((example) =>
      example.fundingCategory === "구청보조금" || example.fundingCategory === "수익자부담금",
    );
    expect(examplesWithoutPreparation).toHaveLength(6);
    for (const example of examplesWithoutPreparation) {
      expect(example.prepareBeforeWriting).toEqual([]);
    }
  });

  it("모든 목적사업비 예시는 성립전예산 기안문 미리보기를 표시하지 않는다", () => {
    const purposeExamples = PREBUDGET_EXAMPLES.filter((example) => example.fundingCategory === "목적사업비");
    expect(purposeExamples).toHaveLength(6);
    for (const example of purposeExamples) expect(example.draftPreview).toBe("");
  });

  it("모든 목적사업비 예시는 동일한 5개 확인사항을 표시한다", () => {
    const expectedNotes = [
      "공문의 교부금액과 편성금액이 일치하는지",
      "공문에서 정한 예산 편성기준과 사용 목적에 맞는지",
      "원가통계비목이 적절하게 선택되었는지",
      "산출식의 단가 × 인원(수량) × 횟수 계산이 정확한지",
      "학교의 실제 사업계획과 산출내역이 일치하는지",
    ];
    const purposeExamples = PREBUDGET_EXAMPLES.filter((example) => example.fundingCategory === "목적사업비");
    for (const example of purposeExamples) expect(example.autoCheckNotes).toEqual(expectedNotes);
  });

  it("맞춤형 늘봄교실 예시에 4천970만7천원 편성항목을 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "purpose-neulbom");
    expect(example?.useWhen).toEqual([]);
    expect(example?.prepareBeforeWriting).toEqual([]);
    expect(example?.items).toEqual([
      expect.objectContaining({ business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "교육운영비", description: "(목)간식비", formulaText: "900,000원 × 4실", manualAmount: 3_600_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)강사비", formulaText: "28,800,000원", manualAmount: 28_800_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)업체위탁보전금", formulaText: "4,740원 × 1,976", manualAmount: 9_367_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)재료비", formulaText: "500,000원 × 1회", manualAmount: 500_000 }),
      expect.objectContaining({ category: "기간제근로자법정부담금", description: "(목)개인강사위탁학교부담보험금", formulaText: "120,000원 × 1회", manualAmount: 120_000 }),
      expect.objectContaining({ category: "목적사업업무추진비", description: "(목)업무추진비", formulaText: "40,000원 × 3명", manualAmount: 120_000 }),
      expect.objectContaining({ category: "일반수용비", description: "(목)귀가안전관리비", formulaText: "600,000원 × 12월", manualAmount: 7_200_000 }),
    ]);
    expect(example?.items.reduce((sum, item) => sum + (item.manualAmount ?? 0), 0)).toBe(49_707_000);
  });

  it("초등돌봄교실 예시에 3천230만원 편성항목을 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "purpose-care");
    expect(example?.useWhen).toEqual(["초등돌봄교실 사업의 재원이 교부된 경우"]);
    expect(example?.prepareBeforeWriting).toEqual([]);
    expect(example?.items).toEqual([
      expect.objectContaining({ business: "돌봄교실운영", detail: "(목)오후돌봄교실 운영비", category: "교육운영비", description: "(목)교재교구구입비", formulaText: "745,000원 × 10회", manualAmount: 7_450_000 }),
      expect.objectContaining({ detail: "(목)오후돌봄교실 운영비", category: "운영수당", description: "(목)돌봄프로그램비", formulaText: "2,500,000원", manualAmount: 2_500_000 }),
      expect.objectContaining({ detail: "(목)오후돌봄교실 운영비", category: "일반수용비", description: "(목)봉사활동비", formulaText: "3,475,000원 × 2회", manualAmount: 6_950_000 }),
      expect.objectContaining({ detail: "(목)오후돌봄교실 운영비", category: "일반수용비", description: "(목)소모품구입비", formulaText: "400,000원 × 4학급", manualAmount: 1_600_000 }),
      expect.objectContaining({ detail: "(목)아침돌봄운영비", category: "일반수용비", description: "(목)봉사활동비", formulaText: "5,000,000원", manualAmount: 5_000_000 }),
      expect.objectContaining({ detail: "(목)틈새돌봄운영비", category: "일반수용비", description: "(목)봉사활동비", formulaText: "30,000원 × 240일", manualAmount: 7_200_000 }),
      expect.objectContaining({ detail: "(목)틈새돌봄운영비", category: "일반수용비", description: "(목)틈새돌봄운영비", formulaText: "200,000원 × 4회", manualAmount: 800_000 }),
      expect.objectContaining({ detail: "(목)저녁돌봄운영비", category: "일반수용비", description: "(목)안전관리비", formulaText: "200,000원 × 4학급", manualAmount: 800_000 }),
    ]);
    expect(example?.items.reduce((sum, item) => sum + (item.manualAmount ?? 0), 0)).toBe(32_300_000);
  });

  it("방과후사업비 예시에 900만원 편성항목 10개를 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "purpose-afterschool");
    expect(example?.title).toBe("방과후사업비");
    expect(example?.useWhen).toEqual(["방과후사업비가 목적사업비로 교부된 경우"]);
    expect(example?.prepareBeforeWriting).toEqual([]);
    expect(example?.items).toEqual([
      expect.objectContaining({ business: "늘봄학교운영", detail: "(목)초등방과후교실사업 지원비", category: "교육운영비", description: "(목)공개수업및발표전시회운영비", formulaText: "1,000,000원 × 1회", manualAmount: 1_000_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)교구및재료비", formulaText: "200,000원 × 5회", manualAmount: 1_000_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)저소득층자녀 수강료지원", formulaText: "10,000원 × 1회", manualAmount: 10_000 }),
      expect.objectContaining({ category: "기간제근로자법정부담금", description: "(목)개인위탁강사보험료기관부담금지원", formulaText: "100,000원 × 1회", manualAmount: 100_000 }),
      expect.objectContaining({ category: "운영수당", description: "(목)방과후,돌봄운영컨설팅", formulaText: "40,000원 × 6회", manualAmount: 240_000 }),
      expect.objectContaining({ category: "운영수당", description: "(목)방학캠프강사비", formulaText: "30,000원 × 36회", manualAmount: 1_080_000 }),
      expect.objectContaining({ category: "운영수당", description: "(목)스포츠강사방과후강사비", formulaText: "80,000원 × 43회", manualAmount: 3_440_000 }),
      expect.objectContaining({ category: "운영수당", description: "(목)학교스포츠클럽운영", formulaText: "30,000원 × 40회", manualAmount: 1_200_000 }),
      expect.objectContaining({ category: "일반수용비", description: "(목)업체위탁평가위원회물품구입비", formulaText: "300,000원 × 1회", manualAmount: 300_000 }),
      expect.objectContaining({ category: "일반수용비", description: "(목)행정 보조인력 운영비", formulaText: "30,000원 × 21회", manualAmount: 630_000 }),
    ]);
    expect(example?.items.reduce((sum, item) => sum + (item.manualAmount ?? 0), 0)).toBe(9_000_000);
  });

  it("디지털·AI 교육 지원 예시에 3천만원 편성항목을 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "purpose-digital-ai");
    expect(example?.useWhen).toEqual(["디지털 AI 교육지원 예산이 교부된 경우"]);
    expect(example?.prepareBeforeWriting).toEqual([]);
    expect(example?.items).toEqual([
      expect.objectContaining({ unitBusiness: "교과 활동", business: "교과활동지원", detail: "디지털기반 학생 맞춤교육을 위한 연구학교운영", category: "일반수용비", description: "(목)교원학습공동체 운영비(교원연구회)", formulaText: "300,000원 × 10회", manualAmount: 3_000_000 }),
      expect.objectContaining({ category: "운영수당", description: "(목)교원연수비", formulaText: "520,000원 × 1회", manualAmount: 520_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)AI코스웨어 구독료 및 에듀테크 아이템 구입", formulaText: "2,480,000원 × 1회", manualAmount: 2_480_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)AI코스웨어 구독료 및 에듀테크 라이선스 구입", formulaText: "1,800,000원 × 10개월", manualAmount: 18_000_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(목)기기 부속품구입비", formulaText: "300,000원 × 10회", manualAmount: 3_000_000 }),
      expect.objectContaining({ category: "목적사업업무추진비", description: "(목)연구학교 운영 및 관련 학습공동체 협의회비", formulaText: "30,000원 × 50명 × 2회", manualAmount: 3_000_000 }),
    ]);
    expect(example?.items.reduce((sum, item) => sum + (item.manualAmount ?? 0), 0)).toBe(30_000_000);
    expect(JSON.stringify(example)).not.toContain("-2,480,000");
  });

  it("삭제 요청한 목적사업비 예시 4개를 제공하지 않는다", () => {
    expect(PREBUDGET_EXAMPLES.map(({ id }) => id)).not.toEqual(expect.arrayContaining([
      "purpose-welfare", "purpose-safety-staff", "purpose-reading-books", "purpose-career-experience",
    ]));
  });

  it("교육경비보조금 진로교육 활성화 예시에 2천만원 편성항목을 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "district-welfare");
    expect(example?.title).toBe("진로교육 활성화");
    expect(example?.items).toEqual([
      expect.objectContaining({ category: "교육운영비", description: "(보조)교재교구비 및 예비비", formulaText: "1,100,000원 × 1회", manualAmount: 1_100_000 }),
      expect.objectContaining({ category: "운영수당", description: "(보조)1,2학년 강사수당", formulaText: "35,000원 × 180회", manualAmount: 6_300_000 }),
      expect.objectContaining({ category: "운영수당", description: "(보조)3,4학년 강사수당", formulaText: "35,000원 × 180회", manualAmount: 6_300_000 }),
      expect.objectContaining({ category: "운영수당", description: "(보조)5,6학년 강사수당", formulaText: "35,000원 × 180회", manualAmount: 6_300_000 }),
    ]);
  });

  it("영어체험학습 예시에 미래글로벌체험센터 300만원 편성항목을 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "district-facility");
    expect(example?.title).toBe("영어체험학습");
    expect(example?.items).toEqual([
      expect.objectContaining({ category: "교육운영비", description: "(보조)미래글로벌체험센터 초등 영어체험학습 교통비", formulaText: "500,000원 × 4학급", manualAmount: 2_000_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(보조)미래글로벌체험센터 초등 영어체험학습 사스임자료", formulaText: "10,000원 × 100명", manualAmount: 1_000_000 }),
    ]);
    expect(JSON.stringify(example)).not.toContain("용답");
  });

  it("독서교육 및 교육과정 교구 구입 예시에 730만원 편성항목을 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "district-curriculum");
    expect(example?.title).toBe("독서교육 및 교육과정 교구 구입");
    expect(example?.items).toEqual([
      expect.objectContaining({ category: "교육운영비", description: "(보조)1~4학년 교육과정 교구구입", formulaText: "1,500,000원 × 4개 학년", manualAmount: 6_000_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(보조)5~6학년 교육과정 교구구입", formulaText: "500,000원 × 2개 학년", manualAmount: 1_000_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(보조)운정 북클럽 운영비", formulaText: "30,000원 × 10회", manualAmount: 300_000 }),
    ]);
  });

  it("졸업앨범비 예시는 기안문 미리보기를 표시하지 않는다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "beneficiary-yearbook");
    expect(example?.draftPreview).toBe("");
    expect(example?.autoCheckNotes).toEqual(["학생수 및 졸업앨범비 단가를 확인하세요."]);
  });

  it("방과후학교 수강료 예시에 레고교실 편성항목 3개를 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "beneficiary-afterschool");
    expect(example?.calculationUnit).toBe("명");
    expect(example?.items).toEqual([
      expect.objectContaining({ category: "운영수당", description: "레고교실 강사료", unitPrice: 30_000, quantity: 20, count: 1, manualAmount: 600_000 }),
      expect.objectContaining({ category: "일반수용비", description: "레고교실 수용비", unitPrice: 1_500, quantity: 20, count: 1, manualAmount: 30_000 }),
      expect.objectContaining({ category: "교육운영비", description: "레고교실 교재교구구입", unitPrice: 10_000, quantity: 20, count: 1, manualAmount: 200_000 }),
    ]);
    expect(example?.useWhen).toEqual(["방과후학교 운영 수강료 및 교재비 징수계획이 확정된 경우"]);
    expect(example?.draftPreview).toBe("");
    expect(example?.autoCheckNotes).toEqual([]);
  });

  it("현장체험학습비 예시에 5학년 교통비·식비·체험활동비를 제공한다", () => {
    const example = PREBUDGET_EXAMPLES.find(({ id }) => id === "beneficiary-field-trip");
    expect(example?.useWhen).toEqual(["현장학습비 징수계획이 확정된 경우"]);
    expect(example?.draftPreview).toBe("");
    expect(example?.autoCheckNotes).toEqual([]);
    expect(example?.calculationUnit).toBe("명");
    expect(example?.items).toEqual([
      expect.objectContaining({ category: "교육운영비", description: "(수) 교통비", formulaText: "32,900원 × 115명", manualAmount: 3_784_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(수) 점심식사비", formulaText: "9,500원 × 115명", manualAmount: 1_093_000 }),
      expect.objectContaining({ category: "교육운영비", description: "(수) 체험활동비", formulaText: "2,500원 × 115명 - 1,000원", manualAmount: 287_000 }),
    ]);
  });
});
