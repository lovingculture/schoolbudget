import { describe, expect, it } from "vitest";
import { createPrebudgetDraft } from "../draft";
import { applyPrebudgetExample } from "./applyExample";
import { PREBUDGET_EXAMPLES } from "./data";

describe("성립전예산 예시 불러오기", () => {
  it("현재 학교명과 회계연도를 유지한다", () => {
    const current = { ...createPrebudgetDraft("서울우리학교"), fiscalYear: 2026 };
    const result = applyPrebudgetExample(current, PREBUDGET_EXAMPLES[0]);
    expect(result.schoolName).toBe("서울우리학교");
    expect(result.fiscalYear).toBe(2026);
    expect(result.exampleSourceId).toBe(PREBUDGET_EXAMPLES[0].id);
  });

  it("재원 분류를 기존 입력값에 맞게 변환한다", () => {
    expect(applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES.find((item) => item.fundingCategory === "목적사업비")!).source).toBe("목적사업비(교육청)");
    expect(applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES.find((item) => item.fundingCategory === "구청보조금")!).source).toBe("보조금(구청)");
    expect(applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES.find((item) => item.fundingCategory === "수익자부담금")!).source).toBe("수익자부담경비(학부모)");
  });

  it("예산항목을 고유 ID로 깊은 복사하고 원본을 바꾸지 않는다", () => {
    const example = PREBUDGET_EXAMPLES[0];
    const result = applyPrebudgetExample(createPrebudgetDraft("학교"), example);
    result.items[0].description = "사용자 수정";
    expect(example.items[0].description).not.toBe("사용자 수정");
    expect(new Set(result.items.map((item) => item.id)).size).toBe(result.items.length);
  });
});
