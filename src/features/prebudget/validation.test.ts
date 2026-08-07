import { describe, expect, it } from "vitest";
import { createPrebudgetDraft } from "./draft";
import { validatePrebudgetForm } from "./validation";

describe("성립전예산 자동점검", () => {
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
});
