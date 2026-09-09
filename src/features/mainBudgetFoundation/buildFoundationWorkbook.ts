import ExcelJS from "exceljs";
import { classifyRevenue, selectBusinessExpenses } from "./classifyFoundationRows";
import { INDIVIDUAL_OPERATING_BUSINESSES, INTEGRATED_GRANT_BUSINESSES } from "./referenceData";
import type { FoundationBudgetDocument } from "./types";
import { validateFoundationBudget } from "./validateFoundationBudget";
import { revenueCalculationLines } from "./revenueCalculationLines";

const BODY_FONT: Partial<ExcelJS.Font> = { name: "맑은 고딕", size: 10 };
const TITLE_FONT: Partial<ExcelJS.Font> = { name: "맑은 고딕", size: 16, bold: true, color: { argb: "FF173D57" } };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E7F0" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E3E5" } };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF9CA3AF" } }, left: { style: "thin", color: { argb: "FF9CA3AF" } },
  bottom: { style: "thin", color: { argb: "FF9CA3AF" } }, right: { style: "thin", color: { argb: "FF9CA3AF" } },
};

function baseSheet(workbook: ExcelJS.Workbook, name: string, title: string, width: number): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: name === "안내" ? 0 : 10 }] });
  sheet.properties.defaultRowHeight = 20;
  sheet.mergeCells(1, 1, 1, width);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = TITLE_FONT;
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  sheet.eachRow((row) => row.eachCell((cell) => { cell.font = { ...BODY_FONT, ...cell.font }; }));
  return sheet;
}

function styleHeader(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.font = { ...BODY_FONT, bold: true, color: { argb: "FF173D57" } };
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  row.height = 30;
}

function styleData(sheet: ExcelJS.Worksheet, first: number, last: number, numericColumns: number[]): void {
  if (last < first) return;
  for (let rowNumber = first; rowNumber <= last; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.font = BODY_FONT;
      cell.border = BORDER;
      cell.alignment = { vertical: "middle", horizontal: numericColumns.includes(column) ? "right" : "left", wrapText: true };
      if (numericColumns.includes(column)) cell.numFmt = "#,##0;[Red]-#,##0";
    });
  }
}

function addGuide(workbook: ExcelJS.Workbook, document: FoundationBudgetDocument): void {
  const sheet = baseSheet(workbook, "안내", "본예산 편성 기초자료", 6);
  sheet.columns = [{ width: 18 }, { width: 24 }, { width: 18 }, { width: 24 }, { width: 18 }, { width: 42 }];
  sheet.addRow([]);
  sheet.addRow(["원본 파일", document.fileName, "회계연도", document.fiscalYear, "예산구분", document.budgetType]);
  sheet.addRow(["세입합계", document.sourceRevenueTotal, "세출합계", document.sourceExpenseTotal, "차액", document.sourceRevenueTotal - document.sourceExpenseTotal]);
  sheet.addRow([]);
  sheet.addRow(["사용 방법"]);
  sheet.addRow(["1. 세입·세출 및 업무추진비 시트의 자동 변환 내용을 확인합니다."]);
  sheet.addRow(["2. 조정안 시트의 조정금액을 입력하면 증감금액을 확인할 수 있습니다."]);
  sheet.addRow(["3. 노란색 또는 '확인' 표시가 있는 분류는 원본과 대조해 수정합니다."]);
  styleHeader(sheet.getRow(3));
  styleData(sheet, 4, 4, [2, 4, 6]);
}

function addRevenue(workbook: ExcelJS.Workbook, document: FoundationBudgetDocument): void {
  const outputRows = document.revenueRows.flatMap((row) => revenueCalculationLines(row).map((line) => ({ row, line })));
  const last = 11 + outputRows.length;
  const sheet = baseSheet(workbook, "세입", `${document.fiscalYear}학년도 세입 편성 기초자료`, 12);
  sheet.columns = [16, 22, 24, 24, 24, 28, 32, 16, 42, 18, 12, 16].map((width) => ({ width }));
  sheet.getRow(4).values = ["세입 예산액", { formula: `SUM(H12:H${last})` }, "세출 요구액", { formula: `SUM('세출(원안)'!G11:G${10 + document.expenseRows.length})` }, "세입-세출 차액", { formula: "B4-D4" }];
  sheet.getRow(5).values = ["공통경상운영비", { formula: `SUMIF(K12:K${last},"공",H12:H${last})` }, "업무추진비 요구예산", { formula: `SUM('업무추진비'!G3:G${2 + Math.max(1, selectBusinessExpenses(document.expenseRows).length)})` }];
  sheet.getRow(6).values = ["통합교부비", { formula: `SUMIF(K12:K${last},"통",H12:H${last})` }, "업무추진비 편성한도", { formula: "SUM(B5:B7)*3%" }, "업무추진비 조정필요액", { formula: "D6-D5" }];
  sheet.getRow(7).values = ["일반(사용료+수수료등)", { formula: `SUMIF(K12:K${last},"일",H12:H${last})` }];
  sheet.getRow(8).values = ["수익자부담경비(세입)", { formula: `SUMIF(K12:K${last},"수",H12:H${last})` }, "수익자부담경비(세출)", 0];
  for (let rowNumber = 4; rowNumber <= 8; rowNumber += 1) styleData(sheet, rowNumber, rowNumber, [2, 4, 6]);
  sheet.getRow(11).values = ["장", "관", "항", "목", "원가통계비목", "산출내역", "산출식", "예산액", "전년도 산출식", "전년도 예산", "예산성격", "비고"];
  styleHeader(sheet.getRow(11));
  outputRows.forEach(({ row, line }, index) => {
    const detail = line.basis.split(":", 1)[0].trim() || row.costItem;
    sheet.getRow(12 + index).values = [row.chapter, row.division, row.section, row.item, row.costItem, detail, null, null, line.basis, line.amount, classifyRevenue(row), ""];
  });
  styleData(sheet, 12, last, [7, 8, 10]);
  const total = last + 1;
  sheet.getRow(total).values = ["합계", "", "", "", "", "", "", { formula: `SUM(H12:H${last})` }, "전년도 합계", { formula: `SUM(J12:J${last})` }, "", ""];
  sheet.mergeCells(total, 1, total, 7);
  sheet.getRow(total).fill = TOTAL_FILL;
  styleData(sheet, total, total, [8, 10]);
  sheet.autoFilter = { from: "A11", to: `L${last}` };
}

function addOriginalExpense(workbook: ExcelJS.Workbook, document: FoundationBudgetDocument): void {
  const sheet = baseSheet(workbook, "세출(원안)", `${document.fiscalYear}학년도 세출 원안`, 12);
  sheet.columns = [16, 22, 24, 24, 42, 28, 16, 16, 28, 16, 16, 18].map((width) => ({ width }));
  sheet.getRow(5).values = ["", "", "", "", "", "요구금액 합계", { formula: `SUM(G11:G${10 + document.expenseRows.length})` }, "", "전년요구금액 합계", { formula: `SUM(J11:J${10 + document.expenseRows.length})` }];
  sheet.getRow(10).values = ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감", "비고"];
  styleHeader(sheet.getRow(10));
  document.expenseRows.forEach((row, index) => {
    const rowNumber = 11 + index;
    sheet.getRow(rowNumber).values = [row.department, row.business, row.detail, row.costItem, row.calculationBasis, row.calculationAmount, row.currentAmount, row.manager, "", row.priorAmount, { formula: `G${rowNumber}-J${rowNumber}` }, ""];
  });
  const last = 10 + document.expenseRows.length;
  styleData(sheet, 11, last, [6, 7, 10, 11]);
  const total = last + 1;
  sheet.getRow(total).values = ["", "", "", "", "", "합계", { formula: `SUM(G11:G${last})` }, "", "전년합계", { formula: `SUM(J11:J${last})` }, { formula: `SUM(K11:K${last})` }, ""];
  sheet.getRow(total).fill = TOTAL_FILL;
  styleData(sheet, total, total, [7, 10, 11]);
  sheet.autoFilter = { from: "A10", to: `L${last}` };
}

function addAdjustedExpense(workbook: ExcelJS.Workbook, document: FoundationBudgetDocument): void {
  const sheet = baseSheet(workbook, "세출(조정안)", `${document.fiscalYear}학년도 세출 조정안`, 10);
  sheet.columns = [16, 22, 24, 24, 42, 28, 16, 16, 18, 18].map((width) => ({ width }));
  sheet.getRow(2).values = ["제출부서", "세부사업", "세부항목", "원가통계비목", "산출내역", "산출식", "요구금액(A)", "조정금액(B)", "증감금액(B-A)", "전년도 대비 증감액"];
  styleHeader(sheet.getRow(2));
  document.expenseRows.forEach((row, index) => {
    const rowNumber = 3 + index;
    sheet.getRow(rowNumber).values = [row.department, row.business, row.detail, row.costItem, row.calculationBasis, row.calculationAmount, row.currentAmount, row.currentAmount, { formula: `H${rowNumber}-G${rowNumber}` }, { formula: `H${rowNumber}-${row.priorAmount}` }];
  });
  styleData(sheet, 3, 2 + document.expenseRows.length, [6, 7, 8, 9, 10]);
  sheet.views = [{ state: "frozen", ySplit: 2 }];
  sheet.autoFilter = { from: "A2", to: `J${2 + document.expenseRows.length}` };
}

function addBusinessExpenses(workbook: ExcelJS.Workbook, document: FoundationBudgetDocument): void {
  const rows = selectBusinessExpenses(document.expenseRows);
  const sheet = baseSheet(workbook, "업무추진비", `${document.fiscalYear}학년도 업무추진비 편성 현황`, 11);
  sheet.columns = [16, 22, 24, 24, 42, 28, 16, 16, 16, 18, 16].map((width) => ({ width }));
  sheet.getRow(2).values = ["제출부서", "세부사업", "세부항목", "원가통계비목", "산출내역", "산출식", "요구금액(A)", "조정금액(B)", "조정금액(최종)", "증감금액(B-A)", "전년도예산"];
  styleHeader(sheet.getRow(2));
  rows.forEach((row, index) => {
    const rowNumber = 3 + index;
    sheet.getRow(rowNumber).values = [row.department, row.business, row.detail, row.costItem, row.calculationBasis, row.calculationAmount, row.currentAmount, row.currentAmount, { formula: `H${rowNumber}` }, { formula: `H${rowNumber}-G${rowNumber}` }, row.priorAmount];
  });
  styleData(sheet, 3, 2 + rows.length, [6, 7, 8, 9, 10, 11]);
  sheet.views = [{ state: "frozen", ySplit: 2 }];
  if (rows.length) sheet.autoFilter = { from: "A2", to: `K${2 + rows.length}` };
}

function addReferenceSheets(workbook: ExcelJS.Workbook): void {
  const integrated = baseSheet(workbook, "참고자료(통합교부비목록)", "통합교부비 사업 목록", 2);
  integrated.columns = [{ width: 10 }, { width: 52 }];
  integrated.getRow(3).values = ["연번", "사업명"];
  styleHeader(integrated.getRow(3));
  INTEGRATED_GRANT_BUSINESSES.forEach((name, index) => integrated.addRow([index + 1, name]));
  styleData(integrated, 4, 3 + INTEGRATED_GRANT_BUSINESSES.length, [1]);

  const individual = baseSheet(workbook, "참고자료(개별운영비목록)", "개별운영비 사업 목록", 2);
  individual.columns = [{ width: 10 }, { width: 52 }];
  individual.getRow(3).values = ["연번", "사업명"];
  styleHeader(individual.getRow(3));
  INDIVIDUAL_OPERATING_BUSINESSES.forEach((name, index) => individual.addRow([index + 1, name]));
  styleData(individual, 4, 3 + INDIVIDUAL_OPERATING_BUSINESSES.length, [1]);
}

export async function buildFoundationWorkbook(document: FoundationBudgetDocument): Promise<Uint8Array> {
  const validation = validateFoundationBudget(document);
  if (!validation.canExport) throw new Error("합계 검증을 통과하지 못해 Excel을 만들 수 없습니다.");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "학교예산 한눈에";
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  addGuide(workbook, document);
  addRevenue(workbook, document);
  addOriginalExpense(workbook, document);
  addAdjustedExpense(workbook, document);
  addBusinessExpenses(workbook, document);
  addReferenceSheets(workbook);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
