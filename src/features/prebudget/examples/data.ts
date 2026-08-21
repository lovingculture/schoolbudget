import type { ExampleFundingCategory, PrebudgetExample } from "./types";

type Seed = [
  id: string,
  fundingCategory: ExampleFundingCategory,
  title: string,
  searchAliases: string[],
  unitBusiness: string,
  business: string,
  detail: string,
];
const seeds: Seed[] = [
  ["purpose-basic-learning", "목적사업비", "기초학력 지원", ["학습지원", "기초학력", "보충지도"], "교육격차해소", "기타 교육격차해소 지원", "단위학교 기초학력 책임지도"],
  ["purpose-neulbom", "목적사업비", "맞춤형 늘봄교실", ["늘봄", "맞춤형", "교실"], "방과후 학교운영", "늘봄학교 운영", "맞춤형 늘봄교실 운영"],
  ["purpose-care", "목적사업비", "초등돌봄교실", ["돌봄", "초등돌봄", "간식"], "방과후 학교운영", "돌봄교실운영", "오후돌봄교실 운영"],
  ["purpose-afterschool", "목적사업비", "방과후학교 운영 지원", ["방과후", "강좌", "수강"], "방과후 학교운영", "방과후 학교운영", "방과후학교 운영 지원"],
  ["purpose-digital-ai", "목적사업비", "디지털·AI 교육 지원", ["디지털", "AI", "인공지능"], "학습지원실 운영", "정보화실 운영", "AI 디지털교육 지원"],
  ["purpose-integrated-student", "목적사업비", "학생 맞춤통합지원", ["맞춤통합", "학생지원", "통합지원"], "교육격차해소", "기타 교육격차해소 지원", "학생 맞춤통합지원"],
  ["purpose-welfare", "목적사업비", "교육복지 지원", ["교육복지", "복지", "취약학생"], "학생 복지", "교육복지우선", "교육복지 지원사업"],
  ["purpose-safety-staff", "목적사업비", "학생안전 인력 운영", ["안전", "안전인력", "봉사자"], "생활지도 운영", "학생안전교육", "학교안전인력 운영"],
  ["purpose-reading-books", "목적사업비", "독서교육·도서구입", ["독서", "도서", "책"], "독서활동", "독서활동 운영", "독서교육 및 도서구입"],
  ["purpose-career-experience", "목적사업비", "진로·체험활동 지원", ["진로", "체험", "현장체험"], "창의적 체험활동", "진로활동", "진로교육·체험활동"],
  ["district-facility", "구청보조금", "시설·환경개선 지원", ["구청 지원", "시설", "환경개선"], "교육여건 개선", "교육환경개선", "시설·환경개선"],
  ["district-curriculum", "구청보조금", "교육과정·체험활동 지원", ["구청 지원", "교육과정", "체험"], "교과 활동", "교과활동지원", "교육과정 운영 지원"],
  ["district-welfare", "구청보조금", "학생복지 지원", ["구청 지원", "학생복지", "복지"], "학생 복지", "교육복지우선", "학생복지 지원"],
  ["beneficiary-yearbook", "수익자부담금", "졸업앨범비", ["학부모 부담", "졸업", "앨범"], "학생 복지", "학생 복지운영", "졸업앨범 제작"],
  ["beneficiary-field-trip", "수익자부담금", "현장체험학습비", ["학부모 부담", "현장체험", "여행"], "창의적 체험활동", "현장체험학습 활동", "현장체험학습"],
  ["beneficiary-afterschool", "수익자부담금", "방과후학교 수강료", ["학부모 부담", "방과후", "수강료"], "방과후 학교운영", "방과후 학교운영", "방과후학교 수강료"],
];

const makeExample = ([id, fundingCategory, title, searchAliases, unitBusiness, business, detail]: Seed, index: number): PrebudgetExample => {
  const unitPrice = (index + 1) * 10_000;
  return {
    id, fundingCategory, title, searchAliases, summary: `${title} 성립전예산을 처음 작성할 때 참고하는 예시입니다.`,
    useWhen: [`${title} 사업의 재원이 교부되거나 징수계획이 확정된 경우`], prepareBeforeWriting: fundingCategory === "목적사업비" ? ["교부공문 또는 징수계획", "실제 사업기간과 산출근거"] : [],
    documentTitle: `${title} 성립전예산 편성`, officialDocument: "교육지원과-0000(20XX. X. X.)",
    items: [{ unitBusiness, business, detail, category: "교육운영비", description: `${title} 운영 물품 및 프로그램비`, note: "실제 교부조건에 맞게 수정", unitPrice, quantity: 10, count: 1, manualAmount: unitPrice * 10 }],
    draftPreview: `${title} 사업비를 교부 목적과 산출근거에 따라 성립전예산으로 편성합니다.`, autoCheckNotes: ["교부금액과 편성금액 일치 여부 확인"],
    reviewRequiredFields: ["officialDocument"], sourceCategory: "복합 분석", sourceReviewedAt: "2026-08-08",
  };
};
const examples = seeds.map(makeExample);

const neulbomIndex = examples.findIndex(({ id }) => id === "purpose-neulbom");
examples[neulbomIndex] = {
  ...examples[neulbomIndex],
  items: [
    { unitBusiness: "방과후 학교운영", business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "교육운영비", description: "(목)간식비", unitPrice: 900_000, quantity: 4, count: 1, manualAmount: 3_600_000, formulaText: "900,000원 × 4실" },
    { unitBusiness: "방과후 학교운영", business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "교육운영비", description: "(목)강사비", unitPrice: 28_800_000, quantity: 1, count: 1, manualAmount: 28_800_000, formulaText: "28,800,000원" },
    { unitBusiness: "방과후 학교운영", business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "교육운영비", description: "(목)업체위탁보전금", unitPrice: 4_740, quantity: 1_976, count: 1, manualAmount: 9_367_000, formulaText: "4,740원 × 1,976" },
    { unitBusiness: "방과후 학교운영", business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "교육운영비", description: "(목)재료비", unitPrice: 0, quantity: 1, count: 1, manualAmount: 0, formulaText: "0원" },
    { unitBusiness: "방과후 학교운영", business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "기간제근로자법정부담금", description: "(목)개인강사위탁학교부담보험금", unitPrice: 120_000, quantity: 1, count: 1, manualAmount: 120_000, formulaText: "120,000원 × 1회" },
    { unitBusiness: "방과후 학교운영", business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "목적사업업무추진비", description: "(목)업무추진비", unitPrice: 120_000, quantity: 1, count: 1, manualAmount: 120_000, formulaText: "120,000원 × 1식" },
    { unitBusiness: "방과후 학교운영", business: "늘봄학교운영", detail: "(목)맞춤형교실 운영비", category: "일반수용비", description: "(목)귀가안전관리비", unitPrice: 600_000, quantity: 1, count: 12, manualAmount: 7_200_000, formulaText: "600,000원 × 12월" },
  ],
};

const careIndex = examples.findIndex(({ id }) => id === "purpose-care");
examples[careIndex] = {
  ...examples[careIndex],
  items: [
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)오후돌봄교실 운영비", category: "교육운영비", description: "(목)교재교구구입비", unitPrice: 745_000, quantity: 1, count: 10, manualAmount: 7_450_000, formulaText: "745,000원 × 10회" },
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)오후돌봄교실 운영비", category: "운영수당", description: "(목)돌봄프로그램비", unitPrice: 2_500_000, quantity: 1, count: 1, manualAmount: 2_500_000, formulaText: "2,500,000원" },
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)오후돌봄교실 운영비", category: "일반수용비", description: "(목)봉사활동비", unitPrice: 3_475_000, quantity: 1, count: 2, manualAmount: 6_950_000, formulaText: "3,475,000원 × 2회" },
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)오후돌봄교실 운영비", category: "일반수용비", description: "(목)소모품구입비", unitPrice: 400_000, quantity: 4, count: 1, manualAmount: 1_600_000, formulaText: "400,000원 × 4학급" },
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)아침돌봄운영비", category: "일반수용비", description: "(목)봉사활동비", unitPrice: 5_000_000, quantity: 1, count: 1, manualAmount: 5_000_000, formulaText: "5,000,000원" },
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)틈새돌봄운영비", category: "일반수용비", description: "(목)봉사활동비", unitPrice: 30_000, quantity: 240, count: 1, manualAmount: 7_200_000, formulaText: "30,000원 × 240일" },
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)틈새돌봄운영비", category: "일반수용비", description: "(목)틈새돌봄운영비", unitPrice: 200_000, quantity: 1, count: 4, manualAmount: 800_000, formulaText: "200,000원 × 4회" },
    { unitBusiness: "방과후 학교운영", business: "돌봄교실운영", detail: "(목)저녁돌봄운영비", category: "일반수용비", description: "(목)안전관리비", unitPrice: 200_000, quantity: 4, count: 1, manualAmount: 800_000, formulaText: "200,000원 × 4학급" },
  ],
};

const districtEnglishIndex = examples.findIndex(({ id }) => id === "district-facility");
examples[districtEnglishIndex] = {
  ...examples[districtEnglishIndex],
  title: "영어체험학습",
  searchAliases: ["구청 지원", "교육경비보조금", "영어체험", "미래글로벌체험센터"],
  summary: "교육경비보조금 영어체험학습 사업을 성립전예산으로 편성할 때 참고하는 예시입니다.",
  useWhen: ["교육경비보조금 영어체험학습 사업비가 교부된 경우"],
  documentTitle: "영어체험학습 성립전예산 편성",
  draftPreview: "",
  autoCheckNotes: [],
  items: [
    { unitBusiness: "교과 활동", business: "외국어 교과활동", detail: "(보조)미래글로벌체험센터 초등 영어체험학습", category: "교육운영비", description: "(보조)미래글로벌체험센터 초등 영어체험학습 교통비", unitPrice: 500_000, quantity: 4, count: 1, manualAmount: 2_000_000, formulaText: "500,000원 × 4학급" },
    { unitBusiness: "교과 활동", business: "외국어 교과활동", detail: "(보조)미래글로벌체험센터 초등 영어체험학습", category: "교육운영비", description: "(보조)미래글로벌체험센터 초등 영어체험학습 사스임자료", unitPrice: 10_000, quantity: 100, count: 1, manualAmount: 1_000_000, formulaText: "10,000원 × 100명" },
  ],
};
const districtReadingIndex = examples.findIndex(({ id }) => id === "district-curriculum");
examples[districtReadingIndex] = {
  ...examples[districtReadingIndex],
  title: "독서교육 및 교육과정 교구 구입",
  searchAliases: ["구청 지원", "교육경비보조금", "독서교육", "교육과정", "교구"],
  summary: "교육경비보조금 독서교육 및 교육과정 교구 구입 사업을 성립전예산으로 편성할 때 참고하는 예시입니다.",
  useWhen: ["교육경비보조금 독서교육 및 교육과정 교구 구입 사업비가 교부된 경우"],
  documentTitle: "독서교육 및 교육과정 교구 구입 성립전예산 편성",
  draftPreview: "",
  autoCheckNotes: [],
  items: [
    { unitBusiness: "독서활동", business: "독서활동 운영", detail: "(보조금)책향성독서교육", category: "교육운영비", description: "(보조)1~4학년 교육과정 교구구입", unitPrice: 1_500_000, quantity: 4, count: 1, manualAmount: 6_000_000, formulaText: "1,500,000원 × 4개 학년" },
    { unitBusiness: "독서활동", business: "독서활동 운영", detail: "(보조금)책향성독서교육", category: "교육운영비", description: "(보조)5~6학년 교육과정 교구구입", unitPrice: 500_000, quantity: 2, count: 1, manualAmount: 1_000_000, formulaText: "500,000원 × 2개 학년" },
    { unitBusiness: "독서활동", business: "독서활동 운영", detail: "(보조금)책향성독서교육", category: "교육운영비", description: "(보조)운정 북클럽 운영비", unitPrice: 30_000, quantity: 1, count: 10, manualAmount: 300_000, formulaText: "30,000원 × 10회" },
  ],
};
const districtCareerIndex = examples.findIndex(({ id }) => id === "district-welfare");
examples[districtCareerIndex] = {
  ...examples[districtCareerIndex],
  title: "진로교육 활성화",
  searchAliases: ["구청 지원", "교육경비보조금", "진로교육", "진로활동"],
  summary: "교육경비보조금 진로교육 활성화 사업을 성립전예산으로 편성할 때 참고하는 예시입니다.",
  useWhen: ["교육경비보조금 진로교육 활성화 사업비가 교부된 경우"],
  documentTitle: "진로교육 활성화 성립전예산 편성",
  draftPreview: "",
  autoCheckNotes: [],
  items: [
    { unitBusiness: "창의적 체험활동", business: "진로활동", detail: "(보조금)진로교육 활성화사업 지원", category: "교육운영비", description: "(보조)교재교구비 및 예비비", unitPrice: 1_100_000, quantity: 1, count: 1, manualAmount: 1_100_000, formulaText: "1,100,000원 × 1회" },
    { unitBusiness: "창의적 체험활동", business: "진로활동", detail: "(보조금)진로교육 활성화사업 지원", category: "운영수당", description: "(보조)1,2학년 강사수당", unitPrice: 35_000, quantity: 1, count: 180, manualAmount: 6_300_000, formulaText: "35,000원 × 180회" },
    { unitBusiness: "창의적 체험활동", business: "진로활동", detail: "(보조금)진로교육 활성화사업 지원", category: "운영수당", description: "(보조)3,4학년 강사수당", unitPrice: 35_000, quantity: 1, count: 180, manualAmount: 6_300_000, formulaText: "35,000원 × 180회" },
    { unitBusiness: "창의적 체험활동", business: "진로활동", detail: "(보조금)진로교육 활성화사업 지원", category: "운영수당", description: "(보조)5,6학년 강사수당", unitPrice: 35_000, quantity: 1, count: 180, manualAmount: 6_300_000, formulaText: "35,000원 × 180회" },
  ],
};
const basicLearningIndex = examples.findIndex(({ id }) => id === "purpose-basic-learning");
examples[basicLearningIndex] = {
  ...examples[basicLearningIndex],
  title: "단위학교 기초학력 책임지도",
  summary: "단위학교 기초학력 책임지도 사업비를 성립전예산으로 처음 편성할 때 참고하는 예시입니다.",
  useWhen: [
    "교육청에서 단위학교 기초학력 책임지도 사업비가 교부된 경우",
    "교부공문에 사업 목적과 예산 편성기준이 안내된 경우",
  ],
  prepareBeforeWriting: [
    "교부공문",
    "공문에 안내된 예산 편성기준 및 사용 가능 항목",
    "교부금액",
    "학교의 실제 사업계획과 산출근거",
  ],
  documentTitle: "단위학교 기초학력 책임지도 성립전예산 편성",
  items: [
    { unitBusiness: "교육격차해소", business: "기타 교육격차해소 지원", detail: "단위학교 기초학력 책임지도", category: "교육운영비", description: "(목) 학습지원대상 물품구입비(문제집 등)", unitPrice: 288_000, quantity: 1, count: 2, manualAmount: 576_000 },
    { unitBusiness: "교육격차해소", business: "기타 교육격차해소 지원", detail: "단위학교 기초학력 책임지도", category: "기간제근로자법정부담금", description: "(목) 기초학력협력강사 보험료", unitPrice: 324_000, quantity: 1, count: 1, manualAmount: 324_000 },
    { unitBusiness: "교육격차해소", business: "기타 교육격차해소 지원", detail: "단위학교 기초학력 책임지도", category: "기타수당", description: "(목) 학습지원담당교원 수업시수 경감", unitPrice: 25_000, quantity: 1, count: 74, manualAmount: 1_850_000 },
    { unitBusiness: "교육격차해소", business: "기타 교육격차해소 지원", detail: "단위학교 기초학력 책임지도", category: "목적사업업무추진비", description: "(목) 지원협의회 운영 협의회비", unitPrice: 125_000, quantity: 1, count: 2, manualAmount: 250_000 },
    { unitBusiness: "교육격차해소", business: "기타 교육격차해소 지원", detail: "단위학교 기초학력 책임지도", category: "운영수당", description: "(목) 기초학력협력강사 수당", unitPrice: 25_000, quantity: 1, count: 480, manualAmount: 12_000_000 },
  ],
  detailNotice: "세부사업, 세부항목, 원가통계비목 및 산출내역은 해당 교부공문의 편성기준에 따라 달라질 수 있습니다.",
  draftPreview: "단위학교 기초학력 책임지도 사업비를 교부 목적 및 예산 편성기준에 따라 성립전예산으로 편성하고자 합니다.",
  autoCheckNotes: [
    "공문의 교부금액과 편성금액이 일치하는지",
    "공문에서 정한 예산 편성기준과 사용 목적에 맞는지",
    "원가통계비목이 적절하게 선택되었는지",
    "산출식의 단가 × 인원(수량) × 횟수 계산이 정확한지",
    "학교의 실제 사업계획과 산출내역이 일치하는지",
  ],
};

const yearbookIndex = examples.findIndex(({ id }) => id === "beneficiary-yearbook");
examples[yearbookIndex] = {
  ...examples[yearbookIndex],
  useWhen: ["졸업앨범비를 학부모 부담 경비로 걷는 경우"],
  prepareBeforeWriting: [],
  draftPreview: "",
  items: [{
    unitBusiness: "학생 복지",
    business: "학생 복지운영",
    detail: "졸업앨범 제작",
    category: "학생복지비",
    description: "졸업앨범비 구입",
    unitPrice: 70_000,
    quantity: 100,
    count: 1,
    manualAmount: 7_000_000,
  }],
  calculationUnit: "부",
  autoCheckNotes: ["학생수 및 졸업앨범비 단가를 확인하세요."],
};

const afterschoolIndex = examples.findIndex(({ id }) => id === "beneficiary-afterschool");
examples[afterschoolIndex] = {
  ...examples[afterschoolIndex],
  useWhen: ["방과후학교 운영 수강료 및 교재비 징수계획이 확정된 경우"],
  draftPreview: "",
  autoCheckNotes: [],
  items: [
    { unitBusiness: "방과후 학교운영", business: "방과후 학교운영", detail: "방과후학교 수강료", category: "운영수당", description: "레고교실 강사료", unitPrice: 30_000, quantity: 20, count: 1, manualAmount: 600_000 },
    { unitBusiness: "방과후 학교운영", business: "방과후 학교운영", detail: "방과후학교 수강료", category: "일반수용비", description: "레고교실 수용비", unitPrice: 1_500, quantity: 20, count: 1, manualAmount: 30_000 },
    { unitBusiness: "방과후 학교운영", business: "방과후 학교운영", detail: "방과후학교 수강료", category: "교육운영비", description: "레고교실 교재교구구입", unitPrice: 10_000, quantity: 20, count: 1, manualAmount: 200_000 },
  ],
  calculationUnit: "명",
};

const fieldTripIndex = examples.findIndex(({ id }) => id === "beneficiary-field-trip");
examples[fieldTripIndex] = {
  ...examples[fieldTripIndex],
  useWhen: ["현장학습비 징수계획이 확정된 경우"],
  draftPreview: "",
  autoCheckNotes: [],
  items: [
    { unitBusiness: "창의적 체험활동", business: "현장체험학습 활동", detail: "(수) 5학년 현장체험학습", category: "교육운영비", description: "(수) 교통비", unitPrice: 32_900, quantity: 115, count: 1, manualAmount: 3_784_000, formulaText: "32,900원 × 115명" },
    { unitBusiness: "창의적 체험활동", business: "현장체험학습 활동", detail: "(수) 5학년 현장체험학습", category: "교육운영비", description: "(수) 점심식사비", unitPrice: 9_500, quantity: 115, count: 1, manualAmount: 1_093_000, formulaText: "9,500원 × 115명" },
    { unitBusiness: "창의적 체험활동", business: "현장체험학습 활동", detail: "(수) 5학년 현장체험학습", category: "교육운영비", description: "(수) 체험활동비", unitPrice: 2_500, quantity: 115, count: 1, manualAmount: 287_000, formulaText: "2,500원 × 115명 - 1,000원" },
  ],
  calculationUnit: "명",
};

const purposeAutoCheckNotes = [
  "공문의 교부금액과 편성금액이 일치하는지",
  "공문에서 정한 예산 편성기준과 사용 목적에 맞는지",
  "원가통계비목이 적절하게 선택되었는지",
  "산출식의 단가 × 인원(수량) × 횟수 계산이 정확한지",
  "학교의 실제 사업계획과 산출내역이 일치하는지",
];

for (const example of examples) {
  if (example.fundingCategory === "목적사업비") {
    example.draftPreview = "";
    example.autoCheckNotes = [...purposeAutoCheckNotes];
  }
}

export const PREBUDGET_EXAMPLES = examples as readonly PrebudgetExample[];
