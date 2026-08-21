import { describe, expect, it } from "vitest";
import { getDetailBusinesses } from "../../../domain/prebudget";
import { PREBUDGET_EXAMPLES } from "./data";
import { validatePrebudgetExamples } from "./validateExamples";

const approvedMappings = {
  "purpose-basic-learning": ["교육격차해소", "기타 교육격차해소 지원", "단위학교 기초학력 책임지도"],
  "purpose-neulbom": ["방과후 학교운영", "늘봄학교 운영", "맞춤형 늘봄교실 운영"],
  "purpose-care": ["방과후 학교운영", "돌봄교실운영", "오후돌봄교실 운영"],
  "purpose-afterschool": ["방과후 학교운영", "방과후 학교운영", "방과후학교 운영 지원"],
  "purpose-digital-ai": ["학습지원실 운영", "정보화실 운영", "AI 디지털교육 지원"],
  "purpose-integrated-student": ["교육격차해소", "기타 교육격차해소 지원", "학생 맞춤통합지원"],
  "purpose-welfare": ["학생 복지", "교육복지우선", "교육복지 지원사업"],
  "purpose-safety-staff": ["생활지도 운영", "학생안전교육", "학교안전인력 운영"],
  "purpose-reading-books": ["독서활동", "독서활동 운영", "독서교육 및 도서구입"],
  "purpose-career-experience": ["창의적 체험활동", "진로활동", "진로교육·체험활동"],
  "district-facility": ["교육여건 개선", "교육환경개선", "시설·환경개선"],
  "district-curriculum": ["교과 활동", "교과활동지원", "교육과정 운영 지원"],
  "district-welfare": ["창의적 체험활동", "진로활동", "(보조금)진로교육 활성화사업 지원"],
  "beneficiary-yearbook": ["학생 복지", "학생 복지운영", "졸업앨범 제작"],
  "beneficiary-field-trip": ["창의적 체험활동", "현장체험학습 활동", "(수) 5학년 현장체험학습"],
  "beneficiary-afterschool": ["방과후 학교운영", "방과후 학교운영", "방과후학교 수강료"],
} as const;

describe("초보자용 성립전예산 예시", () => {
  it("승인된 10·3·3 구성의 예시 16종을 제공한다", () => {
    expect(PREBUDGET_EXAMPLES).toHaveLength(16);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "목적사업비")).toHaveLength(10);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "구청보조금")).toHaveLength(3);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "수익자부담금")).toHaveLength(3);
    expect(new Set(PREBUDGET_EXAMPLES.map((item) => item.id)).size).toBe(16);
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

  it("16개 예시에 승인된 단위·세부사업·세부항목을 지정한다", () => {
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
      if (example.id !== "beneficiary-field-trip") expect(item.detail).not.toMatch(/^\((목|구청|수)\)/);
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
