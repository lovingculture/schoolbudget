import { describe, expect, it } from "vitest";
import { createBudgetAgendaDraft } from "./createDraft";
import type { BudgetAgendaSource } from "./types";

const source = (budgetType: string): BudgetAgendaSource => ({
  fiscalYear: 2026,
  schoolName: "서울옥정초등학교",
  budgetType,
  revisedBudget: 1771057,
  previousBudget: 1010749,
  changeAmount: 760308,
  changeRate: 75.2,
  incomeRows: [],
  expenseRows: [],
});

describe("예산 안건설명서 초안", () => {
  it("추경 차수와 기본 문구를 자동 작성한다", () => {
    expect(createBudgetAgendaDraft(source("추경1회"))).toMatchObject({
      title: "2026학년도 서울옥정초등학교 회계 1차 추경예산(안)",
      proposer: "학교장",
      presenter: "행정실장",
      reason: "2026학년도 학교회계 1차 추경예산을 심의 받고자 함",
      contentTitle: "추경예산 편성 주요내용",
      majorContents: ["", ""],
      revisedBudgetLabel: "경정예산액(B)",
      previousBudgetLabel: "기정예산액(A)",
    });
  });

  it("본예산에 맞는 제목과 주요내용 제목을 만든다", () => {
    expect(createBudgetAgendaDraft(source("본예산"))).toMatchObject({
      title: "2026학년도 서울옥정초등학교 회계 본예산(안)",
      reason: "2026학년도 학교회계 본예산을 심의 받고자 함",
      contentTitle: "예산 편성 주요내용",
    });
  });
});
