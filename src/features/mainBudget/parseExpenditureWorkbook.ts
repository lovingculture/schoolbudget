import * as XLSX from "xlsx";
import { calculateBudgetExpression } from "./calculateExpression";
import type { MainBudgetExpenditureRow, ParsedExpenditureFile } from "./types";

const HEADERS = ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감"] as const;

export class ExpenditureParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpenditureParseError";
  }
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(/,/g, "").replace(/원$/u, "");
  if (!normalized || /^#/.test(normalized)) return undefined;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function fileBytes(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function findTable(workbook: XLSX.WorkBook): { sheetName: string; rows: unknown[][]; headerIndex: number; indexes: number[] } | undefined {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
    for (let headerIndex = 0; headerIndex < Math.min(rows.length, 50); headerIndex += 1) {
      const normalized = rows[headerIndex].map(text);
      const indexes = HEADERS.map((header) => normalized.indexOf(header));
      if (indexes.every((index) => index >= 0)) return { sheetName, rows, headerIndex, indexes };
    }
  }
  return undefined;
}

export async function parseExpenditureWorkbook(file: File): Promise<ParsedExpenditureFile> {
  let workbook: XLSX.WorkBook;
  try {
    const bytes = await fileBytes(file);
    if (bytes.byteLength === 0) throw new Error("empty");
    workbook = XLSX.read(bytes, { type: "array", cellFormula: true, cellDates: true });
  } catch {
    throw new ExpenditureParseError(`${file.name}: 손상되었거나 지원하지 않는 엑셀 파일입니다.`);
  }

  const table = findTable(workbook);
  if (!table) {
    throw new ExpenditureParseError(`${file.name}: 세출예산서식의 필수 열 11개를 찾을 수 없습니다.`);
  }

  const rows: MainBudgetExpenditureRow[] = [];
  for (let rowIndex = table.headerIndex + 1; rowIndex < table.rows.length; rowIndex += 1) {
    const values = table.indexes.map((index) => table.rows[rowIndex][index]);
    if (values.every((value) => text(value) === "")) continue;
    const expression = text(values[5]);
    const calculated = calculateBudgetExpression(expression);
    const priorRequestedAmount = numberValue(values[9]);
    const requestedAmount = calculated.ok ? calculated.value : undefined;
    rows.push({
      id: `${file.name}:${table.sheetName}:${rowIndex + 1}`,
      sourceFile: file.name,
      sourceSheet: table.sheetName,
      sourceRow: rowIndex + 1,
      department: text(values[0]), business: text(values[1]), detail: text(values[2]),
      costCategory: text(values[3]), description: text(values[4]), expression,
      originalRequestedAmount: numberValue(values[6]), requestedAmount,
      manager: text(values[7]), priorExpression: text(values[8]), priorRequestedAmount,
      originalVariance: numberValue(values[10]),
      variance: requestedAmount !== undefined ? requestedAmount - (priorRequestedAmount ?? 0) : undefined,
      issues: [],
    });
  }

  return {
    fileName: file.name,
    sheetName: table.sheetName,
    rows,
    originalTotal: rows.reduce((sum, row) => sum + (row.originalRequestedAmount ?? 0), 0),
    warnings: rows.length ? [] : ["입력 자료 없음"],
  };
}
