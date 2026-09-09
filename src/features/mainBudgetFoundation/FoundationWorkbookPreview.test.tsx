import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { parseFoundationCsv } from "./parseFoundationCsv";
import { combinedBudgetSampleText } from "./fixtures/combinedBudgetSample";
import { FoundationWorkbookPreview } from "./FoundationWorkbookPreview";
import type { FoundationBudgetDocument } from "./types";

function document() {
  return parseFoundationCsv("sample.csv", new TextEncoder().encode(combinedBudgetSampleText).buffer);
}

describe("FoundationWorkbookPreview", () => {
  it("shows four workbook sheet tabs in the approved order", () => {
    render(<FoundationWorkbookPreview document={document()} />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["세입", "세출(원안)", "세출(조정안)", "업무추진비"]);
    expect(screen.getByRole("tabpanel", { name: "세입" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "전년도 산출식" })).toBeVisible();
    expect(screen.getAllByText("721,573,000").length).toBeGreaterThan(0);
  });

  it("switches to the original expense sheet with Excel headers", async () => {
    const user = userEvent.setup();
    render(<FoundationWorkbookPreview document={document()} />);
    await user.click(screen.getByRole("tab", { name: "세출(원안)" }));
    expect(screen.getByRole("tabpanel", { name: "세출(원안)" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "전년요구금액" })).toBeVisible();
    expect(screen.getByText("일반업무추진비")).toBeVisible();
  });

  it("shows prior-year revenue calculations as separate spreadsheet rows", () => {
    const input = document();
    const multiLine: FoundationBudgetDocument = {
      ...input,
      revenueRows: [{
        ...input.revenueRows[0],
        calculationBasis: "기본운영비 : 667,348,000원 * 1개교 =\n체육관사용료 : 29,660,000원 * 1건 =",
        calculationAmount: 697_008_000,
      }],
    };

    render(<FoundationWorkbookPreview document={multiLine} />);
    expect(screen.getByText("기본운영비 : 667,348,000원 * 1개교 =")).toBeVisible();
    expect(screen.getByText("체육관사용료 : 29,660,000원 * 1건 =")).toBeVisible();
    expect(screen.getByText("667,348,000")).toBeVisible();
    expect(screen.getByText("29,660,000")).toBeVisible();
  });

  it("shows prior-year expense calculations as separate rows without filling current-year cells", async () => {
    const user = userEvent.setup();
    const input = document();
    const multiLine: FoundationBudgetDocument = {
      ...input,
      expenseRows: [{
        ...input.expenseRows[0],
        calculationBasis: "교수학습자료구매 : 1,500,000원 * 2회 =\n학습준비물구입 : 30,000원 * 600명 =",
        calculationAmount: 21_000_000,
      }],
    };

    render(<FoundationWorkbookPreview document={multiLine} />);
    await user.click(screen.getByRole("tab", { name: "세출(원안)" }));
    const rows = screen.getAllByRole("row");
    expect(screen.getByText("교수학습자료구매 : 1,500,000원 * 2회 =")).toBeVisible();
    expect(screen.getByText("학습준비물구입 : 30,000원 * 600명 =")).toBeVisible();
    expect(rows.some((row) => row.textContent?.includes("21,000,000"))).toBe(false);
  });
});
