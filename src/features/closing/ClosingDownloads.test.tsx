import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createClosingDraft } from "./createDraft";
import { ClosingDownloads } from "./ClosingDownloads";
import type { ClosingSource } from "./types";

const source: ClosingSource = {
  fiscalYear: 2025, schoolName: "서울옥정초등학교", budget: 100, currentBudget: 110,
  incomeTotal: 105, expenseTotal: 90, surplus: 15,
  carryovers: { specified: 2, accident: 0, continuing: 0 }, subsidyReturn: 0,
  priorTransfer: 0, afterTransfer: 0, netSurplus: 13,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방교육행정기관이전수입", amount: 105, ratio: 100 }],
  expenseRows: [{ id: "e1", policy: "기본적 교육활동", amount: 90, ratio: 100 }],
};

describe("결산 안건설명서 다운로드", () => {
  it("결과 파일은 한글, Word와 PDF만 표시하고 Excel은 제공하지 않는다", () => {
    render(<ClosingDownloads draft={createClosingDraft(source)}/>);
    expect(screen.getByRole("button", { name: "한글(HWPX) 내려받기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Word(DOCX) 내려받기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "PDF 내려받기" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Excel/i })).not.toBeInTheDocument();
  });
});
