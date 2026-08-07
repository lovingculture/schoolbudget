import ExcelJS from "exceljs";
import { DETAIL_COLUMN_WIDTHS, SUMMARY_COLUMN_WIDTHS } from "./excelLayout";
import { createSupplementaryExcelModel } from "./excelRows";
import type { CalculatedExecutionRow, ExecutionWorkbook } from "./types";

const BODY_FONT: Partial<ExcelJS.Font> = { name: "맑은 고딕", size: 10 };
const TITLE_FONT: Partial<ExcelJS.Font> = { name: "맑은 고딕", size: 16, bold: true, color: { argb: "FF1F4E78" } };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2F0D9" } };
const SUMMARY_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF9EADBA" } },
  left: { style: "thin", color: { argb: "FF9EADBA" } },
  bottom: { style: "thin", color: { argb: "FF9EADBA" } },
  right: { style: "thin", color: { argb: "FF9EADBA" } },
};

const pageSetup: Partial<ExcelJS.PageSetup> = {
  paperSize: 9,
  orientation: "landscape",
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
};

function normalize(value: unknown): ExcelJS.CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value instanceof Date) return value;
  return String(value);
}

function applyTableStyle(
  sheet: ExcelJS.Worksheet,
  headerRow: number,
  firstDataRow: number,
  lastDataRow: number,
  lastColumn: number,
) {
  sheet.getRow(headerRow).height = 42;
  sheet.getRow(headerRow).eachCell({ includeEmpty: true }, cell => {
    cell.font = { ...BODY_FONT, bold: true, color: { argb: "FF17365D" } };
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = 20;
    for (let columnNumber = 1; columnNumber <= lastColumn; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      cell.font = { ...BODY_FONT };
      cell.border = BORDER;
      cell.alignment = columnNumber <= 8
        ? { horizontal: "left", vertical: "middle" }
        : { horizontal: "right", vertical: "middle" };
    }
  }
}

function applyNumberFormats(sheet: ExcelJS.Worksheet, firstRow: number, lastRow: number, rateColumn: number) {
  for (let rowNumber = firstRow; rowNumber <= lastRow; rowNumber += 1) {
    for (let columnNumber = 9; columnNumber <= sheet.columnCount; columnNumber += 1) {
      sheet.getCell(rowNumber, columnNumber).numFmt = columnNumber === rateColumn ? "0.00%" : "#,##0";
    }
  }
}

function styleTitle(sheet: ExcelJS.Worksheet, lastColumnLetter: string, title: string) {
  sheet.mergeCells(`A1:${lastColumnLetter}1`);
  const cell = sheet.getCell("A1");
  cell.value = title;
  cell.font = TITLE_FONT;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;
}

function addOriginalSheet(workbook: ExcelJS.Workbook, source: ExecutionWorkbook) {
  const sheet = workbook.addWorksheet("불러온원본", { views: [{ state: "frozen", ySplit: 3 }] });
  source.originalRows.forEach(values => sheet.addRow(values.map(normalize)));
  const lastColumn = Math.max(1, source.headers.length);
  for (let columnNumber = 1; columnNumber <= lastColumn; columnNumber += 1) sheet.getColumn(columnNumber).width = 20;
  const headerRow = Math.max(1, source.originalRows.findIndex(row => row.some(value => String(value).includes("예산액(4)"))) + 1);
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: lastColumn } };
  applyTableStyle(sheet, headerRow, headerRow + 1, sheet.rowCount, lastColumn);
  sheet.pageSetup = { ...pageSetup };
  sheet.properties.defaultRowHeight = 20;
  sheet.views = [{ state: "frozen", ySplit: headerRow }];
}

function addReviewSheet(workbook: ExcelJS.Workbook, source: ExecutionWorkbook, rows: CalculatedExecutionRow[]) {
  const model = createSupplementaryExcelModel(source, rows).review;
  const sheet = workbook.addWorksheet("추경검토", { views: [{ state: "frozen", ySplit: 7 }] });
  styleTitle(sheet, "O", "추경검토 자료");
  sheet.addRow([]);
  sheet.addRow(["구분", "예산액", "원인행위금액", "지출금액", "집행잔액", "추경(안)"]);
  model.overview.forEach(row => sheet.addRow(row as ExcelJS.CellValue[]));
  sheet.addRow([]);
  sheet.addRow(model.headers as ExcelJS.CellValue[]);
  model.rows.forEach(row => sheet.addRow(row as ExcelJS.CellValue[]));
  sheet.addRow(model.total as ExcelJS.CellValue[]);
  const totalRow = sheet.rowCount;
  for (let rowNumber = 8; rowNumber < totalRow; rowNumber += 1) {
    const result = Number(sheet.getCell(rowNumber, 14).value ?? 0);
    sheet.getCell(rowNumber, 14).value = { formula: `L${rowNumber}-M${rowNumber}`, result };
  }
  for (let columnNumber = 9; columnNumber <= 15; columnNumber += 1) {
    const letter = sheet.getColumn(columnNumber).letter;
    const result = Number(sheet.getCell(totalRow, columnNumber).value ?? 0);
    sheet.getCell(totalRow, columnNumber).value = { formula: `SUM(${letter}8:${letter}${totalRow - 1})`, result };
  }
  sheet.mergeCells(`A${totalRow}:H${totalRow}`);
  sheet.getCell(`A${totalRow}`).value = "총합계";
  DETAIL_COLUMN_WIDTHS.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  applyTableStyle(sheet, 7, 8, totalRow, 15);
  applyNumberFormats(sheet, 8, totalRow, 0);
  for (let rowNumber = 3; rowNumber <= 5; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 6; columnNumber += 1) {
      const cell = sheet.getCell(rowNumber, columnNumber);
      cell.font = { ...BODY_FONT, bold: rowNumber === 3 };
      cell.fill = rowNumber === 3 ? SUMMARY_FILL : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      cell.border = BORDER;
      cell.alignment = columnNumber === 1 ? { horizontal: "center" } : { horizontal: "right" };
      if (rowNumber >= 4 && columnNumber >= 2) cell.numFmt = "#,##0";
    }
  }
  sheet.getRow(totalRow).eachCell({ includeEmpty: true }, cell => { cell.font = { ...BODY_FONT, bold: true }; cell.fill = TOTAL_FILL; cell.border = BORDER; });
  sheet.autoFilter = { from: "A7", to: "O7" };
  sheet.pageSetup = { ...pageSetup, printArea: `A1:O${totalRow}` };
}

function addStatusSheet(workbook: ExcelJS.Workbook, source: ExecutionWorkbook, rows: CalculatedExecutionRow[]) {
  const model = createSupplementaryExcelModel(source, rows).status;
  const sheet = workbook.addWorksheet("정리본", { views: [{ state: "frozen", ySplit: 3 }] });
  styleTitle(sheet, "O", "예산집행현황");
  sheet.addRow([]);
  sheet.addRow(model.headers as ExcelJS.CellValue[]);
  model.rows.forEach(row => sheet.addRow(row as ExcelJS.CellValue[]));
  sheet.addRow(model.total as ExcelJS.CellValue[]);
  const totalRow = sheet.rowCount;
  for (let rowNumber = 4; rowNumber < totalRow; rowNumber += 1) {
    const balance = Number(sheet.getCell(rowNumber, 12).value ?? 0);
    const discrepancy = Number(sheet.getCell(rowNumber, 13).value ?? 0);
    const rate = Number(sheet.getCell(rowNumber, 14).value ?? 0);
    sheet.getCell(rowNumber, 12).value = { formula: `I${rowNumber}-J${rowNumber}`, result: balance };
    sheet.getCell(rowNumber, 13).value = { formula: `J${rowNumber}-K${rowNumber}`, result: discrepancy };
    sheet.getCell(rowNumber, 14).value = { formula: `IFERROR(J${rowNumber}/I${rowNumber},0)`, result: rate };
  }
  for (let columnNumber = 9; columnNumber <= 15; columnNumber += 1) {
    const letter = sheet.getColumn(columnNumber).letter;
    const result = Number(sheet.getCell(totalRow, columnNumber).value ?? 0);
    sheet.getCell(totalRow, columnNumber).value = columnNumber === 14
      ? { formula: `IFERROR(J${totalRow}/I${totalRow},0)`, result }
      : { formula: `SUM(${letter}4:${letter}${totalRow - 1})`, result };
  }
  sheet.mergeCells(`A${totalRow}:H${totalRow}`);
  sheet.getCell(`A${totalRow}`).value = "총합계";
  DETAIL_COLUMN_WIDTHS.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  applyTableStyle(sheet, 3, 4, totalRow, 15);
  applyNumberFormats(sheet, 4, totalRow, 14);
  for (let rowNumber = 4; rowNumber < totalRow; rowNumber += 1) {
    if (Number(sheet.getCell(rowNumber, 12).result ?? 0) < 0) {
      sheet.getCell(rowNumber, 12).font = { ...BODY_FONT, bold: true, color: { argb: "FFFF0000" } };
    }
  }
  sheet.getRow(totalRow).eachCell({ includeEmpty: true }, cell => { cell.font = { ...BODY_FONT, bold: true }; cell.fill = TOTAL_FILL; cell.border = BORDER; });
  sheet.autoFilter = { from: "A3", to: "O3" };
  sheet.pageSetup = { ...pageSetup, printArea: `A1:O${totalRow}` };
}

function addSummarySheet(workbook: ExcelJS.Workbook, source: ExecutionWorkbook, rows: CalculatedExecutionRow[]) {
  const model = createSupplementaryExcelModel(source, rows).summary;
  const sheet = workbook.addWorksheet("단위사업별집계", { views: [{ state: "frozen", ySplit: 3 }] });
  styleTitle(sheet, "F", "단위사업별 집행현황");
  sheet.addRow([]);
  sheet.addRow(model.headers as ExcelJS.CellValue[]);
  model.rows.forEach(row => sheet.addRow(row as ExcelJS.CellValue[]));
  sheet.addRow(model.total as ExcelJS.CellValue[]);
  const totalRow = sheet.rowCount;
  for (let columnNumber = 4; columnNumber <= 5; columnNumber += 1) {
    const letter = sheet.getColumn(columnNumber).letter;
    const result = Number(sheet.getCell(totalRow, columnNumber).value ?? 0);
    sheet.getCell(totalRow, columnNumber).value = { formula: `SUM(${letter}4:${letter}${totalRow - 1})`, result };
  }
  sheet.getCell(totalRow, 6).value = {
    formula: `IFERROR(E${totalRow}/D${totalRow},0)`,
    result: Number((model.total[5] as number) ?? 0),
  };
  sheet.mergeCells(`A${totalRow}:C${totalRow}`);
  sheet.getCell(`A${totalRow}`).value = "총합계";
  SUMMARY_COLUMN_WIDTHS.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  applyTableStyle(sheet, 3, 4, totalRow, 6);
  for (let rowNumber = 4; rowNumber <= totalRow; rowNumber += 1) {
    sheet.getCell(rowNumber, 4).numFmt = "#,##0";
    sheet.getCell(rowNumber, 5).numFmt = "#,##0";
    sheet.getCell(rowNumber, 6).numFmt = "0.00%";
  }
  sheet.getRow(totalRow).eachCell({ includeEmpty: true }, cell => { cell.font = { ...BODY_FONT, bold: true }; cell.fill = TOTAL_FILL; cell.border = BORDER; });
  sheet.autoFilter = { from: "A3", to: "F3" };
  sheet.pageSetup = { ...pageSetup, printArea: `A1:F${totalRow}` };
}

export async function buildSupplementaryWorkbook(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "학교예산 한눈에보기";
  workbook.created = new Date();
  addOriginalSheet(workbook, source);
  addReviewSheet(workbook, source, rows);
  addStatusSheet(workbook, source, rows);
  addSummarySheet(workbook, source, rows);
  return workbook;
}

export async function serializeSupplementaryWorkbook(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): Promise<Uint8Array> {
  const workbook = await buildSupplementaryWorkbook(source, rows);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function downloadSupplementaryWorkbook(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): Promise<void> {
  const bytes = await serializeSupplementaryWorkbook(source, rows);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${source.fiscalYear}_${source.schoolName}_추경검토자료_일반.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
