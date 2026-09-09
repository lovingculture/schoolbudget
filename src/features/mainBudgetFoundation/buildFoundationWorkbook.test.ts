import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildFoundationWorkbook } from "./buildFoundationWorkbook";
import type { FoundationBudgetDocument } from "./types";

const source = { line: 1, raw: "" };
const validDocument: FoundationBudgetDocument = {
  fileName: "sample.csv", encoding: "utf-8", fiscalYear: 2026, budgetType: "본예산", unit: "천원", warnings: [],
  sourceRevenueTotal: 100, sourceExpenseTotal: 100,
  revenueRows: [{ chapter: "자체수입", division: "", section: "", item: "", costItem: "이자수입", currentAmount: 100, priorAmount: 80, changeAmount: 20, calculationBasis: "예금이자", calculationAmount: 100_000, source }],
  expenseRows: [{ policy: "학교일반운영", unit: "학교기관운영", business: "부서기본운영", detail: "교장실운영", costItem: "일반업무추진비", currentAmount: 100, priorAmount: 80, changeAmount: 20, calculationBasis: "협의회비", calculationAmount: 100_000, department: "교무실", manager: "담당자", source }],
};

const multiLineDocument: FoundationBudgetDocument = {
  ...validDocument,
  revenueRows: [{
    ...validDocument.revenueRows[0],
    calculationBasis: "기본운영비 : 667,348,000원 * 1개교 =\n체육관사용료 : 29,660,000원 * 1건 =",
    calculationAmount: 697_008_000,
  }],
};

async function load(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  return workbook;
}

describe("buildFoundationWorkbook", () => {
  it("creates seven approved sheets without a VBA project", async () => {
    const workbook = await load(await buildFoundationWorkbook(validDocument));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "안내", "세입", "세출(원안)", "세출(조정안)", "업무추진비",
      "참고자료(통합교부비목록)", "참고자료(개별운영비목록)",
    ]);
    expect((workbook as ExcelJS.Workbook & { vbaProject?: unknown }).vbaProject).toBeUndefined();
  });

  it("keeps totals, changes and the three-percent limit formula-driven", async () => {
    const workbook = await load(await buildFoundationWorkbook(validDocument));
    const revenue = workbook.getWorksheet("세입")!;
    const original = workbook.getWorksheet("세출(원안)")!;
    expect(revenue.getCell("D6").formula).toBe("SUM(B5:B7)*3%");
    expect(revenue.getCell("H13").formula).toBe("SUM(H12:H12)");
    expect(original.getCell("K11").formula).toBe("G11-J11");
    expect(original.getCell("G12").formula).toBe("SUM(G11:G11)");
    expect(original.getCell("J12").formula).toBe("SUM(J11:J11)");
  });

  it("puts each prior-year revenue calculation on its own row and leaves current-year entry cells blank", async () => {
    const workbook = await load(await buildFoundationWorkbook(multiLineDocument));
    const revenue = workbook.getWorksheet("세입")!;

    expect(revenue.getRow(11).values).toEqual(expect.arrayContaining([
      "산출식", "예산액", "전년도 산출식", "전년도 예산",
    ]));
    expect(revenue.getCell("G12").value).toBeNull();
    expect(revenue.getCell("H12").value).toBeNull();
    expect(revenue.getCell("I12").value).toBe("기본운영비 : 667,348,000원 * 1개교 =");
    expect(revenue.getCell("J12").value).toBe(667_348_000);
    expect(revenue.getCell("I13").value).toBe("체육관사용료 : 29,660,000원 * 1건 =");
    expect(revenue.getCell("J13").value).toBe(29_660_000);
  });
});
