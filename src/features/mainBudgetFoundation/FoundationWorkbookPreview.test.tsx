import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { parseFoundationCsv } from "./parseFoundationCsv";
import { combinedBudgetSampleText } from "./fixtures/combinedBudgetSample";
import { FoundationWorkbookPreview } from "./FoundationWorkbookPreview";

function document() {
  return parseFoundationCsv("sample.csv", new TextEncoder().encode(combinedBudgetSampleText).buffer);
}

describe("FoundationWorkbookPreview", () => {
  it("shows four workbook sheet tabs in the approved order", () => {
    render(<FoundationWorkbookPreview document={document()} />);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["세입", "세출(원안)", "세출(조정안)", "업무추진비"]);
    expect(screen.getByRole("tabpanel", { name: "세입" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "전년도 산출식" })).toBeVisible();
    expect(screen.getAllByText("721,573").length).toBeGreaterThan(0);
  });

  it("switches to the original expense sheet with Excel headers", async () => {
    const user = userEvent.setup();
    render(<FoundationWorkbookPreview document={document()} />);
    await user.click(screen.getByRole("tab", { name: "세출(원안)" }));
    expect(screen.getByRole("tabpanel", { name: "세출(원안)" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "전년요구금액" })).toBeVisible();
    expect(screen.getByText("일반업무추진비")).toBeVisible();
  });
});
