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
  "district-welfare": ["학생 복지", "교육복지우선", "학생복지 지원"],
  "beneficiary-yearbook": ["학생 복지", "학생 복지운영", "졸업앨범 제작"],
  "beneficiary-field-trip": ["창의적 체험활동", "현장체험학습 활동", "현장체험학습"],
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
      expect(item.detail).not.toMatch(/^\((목|구청|수)\)/);
    }
  });
});
