import type { ExampleFundingCategory, PrebudgetExample } from "./types";

type Seed = [string, ExampleFundingCategory, string, string[]];
const seeds: Seed[] = [
  ["purpose-basic-learning", "목적사업비", "기초학력 지원", ["학습지원", "기초학력", "보충지도"]],
  ["purpose-neulbom", "목적사업비", "맞춤형 늘봄교실", ["늘봄", "맞춤형", "교실"]],
  ["purpose-care", "목적사업비", "초등돌봄교실", ["돌봄", "초등돌봄", "간식"]],
  ["purpose-afterschool", "목적사업비", "방과후학교 운영 지원", ["방과후", "강좌", "수강"]],
  ["purpose-digital-ai", "목적사업비", "디지털·AI 교육 지원", ["디지털", "AI", "인공지능"]],
  ["purpose-integrated-student", "목적사업비", "학생 맞춤통합지원", ["맞춤통합", "학생지원", "통합지원"]],
  ["purpose-welfare", "목적사업비", "교육복지 지원", ["교육복지", "복지", "취약학생"]],
  ["purpose-safety-staff", "목적사업비", "학생안전 인력 운영", ["안전", "안전인력", "봉사자"]],
  ["purpose-reading-books", "목적사업비", "독서교육·도서구입", ["독서", "도서", "책"]],
  ["purpose-career-experience", "목적사업비", "진로·체험활동 지원", ["진로", "체험", "현장체험"]],
  ["district-facility", "구청보조금", "시설·환경개선 지원", ["구청 지원", "시설", "환경개선"]],
  ["district-curriculum", "구청보조금", "교육과정·체험활동 지원", ["구청 지원", "교육과정", "체험"]],
  ["district-welfare", "구청보조금", "학생복지 지원", ["구청 지원", "학생복지", "복지"]],
  ["beneficiary-yearbook", "수익자부담금", "졸업앨범비", ["학부모 부담", "졸업", "앨범"]],
  ["beneficiary-field-trip", "수익자부담금", "현장체험학습비", ["학부모 부담", "현장체험", "여행"]],
  ["beneficiary-afterschool", "수익자부담금", "방과후학교 수강료", ["학부모 부담", "방과후", "수강료"]],
];

const agency = (category: ExampleFundingCategory) => category === "목적사업비" ? "○○교육지원청" : category === "구청보조금" ? "○○구청" : "서울○○학교";
const makeExample = ([id, fundingCategory, title, searchAliases]: Seed, index: number): PrebudgetExample => {
  const unitPrice = (index + 1) * 10_000;
  return {
    id, fundingCategory, title, searchAliases, summary: `${title} 성립전예산을 처음 작성할 때 참고하는 예시입니다.`,
    useWhen: [`${title} 사업의 재원이 교부되거나 징수계획이 확정된 경우`], prepareBeforeWriting: ["교부공문 또는 징수계획", "실제 사업기간과 산출근거"],
    documentTitle: `${title} 성립전예산 편성`, grantingAgency: agency(fundingCategory), officialDocument: "교육지원과-0000(20XX. X. X.)",
    projectPeriod: "20XX. X. X. ~ 20XX. X. X.", reason: `${title} 사업을 적기에 추진하기 위해 성립전예산으로 편성하고자 합니다.`,
    basis: "학교회계 예산편성 기본지침 및 관련 교부공문", items: [{ unitBusiness: "교육활동 지원", business: title, detail: `${title} 운영`, category: "교육운영비", description: `${title} 운영 물품 및 프로그램비`, note: "실제 교부조건에 맞게 수정", unitPrice, quantity: 10, count: 1, manualAmount: unitPrice * 10 }],
    draftPreview: `${title} 사업비를 교부 목적과 산출근거에 따라 성립전예산으로 편성합니다.`, autoCheckNotes: ["교부금액과 편성금액 일치 여부 확인"],
    reviewRequiredFields: ["grantingAgency", "officialDocument", "projectPeriod"], sourceCategory: "복합 분석", sourceReviewedAt: "2026-08-08",
  };
};
export const PREBUDGET_EXAMPLES = seeds.map(makeExample) as readonly PrebudgetExample[];
