import * as XLSX from "xlsx";
import { parseFoundationCsv } from "./parseFoundationCsv";
import type { FoundationBudgetDocument } from "./types";

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function parseFoundationExcel(buffer: ArrayBuffer, fileName: string): FoundationBudgetDocument {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
  } catch {
    throw new Error("Excel 파일을 읽을 수 없습니다. .xls 또는 .xlsx 파일인지 확인해 주세요.");
  }

  const combinedRows: string[] = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: "", raw: false });
    const normalizedName = sheetName.replace(/\s/g, "");
    const firstText = rows.slice(0, 8).flat().join(" ").replace(/\s/g, "");
    if (normalizedName.includes("세입") && !firstText.includes("세입예산명세서")) combinedRows.push("세입예산명세서");
    if (normalizedName.includes("세출") && !firstText.includes("세출예산명세서")) combinedRows.push("세출예산명세서");
    rows.forEach((row) => combinedRows.push(row.map((cell) => escapeCsv(String(cell ?? ""))).join(",")));
  });

  const bytes = new TextEncoder().encode(combinedRows.join("\r\n"));
  return parseFoundationCsv(fileName, bytes.buffer);
}
