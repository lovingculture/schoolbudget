import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createBudgetAgendaDraft } from "./createDraft";
import { BudgetAgendaPreview } from "./BudgetAgendaPreview";
import type { BudgetAgendaSource } from "./types";

const source: BudgetAgendaSource = {
  fiscalYear: 2026, schoolName: "서울옥정초등학교", budgetType: "추경1회",
  revisedBudget: 1771057, previousBudget: 1010749, changeAmount: 760308, changeRate: 75.2,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방교육행정기관이전수입", current: 173893, cumulative: 173893, ratio: 9.8, note: "" }],
  expenseRows: Array.from({ length: 7 }, (_, index) => ({ id: `e${index}`, policy: `정책사업 ${index + 1}`, current: index ? 0 : 760308, cumulative: index ? 0 : 1771057, ratio: index ? 0 : 100, note: "" })),
};

describe("예산 안건설명서 미리보기", () => {
  it("제목과 총액을 A4 두 쪽에 표시한다", () => {
    render(<BudgetAgendaPreview draft={createBudgetAgendaDraft(source)}/>);
    expect(screen.getByRole("heading", { name: "2026학년도 서울옥정초등학교 회계 1차 추경예산(안)" })).toBeInTheDocument();
    expect(screen.getAllByText("1,771,057").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("budget-agenda-a4-page")).toHaveLength(2);
  });

  it("본문과 긴 세입 항목에 가독성 전용 스타일 범위를 적용한다", () => {
    const { container } = render(<BudgetAgendaPreview draft={createBudgetAgendaDraft(source)}/>);

    expect(container.querySelectorAll(".budget-agenda-body-text")).toHaveLength(2);
    container.querySelectorAll(".budget-agenda-body-text").forEach(element => expect(element).toHaveStyle({ fontSize: "12pt" }));
    expect(container.querySelector(".budget-agenda-major")).toHaveStyle({ fontSize: "12pt" });
    expect(screen.getByRole("heading", { name: "라. 추경예산 편성 주요내용" })).toHaveStyle({ fontSize: "12pt" });
    expect(screen.getByText("지방교육행정기관이전수입")).toHaveClass("budget-agenda-long-income-label");
  });

  it("사용자가 수정한 총 규모 표 제목을 표시한다", () => {
    const draft = createBudgetAgendaDraft(source);
    render(<BudgetAgendaPreview draft={{ ...draft, revisedBudgetLabel: "1차추경예산액(B)", previousBudgetLabel: "본예산액(A)" }}/>);

    expect(screen.getByRole("columnheader", { name: "1차추경예산액(B)" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "본예산액(A)" })).toBeInTheDocument();
  });
});
