import { describe, expect, it } from "vitest";
import { activePrebudgetItems, createPrebudgetDraft } from "./draft";

describe("성립전예산 초안", () => {
  it("기본 초안에 학교명과 빈 예산항목 5개를 만들고 빈 항목을 출력에서 제외한다", () => {
    const draft = createPrebudgetDraft("서울한빛초등학교");
    expect(draft.schoolName).toBe("서울한빛초등학교");
    expect(draft.source).toBe("목적사업비(교육청)");
    expect(draft.items).toHaveLength(5);
    expect(activePrebudgetItems(draft.items)).toEqual([]);
  });
});
