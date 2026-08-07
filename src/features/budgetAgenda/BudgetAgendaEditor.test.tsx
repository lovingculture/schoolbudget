import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createBudgetAgendaDraft } from "./createDraft";
import { BudgetAgendaEditor } from "./BudgetAgendaEditor";
import type { BudgetAgendaSource } from "./types";

const source: BudgetAgendaSource = {
  fiscalYear: 2026, schoolName: "서울옥정초등학교", budgetType: "추경1회",
  revisedBudget: 1771057, previousBudget: 1010749, changeAmount: 760308, changeRate: 75.2,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방자치단체이전수입", current: 173893, cumulative: 173893, ratio: 9.8, note: "" }],
  expenseRows: [{ id: "e1", policy: "인적자원 운용", current: 47213, cumulative: 66153, ratio: 3.7, note: "" }],
};

describe("예산 안건설명서 입력 화면", () => {
  it("안건번호와 금액 수정을 초안으로 전달한다", async () => {
    const draft = createBudgetAgendaDraft(source);
    const onChange = vi.fn();
    render(<BudgetAgendaEditor original={draft} draft={draft} onChange={onChange}/>);
    await userEvent.type(screen.getByLabelText("안건번호"), "7");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ agendaNumber: "7" }));
    fireEvent.change(screen.getByLabelText("경정예산액"), { target: { value: "2,000,000" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ revisedBudget: 2000000 }));
  });

  it("총 규모 표의 예산 제목 수정을 초안으로 전달한다", () => {
    const draft = createBudgetAgendaDraft(source);
    const onChange = vi.fn();
    render(<BudgetAgendaEditor original={draft} draft={draft} onChange={onChange}/>);

    fireEvent.change(screen.getByLabelText("경정예산 제목"), { target: { value: "1차추경예산액(B)" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ revisedBudgetLabel: "1차추경예산액(B)" }));
    fireEvent.change(screen.getByLabelText("기정예산 제목"), { target: { value: "본예산액(A)" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ previousBudgetLabel: "본예산액(A)" }));
  });
});
