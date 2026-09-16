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

  it("작성자와 출력 시각이 반복된 머리글에서 실제 학교명을 선택한다", () => {
    const noisyHeading = "신은경 2026년 09월 08일 17시 06분 18초 ".repeat(5)
      + "서울특별시교육청 서울옥정초등학교 ".repeat(3);
    const rows = [
      { cells: [noisyHeading, "2024학년도 세입예산명세서"] },
      ...detailStatementRows2026,
    ];

    expect(parseDetailWorkbookIdentity(rows, "2024.xls").identity).toEqual({
      schoolName: "서울옥정초등학교",
      accountingYear: 2024,
      budgetType: "본예산",
    });
  });
});
