import * as XLSX from "xlsx";
import { parseFoundationCsv } from "./parseFoundationCsv";
import type { FoundationBudgetDocument } from "./types";

type ExcelCell = string | number | null;
type Section = "revenue" | "expense";

interface DetectedLayout {
  hierarchy: number[];
  currentAmount: number;
  priorAmount: number;
  changeAmount: number;
  calculationBasis: number;
}

const clean = (value: ExcelCell = "") => String(value ?? "").replace(/\s+/g, "").trim();

function findColumn(row: ExcelCell[], predicate: (value: string) => boolean): number {
  return row.findIndex((cell) => predicate(clean(cell)));
}

function detectLayout(rows: ExcelCell[][], index: number, section: Section): DetectedLayout | null {
  const hierarchyLabels = section === "revenue"
    ? ["장", "관", "항", "목", "원가통계비목"]
    : ["정책", "단위", "세부", "세부항목", "원가통계비목"];
  const hierarchy = hierarchyLabels.map((label) => findColumn(rows[index], (value) => value === label));
  if (hierarchy.some((column) => column < 0)) return null;

  const amountHeader = rows[Math.max(0, index - 1)] ?? [];
  const currentAmount = findColumn(amountHeader, (value) => value === "예산액");
  const priorAmount = findColumn(amountHeader, (value) => value.includes("전년도") && value.includes("예산액"));
  const changeAmount = findColumn(amountHeader, (value) => value.includes("비교") && value.includes("증감"));
  const calculationBasis = findColumn(amountHeader, (value) => value.includes("산출기초"));
  if ([currentAmount, priorAmount, changeAmount, calculationBasis].some((column) => column < 0)) return null;

  return { hierarchy, currentAmount, priorAmount, changeAmount, calculationBasis };
}

function calculationAmount(row: ExcelCell[], afterColumn: number): ExcelCell {
  for (let index = afterColumn + 1; index < row.length; index += 1) {
    const value = clean(row[index]).replace(/[,원]/g, "");
    if (value && value !== "-" && Number.isFinite(Number(value))) return row[index];
  }
  return "";
}

function normalizeEdufineRows(rows: ExcelCell[][]): ExcelCell[][] {
  let section: Section | null = null;
  let layout: DetectedLayout | null = null;

  return rows.map((row, index) => {
    const text = row.map(clean).join(" ");
    if (text.includes("세입예산명세서")) {
      if (section !== "revenue") layout = null;
      section = "revenue";
      return row;
    }
    if (text.includes("세출예산명세서")) {
      if (section !== "expense") layout = null;
      section = "expense";
      return row;
    }
    if (!section) return row;

    const detected = detectLayout(rows, index, section);
    if (detected) {
      layout = detected;
      return section === "revenue"
        ? ["장", "관", "항", "목", "원가통계비목", "예산액", "전년도예산액", "증감", "산출기초", "산출금액"]
        : ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액", "전년도예산액", "증감", "산출기초", "산출금액"];
    }
    if (!layout) return row;

    const totalLabel = section === "revenue" ? "세입합계" : "세출합계";
    if (row.some((cell) => clean(cell) === totalLabel)) return [totalLabel, row[layout.currentAmount] ?? ""];

    return [
      ...layout.hierarchy.map((column) => row[column] ?? ""),
      row[layout.currentAmount] ?? "",
      row[layout.priorAmount] ?? "",
      row[layout.changeAmount] ?? "",
      row[layout.calculationBasis] ?? "",
      calculationAmount(row, layout.calculationBasis),
    ];
  });
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function parseFoundationExcel(buffer: ArrayBuffer, fileName: string): FoundationBudgetDocument {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false, raw: false });
  } catch {
    throw new Error("Excel 파일을 읽을 수 없습니다. .xls 또는 .xlsx 파일인지 확인해 주세요.");
  }

  const combinedRows: string[] = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const rows = XLSX.utils.sheet_to_json<ExcelCell[]>(sheet, { header: 1, defval: "", raw: false });
    const normalizedName = sheetName.replace(/\s/g, "");
    const firstText = rows.slice(0, 8).flat().join(" ").replace(/\s/g, "");
    if (normalizedName.includes("세입") && !firstText.includes("세입예산명세서")) combinedRows.push("세입예산명세서");
    if (normalizedName.includes("세출") && !firstText.includes("세출예산명세서")) combinedRows.push("세출예산명세서");
    normalizeEdufineRows(rows).forEach((row) => combinedRows.push(row.map((cell) => escapeCsv(String(cell ?? ""))).join(",")));
  });

  const bytes = new TextEncoder().encode(combinedRows.join("\r\n"));
  return parseFoundationCsv(fileName, bytes.buffer);
}
