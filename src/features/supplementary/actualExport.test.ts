import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { calculateExecutionRow } from "./calculations";
import { serializeSupplementaryWorkbook } from "./exportExcel";
import { parseExecutionWorkbook } from "./parser";

describe("실제 에듀파인 102-2 Excel 출력", () => {
  it("확정본과 같은 행 수, 합계, 시트 위치를 만든다", async () => {
    const fixture = readFileSync(resolve("../upload/2026집행실적_102-2_20260801180031440.xlsx"));
    const source = parseExecutionWorkbook(Uint8Array.from(fixture).buffer);
    const rows = source.rows.map(row => calculateExecutionRow(row));
    const bytes = await serializeSupplementaryWorkbook(source, rows);

    const outputDir = "/tmp/school-budget-verification";
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(`${outputDir}/2026_서울옥정초등학교_추경검토자료.xlsx`, bytes);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual([
      "불러온원본", "추경검토", "정리본", "단위사업별집계",
    ]);

    const original = workbook.getWorksheet("불러온원본")!;
    const review = workbook.getWorksheet("추경검토")!;
    const status = workbook.getWorksheet("정리본")!;
    const summary = workbook.getWorksheet("단위사업별집계")!;

    expect(original.rowCount).toBe(527);
    expect(status.rowCount).toBe(528);
    expect(review.rowCount).toBe(532);
    expect(summary.rowCount).toBe(42);
    expect(status.getCell("I528").result).toBe(2341568000);
    expect(status.getCell("J528").result).toBe(1311300066);
    expect(status.getCell("K528").result).toBe(1122881466);
    expect(status.getCell("L528").result).toBe(1030267934);
    expect(review.getCell("B4").value).toBe(2341568000);
    expect(review.getCell("B5").value).toBe(22960000);
    expect(review.getCell("C5").value).toBe(8976340);
    expect(summary.getCell("D42").result).toBe(2341568000);
    expect(summary.getCell("E42").result).toBe(1311300066);
  }, 15_000);

});
