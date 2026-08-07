import { describe, expect, it } from "vitest";
import { createBudgetAgendaDraft } from "./createDraft";
import { formatEditableMoney, parseEditableMoney } from "./moneyInput";
import type { BudgetAgendaSource } from "./types";
import { validateBudgetAgenda } from "./validation";

const source: BudgetAgendaSource = {
  fiscalYear: 2026,
  schoolName: "서울옥정초등학교",
  budgetType: "추경1회",
  revisedBudget: 1771057,
  previousBudget: 1010749,
  changeAmount: 760308,
  changeRate: 75.2,
  incomeRows: [
    { id: "i1", chapter: "이전수입", section: "교부금", current: 760308, cumulative: 1771057, ratio: 100, note: "" },
  ],
  expenseRows: [
    { id: "e1", policy: "학교교육", current: 760308, cumulative: 1771057, ratio: 100, note: "" },
  ],
};

describe("예산 안건설명서 숫자 처리", () => {
  it("금액을 쉼표로 표시하고 입력 문자열을 숫자로 바꾼다", () => {
    expect(formatEditableMoney(1771057)).toBe("1,771,057");
    expect(parseEditableMoney("1,771,057원")).toBe(1771057);
  });

  it("증감액과 세입·세출 합계를 검증한다", () => {
    expect(validateBudgetAgenda(createBudgetAgendaDraft(source)).every(item => item.ok)).toBe(true);
  });

  it("불일치한 금회 합계를 표시한다", () => {
    const draft = createBudgetAgendaDraft(source);
    draft.expenseRows[0].current = 700000;
    expect(validateBudgetAgenda(draft).find(item => item.id === "expense-current")?.ok).toBe(false);
  });
});
