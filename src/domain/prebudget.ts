export type RoundingMode = "floor" | "round" | "ceil";

export interface CalculationInput {
  unitPrice?: number;
  quantity?: number;
  count?: number;
  manualAmount?: number;
}

export interface DraftItem extends CalculationInput {
  id?: string;
  unitBusiness?: string;
  business?: string;
  detail?: string;
  category?: string;
  description?: string;
  formulaText?: string;
  note?: string;
}

export interface PrebudgetDraft {
  title: string;
  fiscalYear: number;
  source: string;
  department: string;
  requester: string;
  items: DraftItem[];
}

export interface ValidationIssue {
  code: string;
  message: string;
}

export const PREBUDGET_BUSINESS_OPTIONS = [
  ["기타 교직원 보수", ["교직원 대체인건비", "기타수당"]],
  ["교직원 복지 및 역량강화", ["교직원 역량강화", "교직원복지"]],
  ["급식 관리", ["학교급식운영"]],
  ["기숙사 관리", ["기숙사운영"]],
  ["보건관리", ["학생 및 교직원 보건안전관리", "학교환경위생관리"]],
  ["교육격차해소", ["학비지원", "정보화비지원", "기타 교육격차해소 지원"]],
  ["학생 복지", ["학생장학금운영", "교육복지우선", "학생 복지운영"]],
  ["교과 활동", ["교과활동지원", "국어 교과활동", "사회 교과활동", "수학 교과활동", "과학 교과활동", "체육 교과활동", "예술 교과활동", "외국어 교과활동", "선택 교과활동", "특수교육 교과활동", "전문 교과활동", "유치원 교과활동", "부설기관 교과활동", "정보 교과활동"]],
  ["창의적 체험활동", ["자율·자치활동", "현장체험학습 활동", "동아리 활동", "봉사활동", "진로활동"]],
  ["자유학기(년) 활동", ["자유학기활동"]],
  ["방과후 학교운영", ["방과후 학교운영", "유치원 방과후 과정운영", "늘봄학교 운영", "늘봄학교운영", "돌봄교실운영"]],
  ["직업교육", ["직업교육 운영"]],
  ["국제교육", ["국제교육 운영"]],
  ["독서활동", ["독서활동 운영"]],
  ["교기육성", ["교기운영"]],
  ["기타 선택적 교육활동", ["창의 교육운영", "기타선택적 교육운영", "다문화 교육운영", "환경교육 운영"]],
  ["교무업무 운영", ["교무학사 운영"]],
  ["생활지도 운영", ["학생생활상담지도", "학교폭력 예방", "학생안전교육"]],
  ["연구학교 운영", ["연구학교 운영"]],
  ["학습지원실 운영", ["방송실 운영", "정보화실 운영", "공동실습소 운영", "기타 학습지원실 운영"]],
  ["교육여건 개선", ["교육환경개선"]],
] as const;

export function getDetailBusinesses(unitBusiness?: string): readonly string[] {
  return PREBUDGET_BUSINESS_OPTIONS.find(([unit]) => unit === unitBusiness)?.[1] ?? [];
}

export const DEFAULT_ACCOUNT_CATEGORIES = [
  ["공무직인건비", "공무원이 아닌 기간의 정함이 없는 근로계약을 체결한 근로자 인건비(퇴직급여, 처우개선비, 각종수당 등 포함)"],
  ["기간제교원인건비", "공무원이 아닌 민간인 신분의 기간제 계약 교원 인건비(퇴직급여 포함)(정규 기간제교원, 대체 기간제교원, 시간강사 등)"],
  ["기간제근로자인건비", "공무원이 아닌 민간인 신분의 기간제 근로자 인건비(퇴직급여 포함)(기간제 계약직, 일용직 등)"],
  ["기타수당", "각종 법률에 따라 교직원에게 지급하는 수당 및 기타 실비변상적 경비(수석교사 연구활동비, 순회교사 및 복식수업수당 등)"],
  ["일반수용비", "학교 운영에 소요되는 일반적인 경비(사무용품 구입비, 감사패·상패 등의 제작비, 인쇄비, 소모성 물품구입비, 비품 수선비, 각종 사용료(소프트웨어사용료 포함) 및 수수료, 시설물 소규모 수선비, 시설장비유지비, 청소용역비, 시설장비위탁 용역비, 임차료, 각종봉사료 등)"],
  ["운영수당", "학교 운영 과정에서 외부강사나 교직원 등에게 지급하는 각종 수당 및 기타 실비지급 경비(강사수당, 외부강사 교통비 및 숙박비 등)"],
  ["급식용식재료비", "급식에 소요되는 식재료비"],
  ["우유급식비", "우유급식에 소요되는 우유구입비"],
  ["여비", "공무원여비규정에 의한 여비, 이전비 및 민간인 여비"],
  ["맞춤형복지비", "교직원(교육공무직원) 맞춤형 복지비"],
  ["교직원복지비", "교직원 맞춤형복지비를 제외한 교직원복지비(피복비, 특근매식비, 직무관련연수비(교원자비부담연수비), 일반직공무원 자기개발비, 교직원보건검사비, 교직원 동호회지원, 소속 교직원(교장 포함) 생일기념 경비 등)"],
  ["교육운영비", "학생 교과활동 지원을 위해 소요되는 각종 경비[교구, 기자재구입(자산성 물품은 비품구입비 목에 편성) 및 유지 보수비, 구독형 교육용 소프트웨어 구입비, 전자책 구독료, 교육용 재료비, 교육활동 숙박비·식비·차량임차료·교통비, 학생여비, 학교행사비, 학생대회출전비, 도서관운영비, 학급교육활동경비, 교육활동 입장료 및 체험비, 학생간식비, 동아리교육활동 등]"],
  ["학습준비물", "학습준비물 구입비"],
  ["학생복지비", "학생 복지에 소요되는 경비(장학금, 학생자치활동, 학교안전공제회비, 학생보건검사비, 졸업앨범비, 교복구입비, 학생 정서행동 검사 및 치료비 등)"],
  ["기간제교원법정부담금", "기간제교원(정규·대체 기간제교원, 시간강사 등)에 대하여 기관(학교)이 부담해야 하는 법정부담금(국민연금, 건강보험, 고용보험, 산재보험 등)"],
  ["기간제근로자법정부담금", "기간제근로자(기간제 계약직, 일용직 등) 및 방과후강사에게 기관(학교)이 부담해야 하는 법정부담금(국민연금, 건강보험, 고용보험, 산재보험 등)"],
  ["공무직법정부담금", "공무직(호봉제·월급제 공무직 등)에 대하여 기관(학교)이 부담해야 하는 법정부담금(국민연금, 건강보험, 고용보험, 산재보험 등)"],
  ["목적사업업무추진비", "지방자치단체 및 교육청, 공공기관에서 지원한 사업비로 특정목적을 수행하기 위하여 추진하는 사업의 업무추진비"],
  ["비품구입비", "자산의 변동을 가져오는 물품 구입비"],
  ["도서구입비", "도서대장에 등재되는 도서구입비"],
] as const;

export function getAccountCategoryDescription(category?: string): string {
  return DEFAULT_ACCOUNT_CATEGORIES.find(([name]) => name === category)?.[1] ?? "";
}

export function calculateRequestedAmount(input: CalculationInput): number {
  const rawAmount = input.manualAmount !== undefined
    ? input.manualAmount
    : (input.unitPrice ?? 0) * (input.quantity ?? 0) * (input.count ?? 0);

  // 예산은 천 원 단위로 편성하되, 음수는 유효성 검사에서 발견되도록 유지한다.
  return rawAmount > 0 ? Math.ceil(rawAmount / 1_000) * 1_000 : rawAmount;
}

export function convertWon(amount: number, rounding: RoundingMode) {
  const raw = amount / 1000;
  const displayed = rounding === "floor" ? Math.floor(raw) : rounding === "ceil" ? Math.ceil(raw) : Math.round(raw);
  return { displayed, remainderWon: amount % 1000, rounding };
}

export function validatePrebudgetDraft(draft: PrebudgetDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!draft.title.trim()) issues.push({ code: "TITLE_REQUIRED", message: "문서 제목을 입력하세요." });
  if (!draft.department.trim()) issues.push({ code: "DEPARTMENT_REQUIRED", message: "부서명을 입력하세요." });
  if (!draft.requester.trim()) issues.push({ code: "REQUESTER_REQUIRED", message: "요구자를 입력하세요." });
  draft.items.forEach((item, index) => {
    const amount = calculateRequestedAmount(item);
    if (amount < 0) issues.push({ code: "NEGATIVE_AMOUNT", message: `${index + 1}번째 항목의 금액은 음수일 수 없습니다.` });
    if (amount === 0) issues.push({ code: "ZERO_AMOUNT", message: `${index + 1}번째 항목의 금액을 확인하세요.` });
  });
  return issues;
}

export const draftTotal = (items: DraftItem[]) => items.reduce((sum, item) => sum + calculateRequestedAmount(item), 0);
