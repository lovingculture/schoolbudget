import { describe, expect, it } from "vitest";
import { detailStatementRows2025, detailStatementRows2026 } from "./__fixtures__/detailStatementWorkbook";
import { parseDetailWorkbookIdentity } from "./parseDetailWorkbookIdentity";

describe("parseDetailWorkbookIdentity", () => {
  it("finds both detail sections and accounting year without fixed row positions", () => {
    expect(parseDetailWorkbookIdentity(detailStatementRows2026, "옥정.xls")).toMatchObject({
      identity: { schoolName: "옥정", accountingYear: 2026, budgetType: "본예산" },
      hasRevenueSection: true,
      hasExpenditureSection: true,
    });
    expect(parseDetailWorkbookIdentity(detailStatementRows2025, "옥정2025.xlsx")).toMatchObject({
      identity: { accountingYear: 2025, budgetType: "본예산" },
      hasRevenueSection: true,
      hasExpenditureSection: true,
    });
  });

  it("reports a missing section independently", () => {
    const revenueOnly = detailStatementRows2026.filter((row) => !String(row.cells[0] ?? "").includes("세출"));
    expect(parseDetailWorkbookIdentity(revenueOnly, "옥정.xls")).toMatchObject({
      hasRevenueSection: true,
      hasExpenditureSection: false,
    });
  });
});
