import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createClosingDraft } from "./createDraft";
import type { ClosingAgendaDraft, ClosingSource } from "./types";
import { ClosingEditor } from "./ClosingEditor";

const source: ClosingSource = {
  fiscalYear: 2025, schoolName: "서울옥정초등학교",
  budget: 2727447000, currentBudget: 2730444440,
  incomeTotal: 2724818217, expenseTotal: 2698568069, surplus: 26250148,
  carryovers: { specified: 4466880, accident: 0, continuing: 0 },
  subsidyReturn: 0, priorTransfer: 15000000, afterTransfer: 6783268, netSurplus: 21783268,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방자치단체이전수입", amount: 2724818217, ratio: 100 }],
  expenseRows: [{ id: "e1", policy: "인적자원 운용", amount: 2698568069, ratio: 100 }],
};

function Harness() {
  const original = createClosingDraft(source);
  const [draft, setDraft] = useState<ClosingAgendaDraft>(original);
  return <ClosingEditor original={original} draft={draft} onChange={setDraft}/>;
}

describe("결산 안건설명서 전체 편집", () => {
  it("총괄표와 세입·세출 결산액에 세 자리 쉼표를 표시한다", () => {
    render(<Harness/>);
    expect(screen.getByLabelText("예산액")).toHaveValue("2,727,447,000");
    expect(screen.getByLabelText("명시이월")).toHaveValue("4,466,880");
    expect(screen.getByLabelText("세입 1 결산액")).toHaveValue("2,724,818,217");
    expect(screen.getByLabelText("세출 1 결산액")).toHaveValue("2,698,568,069");
    expect(screen.getByLabelText("세입 1 구성비")).toHaveValue(100);
  });

  it("제안정보와 자동 추출된 금액을 수정할 수 있다", async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    await user.type(screen.getByLabelText("안건번호"), "7");
    await user.clear(screen.getByLabelText("예산액"));
    await user.type(screen.getByLabelText("예산액"), "2727447001");
    expect(screen.getByLabelText("안건번호")).toHaveValue("7");
    expect(screen.getByLabelText("예산액")).toHaveValue("2,727,447,001");
  });

  it("수정한 예산액을 원본값으로 되돌린다", async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const budget = screen.getByLabelText("예산액");
    await user.clear(budget);
    await user.type(budget, "9");
    expect(screen.getByText("수정됨")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "예산액 원본값으로 되돌리기" }));
    expect(budget).toHaveValue("2,727,447,000");
  });
});
