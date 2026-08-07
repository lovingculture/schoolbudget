import ExcelJS from "exceljs";
import type { BudgetAgendaDraft } from "./types";

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const thin = { style: "thin" as const, color: { argb: "FF000000" } };
const borders = { top: thin, left: thin, bottom: thin, right: thin };

function styleTable(sheet: ExcelJS.Worksheet, start: number, end: number, columns = 5) {
  for (let row = start; row <= end; row += 1) {
    for (let col = 1; col <= columns; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.border = borders;
      cell.alignment = { horizontal: col === 1 ? "center" : "right", vertical: "middle", wrapText: true };
      if (row === start) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE5F3" } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      }
      if (col > 1 && typeof cell.value === "number") cell.numFmt = "#,##0";
    }
  }
}

export async function exportBudgetAgendaExcel(draft: BudgetAgendaDraft): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const input = workbook.addWorksheet("입력", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  input.columns = [{ width: 20 }, { width: 28 }, { width: 20 }, { width: 28 }, { width: 16 }, { width: 24 }];
  input.mergeCells("A1:F1"); input.getCell("A1").value = draft.title; input.getCell("A1").font = { bold: true, size: 18 }; input.getCell("A1").alignment = { horizontal: "center" };
  input.addRows([
    [], ["안건번호", draft.agendaNumber, "제안연월일", draft.proposalDate],
    ["제안자", draft.proposer, "제안설명자", draft.presenter],
    ["제안이유", draft.reason], ["근거", draft.basis], ["주요내용 1", draft.majorContents[0]], ["주요내용 2", draft.majorContents[1]],
    ["총 규모", "금액"], [draft.revisedBudgetLabel, draft.revisedBudget], [draft.previousBudgetLabel, draft.previousBudget],
    ["비교증감액", draft.changeAmount], ["증감률(%)", draft.changeRate],
  ]);
  ["B10", "B11", "B12"].forEach(address => { input.getCell(address).numFmt = "#,##0"; });
  input.getCell("B13").numFmt = "0.0";
  ["B5", "B6", "B7", "B8"].forEach(address => { input.getCell(address).font = { ...input.getCell(address).font, size: 12 }; });
  input.getColumn(1).font = { bold: true };
  input.views = [{ state: "frozen", ySplit: 2 }];

  let rowIndex = 15;
  input.getCell(rowIndex, 1).value = "세입예산"; input.getCell(rowIndex, 1).font = { bold: true, size: 14 }; rowIndex += 1;
  input.addRow(["장", "관", "금회", "누계", "구성비(%)", "비고"]);
  const incomeStart = rowIndex;
  draft.incomeRows.forEach(item => input.addRow([item.chapter, item.section, item.current, item.cumulative, item.ratio, item.note]));
  styleTable(input, incomeStart, incomeStart + draft.incomeRows.length, 6);
  rowIndex = input.rowCount + 2;
  input.getCell(rowIndex, 1).value = "세출예산"; input.getCell(rowIndex, 1).font = { bold: true, size: 14 }; rowIndex += 1;
  input.addRow(["정책사업", "금회", "누계", "구성비(%)", "비고"]);
  const expenseStart = rowIndex;
  draft.expenseRows.forEach(item => input.addRow([item.policy, item.current, item.cumulative, item.ratio, item.note]));
  styleTable(input, expenseStart, expenseStart + draft.expenseRows.length, 5);

  const agenda = workbook.addWorksheet("안건설명서", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 2, margins: { left: 0.45, right: 0.45, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } } });
  agenda.columns = [{ width: 24 }, { width: 20 }, { width: 20 }, { width: 18 }, { width: 18 }];
  agenda.mergeCells("A1:E2"); agenda.getCell("A1").value = draft.title; agenda.getCell("A1").font = { bold: true, size: 18, name: "휴먼명조" }; agenda.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  agenda.addRows([
    [], ["안건번호", draft.agendaNumber, "제안년월일", draft.proposalDate, ""],
    ["제안자", draft.proposer, "제안설명자", draft.presenter, ""],
    [], ["1. 제안이유"], [draft.reason], ["2. 근거"], [draft.basis],
    ["3. 주요내용"], ["가. 총 규모 (단위 : 천원)"],
    ["구분", draft.revisedBudgetLabel, draft.previousBudgetLabel, "증감액(B-A)", "증감률(%)"],
    ["예산액", draft.revisedBudget, draft.previousBudget, draft.changeAmount, draft.changeRate],
    ["나. 세입예산 (단위 : 천원)"], ["구분", "금회", "누계(B)", "구성비(%)", "비고"],
  ]);
  let agendaRow = agenda.rowCount;
  draft.incomeRows.forEach(item => agenda.addRow([item.section, item.current, item.cumulative, item.ratio, item.note]));
  agenda.addRow(["계", draft.changeAmount, draft.revisedBudget, 100, ""]);
  styleTable(agenda, agendaRow, agenda.rowCount, 5);
  agenda.addRow([]); agenda.addRow(["다. 세출예산 (단위 : 천원)"]); agenda.addRow(["정책사업", "금회", "누계", "구성비(%)", "비고"]);
  agendaRow = agenda.rowCount;
  draft.expenseRows.forEach(item => agenda.addRow([item.policy, item.current, item.cumulative, item.ratio, item.note]));
  agenda.addRow(["계", draft.changeAmount, draft.revisedBudget, 100, ""]);
  styleTable(agenda, agendaRow, agenda.rowCount, 5);
  agenda.addRow([]); agenda.addRow([`라. ${draft.contentTitle}`]);
  draft.majorContents.forEach((content, index) => agenda.addRow([`${index + 1}) ${content}`]));
  const twelvePointValues = new Set([
    draft.reason,
    draft.basis,
    `라. ${draft.contentTitle}`,
    ...draft.majorContents.map((content, index) => `${index + 1}) ${content}`),
  ]);
  agenda.getColumn(1).eachCell(cell => {
    if (typeof cell.value === "string" && twelvePointValues.has(cell.value)) cell.font = { ...cell.font, size: 12 };
  });
  agenda.getColumn(1).alignment = { wrapText: true, vertical: "middle" };
  agenda.pageSetup.printArea = `A1:E${agenda.rowCount}`;

  const output = await workbook.xlsx.writeBuffer();
  return new Blob([output], { type: MIME });
}
