import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createClosingDraft } from "./createDraft";
import type { ClosingSource } from "./types";
import { ClosingAgendaPreview } from "./ClosingAgendaPreview";

const source: ClosingSource = {
  fiscalYear: 2025, schoolName: "서울옥정초등학교",
  budget: 2727447000, currentBudget: 2730444440,
  incomeTotal: 2724818217, expenseTotal: 2698568069, surplus: 26250148,
  carryovers: { specified: 4466880, accident: 0, continuing: 0 },
  subsidyReturn: 0, priorTransfer: 15000000, afterTransfer: 6783268, netSurplus: 21783268,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방자치단체이전수입", amount: 2724818217, ratio: 100 }],
  expenseRows: [{ id: "e1", policy: "인적자원 운용", amount: 2698568069, ratio: 100 }],
};

describe("결산 안건설명서 A4 미리보기", () => {
  it("기준 문서 순서로 A4 두 쪽을 표시한다", () => {
    render(<ClosingAgendaPreview draft={createClosingDraft(source)}/>);
    expect(screen.getAllByTestId("closing-a4-page")).toHaveLength(2);
    expect(screen.getByText("2025학년도 학교회계 세입·세출 결산(안)")).toBeVisible();
    expect(screen.getAllByText("2,724,818,217").length).toBeGreaterThan(0);
    expect(screen.getByText(/별첨 1.*결산서 및 부속자료/)).toBeVisible();
  });
});
