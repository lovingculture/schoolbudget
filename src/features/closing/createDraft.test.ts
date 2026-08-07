import { describe, expect, it } from "vitest";
import type { ClosingSource } from "./types";
import { createClosingDraft } from "./createDraft";

const source = {
  fiscalYear: 2025,
  schoolName: "서울옥정초등학교",
  budget: 1,
  currentBudget: 1,
  incomeTotal: 1,
  expenseTotal: 1,
  surplus: 0,
  carryovers: { specified: 0, accident: 0, continuing: 0 },
  subsidyReturn: 0,
  priorTransfer: 0,
  afterTransfer: 0,
  netSurplus: 0,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "관", amount: 1, ratio: 100 }],
  expenseRows: [{ id: "e1", policy: "정책", amount: 1, ratio: 100 }],
} satisfies ClosingSource;

describe("결산 안건설명서 초안", () => {
  it("학년도와 기본 제안정보로 수정 가능한 초안을 만든다", () => {
    const draft = createClosingDraft(source);
    expect(draft.title).toBe("2025학년도 학교회계 세입·세출 결산(안)");
    expect(draft.proposer).toBe("학교장");
    expect(draft.presenter).toBe("행정실장");
    expect(draft.attachment).toContain("2025학년도 결산서 및 부속자료");
  });

  it("원본 행 배열을 공유하지 않는다", () => {
    const draft = createClosingDraft(source);
    draft.incomeRows[0].amount = 9;
    expect(source.incomeRows[0].amount).toBe(1);
  });
});
