import ExcelJS from "exceljs";
import type { MainBudgetExpenditureRow, ReviewLevel } from "./types";

const fill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };
const border: Partial<ExcelJS.Borders> = { top: { style: "thin", color: { argb: "FFCBD7DD" } }, bottom: { style: "thin", color: { argb: "FFCBD7DD" } }, left: { style: "thin", color: { argb: "FFCBD7DD" } }, right: { style: "thin", color: { argb: "FFCBD7DD" } } };
const levelLabel: Record<ReviewLevel, string> = { error: "오류", warning: "주의", review: "확인 필요" };

function title(sheet: ExcelJS.Worksheet, lastColumn: string, value: string) {
  sheet.mergeCells(`A1:${lastColumn}1`); sheet.getCell("A1").value = value; sheet.getCell("A1").font = { name: "맑은 고딕", size: 16, bold: true, color: { argb: "FF173F5F" } }; sheet.getCell("A1").alignment = { horizontal: "center" }; sheet.addRow([]);
}
function styleTable(sheet: ExcelJS.Worksheet, headerRow: number, lastColumn: number) {
  sheet.getRow(headerRow).eachCell((cell) => { cell.font = { name: "맑은 고딕", bold: true }; cell.fill = fill; cell.border = border; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; });
  for (let row = headerRow + 1; row <= sheet.rowCount; row += 1) sheet.getRow(row).eachCell({ includeEmpty: true }, (cell) => { cell.font = { name: "맑은 고딕", size: 10 }; cell.border = border; cell.alignment = { vertical: "middle", wrapText: true }; });
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: lastColumn } }; sheet.views = [{ state: "frozen", ySplit: headerRow }];
}

export async function buildExpenditureWorkbook(rows: MainBudgetExpenditureRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook(); workbook.creator = "학교예산 한눈에";
  const integrated = workbook.addWorksheet("세출통합"); title(integrated, "P", "본예산 세출 요구자료 통합본");
  integrated.addRow(["원본파일", "원본시트", "원본행", "부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "원본요구금액", "사업담당자", "전년산출식", "계산요구금액", "전년요구금액", "계산증감", "검토상태"]);
  rows.forEach((row) => integrated.addRow([row.sourceFile, row.sourceSheet, row.sourceRow, row.department, row.business, row.detail, row.costCategory, row.description, row.expression, row.originalRequestedAmount ?? null, row.manager, row.priorExpression, row.requestedAmount ?? null, row.priorRequestedAmount ?? null, row.variance ?? null, row.issues.length ? row.issues.map((item) => levelLabel[item.level]).join(", ") : "정상"]));
  const totalRow = integrated.addRow(["총합계"]); const lastDataRow = Math.max(4, totalRow.number - 1);
  totalRow.getCell(13).value = { formula: `SUM(M4:M${lastDataRow})`, result: rows.reduce((sum, row) => sum + (row.requestedAmount ?? 0), 0) }; totalRow.getCell(14).value = { formula: `SUM(N4:N${lastDataRow})`, result: rows.reduce((sum, row) => sum + (row.priorRequestedAmount ?? 0), 0) }; totalRow.getCell(15).value = { formula: `SUM(O4:O${lastDataRow})`, result: rows.reduce((sum, row) => sum + (row.variance ?? 0), 0) };
  [10,13,14,15].forEach((column) => { integrated.getColumn(column).numFmt = "#,##0"; }); [18,18,10,16,22,22,20,28,20,16,14,20,16,16,16,18].forEach((width, index) => { integrated.getColumn(index + 1).width = width; }); styleTable(integrated, 3, 16);

  const fileSheet = workbook.addWorksheet("파일현황"); title(fileSheet, "D", "파일별 세출 수합 현황"); fileSheet.addRow(["파일명", "인식건수", "계산요구액", "확인필요건수"]);
  const grouped = new Map<string, MainBudgetExpenditureRow[]>(); rows.forEach((row) => grouped.set(row.sourceFile, [...(grouped.get(row.sourceFile) ?? []), row])); grouped.forEach((items, name) => fileSheet.addRow([name, items.length, items.reduce((sum, row) => sum + (row.requestedAmount ?? 0), 0), items.filter((row) => row.issues.length).length])); styleTable(fileSheet, 3, 4); fileSheet.getColumn(3).numFmt = "#,##0"; [30,14,18,16].forEach((width, index) => { fileSheet.getColumn(index + 1).width = width; });

  const review = workbook.addWorksheet("검토결과"); title(review, "I", "본예산 세출 오류검토 보고서"); review.addRow(["수준", "부서", "세부사업", "세부항목", "원본위치", "코드", "문제내용", "판단근거", "권장확인"]);
  rows.forEach((row) => row.issues.forEach((item) => review.addRow([levelLabel[item.level], row.department, row.business, row.detail, `${row.sourceFile} / ${row.sourceSheet} / ${row.sourceRow}행`, item.code, item.message, item.basis, "원본 공문과 부서 요구자료를 확인해 수정하세요."]))); styleTable(review, 3, 9); [12,16,22,22,34,24,34,36,36].forEach((width, index) => { review.getColumn(index + 1).width = width; });
  return workbook;
}

async function download(rows: MainBudgetExpenditureRow[], filename: string) {
  const workbook = await buildExpenditureWorkbook(rows); const bytes = new Uint8Array(await workbook.xlsx.writeBuffer()); const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}
const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
export const downloadIntegratedExpenditures = (rows: MainBudgetExpenditureRow[]) => download(rows, `${stamp()}_본예산_세출통합본.xlsx`);
export const downloadExpenditureReview = (rows: MainBudgetExpenditureRow[]) => download(rows, `${stamp()}_본예산_오류검토보고서.xlsx`);
