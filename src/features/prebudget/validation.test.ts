import { describe, expect, it } from "vitest";
import { createPrebudgetDraft } from "./draft";
import { validatePrebudgetForm } from "./validation";
import { applyPrebudgetExample } from "./examples/applyExample";
import { PREBUDGET_EXAMPLES } from "./examples/data";

describe("성립전예산 자동점검", () => {
  it("사업담당자는 필수이고 품의권한 부여자는 선택사항이다", () => {
    const draft = createPrebudgetDraft("학교");
    draft.requester = "";
    draft.approvalGranter = "";
    const messages = validatePrebudgetForm(draft).map((issue) => issue.message);
    expect(messages).toContain("사업담당자를 입력하세요.");
    expect(messages.some((message) => message.includes("품의권한 부여자"))).toBe(false);
  });

  it("빈 행은 무시하고 일부 입력 행의 누락 필드와 0원 금액을 안내한다", () => {
    const draft = createPrebudgetDraft("서울한빛초등학교");
    Object.assign(draft, { title: "안전인력 성립전예산", department: "체육안전부", requester: "김담당", officialDocument: "교육지원과-1234" });
    draft.items[0] = { ...draft.items[0], unitBusiness: "학생 복지", description: "안전인력 봉사비" };
    expect(validatePrebudgetForm(draft).map((issue) => issue.message)).toEqual([
      "1번 항목: 세부사업을 선택하세요.",
      "1번 항목: 세부항목을 입력하세요.",
      "1번 항목: 요구금액은 0원보다 커야 합니다.",
    ]);
  });

  it("예시의 자리표시자와 확인 필요 필드를 안내한다", () => {
    const draft = applyPrebudgetExample(createPrebudgetDraft("서울우리학교"), PREBUDGET_EXAMPLES[0]);
    expect(validatePrebudgetForm(draft).map((issue) => issue.message)).toEqual(expect.arrayContaining([expect.stringContaining("관련 공문 확인 필요")]));
  });

  it("실제 값으로 확인한 필드는 더 이상 경고하지 않는다", () => {
    const draft = applyPrebudgetExample(createPrebudgetDraft("서울우리학교"), PREBUDGET_EXAMPLES[0]);
    draft.officialDocument = "교육지원과-1234(2026. 8. 8.)";
    draft.reviewRequiredFields = draft.reviewRequiredFields.filter((field) => field !== "officialDocument");
    expect(validatePrebudgetForm(draft).some((issue) => issue.message.includes("관련 공문 확인 필요"))).toBe(false);
  });
});
