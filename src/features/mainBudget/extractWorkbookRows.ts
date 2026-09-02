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

type MergeAnchorIndex = Map<number, Map<number, XLSX.CellAddress>>;

function mergeAnchorIndex(sheet: XLSX.WorkSheet): MergeAnchorIndex {
  const anchors: MergeAnchorIndex = new Map();
  for (const merge of sheet["!merges"] ?? []) {
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      const rowAnchors = anchors.get(row) ?? new Map<number, XLSX.CellAddress>();
      anchors.set(row, rowAnchors);
      for (let col = merge.s.c; col <= merge.e.c; col += 1) rowAnchors.set(col, merge.s);
    }
  }
  return anchors;
}

function cellAt(sheet: XLSX.WorkSheet, anchors: MergeAnchorIndex, row: number, col: number): XLSX.CellObject | undefined {
  const target = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!isEmptyCell(target)) return target;

  const anchor = anchors.get(row)?.get(col);
  return anchor ? sheet[XLSX.utils.encode_cell(anchor)] : target;
}

function rowsFromSheet(sheet: XLSX.WorkSheet, sheetName: string): BudgetLogicalRow[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const anchors = mergeAnchorIndex(sheet);
  const rows: BudgetLogicalRow[] = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const cells = Array.from(
      { length: range.e.c - range.s.c + 1 },
      (_, index) => normalizedCell(cellAt(sheet, anchors, row, range.s.c + index)),
    );
    if (cells.every((cell) => cell === "")) continue;
    rows.push({ cells, sourceSheet: sheetName, sourceRow: row + 1 });
  }

  return rows;
}

function fileFormat(fileName: string): BudgetSource["format"] {
  if (/\.xls$/i.test(fileName)) return "xls";
  if (/\.xlsx$/i.test(fileName)) return "xlsx";
  throw new Error(`${fileName}: 지원하지 않는 파일 형식입니다. .xls 또는 .xlsx 파일만 지원합니다.`);
}

export async function extractWorkbookRows(file: File): Promise<{ source: BudgetSource; rows: BudgetLogicalRow[] }> {
  const format = fileFormat(file.name);
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const rows = workbook.SheetNames.flatMap((sheetName) => rowsFromSheet(workbook.Sheets[sheetName], sheetName));

  return {
    source: { fileName: file.name, format, sheetCount: workbook.SheetNames.length },
    rows,
  };
}
