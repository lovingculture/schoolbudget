import * as XLSX from "xlsx";
import type { BudgetLogicalRow, BudgetSource } from "./analysisTypes";
import { normalizeLabel, parseBudgetNumber } from "./normalizeBudgetValue";

function isEmptyCell(cell: XLSX.CellObject | undefined): boolean {
  const value = cell?.v ?? cell?.w;
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function normalizedCell(cell: XLSX.CellObject | undefined): unknown {
  const number = parseBudgetNumber(cell?.v) ?? parseBudgetNumber(cell?.w);
  if (number !== null) return number;
  return normalizeLabel(cell?.v ?? cell?.w);
}

function cellAt(sheet: XLSX.WorkSheet, row: number, col: number): XLSX.CellObject | undefined {
  const target = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!isEmptyCell(target)) return target;

  const merge = sheet["!merges"]?.find(({ s, e }) => row >= s.r && row <= e.r && col >= s.c && col <= e.c);
  return merge ? sheet[XLSX.utils.encode_cell(merge.s)] : target;
}

function rowsFromSheet(sheet: XLSX.WorkSheet, sheetName: string): BudgetLogicalRow[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const rows: BudgetLogicalRow[] = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const cells = Array.from(
      { length: range.e.c - range.s.c + 1 },
      (_, index) => normalizedCell(cellAt(sheet, row, range.s.c + index)),
    );
    if (cells.every((cell) => cell === "")) continue;
    rows.push({ cells, sourceSheet: sheetName, sourceRow: row + 1 });
  }

  return rows;
}

function fileFormat(fileName: string): BudgetSource["format"] {
  return /\.xls$/i.test(fileName) ? "xls" : "xlsx";
}

export async function extractWorkbookRows(file: File): Promise<{ source: BudgetSource; rows: BudgetLogicalRow[] }> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const rows = workbook.SheetNames.flatMap((sheetName) => rowsFromSheet(workbook.Sheets[sheetName], sheetName));

  return {
    source: { fileName: file.name, format: fileFormat(file.name), sheetCount: workbook.SheetNames.length },
    rows,
  };
}
