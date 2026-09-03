import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildFoundationWorkbook } from "./buildFoundationWorkbook";
import { parseFoundationCsv } from "./parseFoundationCsv";
import { validateFoundationBudget } from "./validateFoundationBudget";

const samplePath = process.env.MAIN_BUDGET_FOUNDATION_SAMPLE;
const actual = samplePath ? it : it.skip;

describe("실제 K-에듀파인 통합 CSV 회귀 검증", () => {
  actual("행 위치에 의존하지 않고 세입·세출을 읽어 Excel로 변환한다", async () => {
    const buffer = await readFile(samplePath!);
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const document = parseFoundationCsv("통합예산.csv", bytes);
    const validation = validateFoundationBudget(document);

    expect(document.revenueRows.length).toBeGreaterThan(0);
    expect(document.expenseRows.length).toBeGreaterThan(0);
    expect(document.sourceRevenueTotal).toBe(1_010_749);
    expect(document.sourceExpenseTotal).toBe(1_010_749);
    expect(validation.canExport).toBe(true);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildFoundationWorkbook(document));
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "안내", "세입", "세출(원안)", "세출(조정안)", "업무추진비", "참고자료(통합교부비목록)", "참고자료(개별운영비목록)",
    ]);
  });
});
