import { describe, expect, it } from "vitest";
import type { ClosingSource } from "./types";
import { validateClosing } from "./validation";

const source: ClosingSource = {
  fiscalYear: 2025,
  schoolName: "서울옥정초등학교",
  budget: 2727447000,
  currentBudget: 2730444440,
  incomeTotal: 2724818217,
  expenseTotal: 2698568069,
  surplus: 26250148,
  carryovers: { specified: 4466880, accident: 0, continuing: 0 },
  subsidyReturn: 0,
  priorTransfer: 15000000,
  afterTransfer: 6783268,
  netSurplus: 21783268,
  incomeRows: [
    { id: "i1", chapter: "이전수입", section: "이전수입1", amount: 2200697440, ratio: 77.5 },
    { id: "i2", chapter: "자체수입", section: "자체수입1", amount: 492433285, ratio: 18.1 },
    { id: "i3", chapter: "기타수입", section: "기타수입1", amount: 31687492, ratio: 4.4 },
  ],
  expenseRows: [
    { id: "e1", policy: "정책1", amount: 2698568069, ratio: 100 },
  ],
};

source.incomeRows[2].amount = source.incomeTotal - source.incomeRows[0].amount - source.incomeRows[1].amount;

describe("결산자료 자동검증", () => {
  it("정상 자료의 네 가지 관계를 모두 통과시킨다", () => {
    expect(validateClosing(source).map(result => result.ok)).toEqual([true, true, true, true]);
  });

  it("세계잉여금이 1원 다르면 확인 필요로 표시한다", () => {
    const broken = { ...source, surplus: source.surplus + 1 };
    expect(validateClosing(broken)[0].ok).toBe(false);
  });
});
