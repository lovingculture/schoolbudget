import * as XLSX from "xlsx";
import type { ExecutionRow, ExecutionWorkbook } from "./types";

const REQUIRED = [
  "회계연도", "집행일자", "학교명", "정책사업", "단위사업", "세부사업", "세부항목",
  "목명", "세목명", "원가통계비목명", "산출내역", "예산액(4)(1+2+3)",
  "원인행위금액(17)", "지출금액(18)",
] as const;

const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export class ExecutionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionParseError";
  }
}

export function parseExecutionWorkbook(data: ArrayBuffer): ExecutionWorkbook {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array", cellDates: false });
  } catch {
    throw new ExecutionParseError("파일을 읽지 못했습니다. 에듀파인 실시간 집행실적 102-2 파일을 넣어주세요.");
  }
  const sourceSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sourceSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  const headerIndex = matrix.findIndex(row => REQUIRED.every(label => row.some(cell => text(cell) === label)));
  if (headerIndex < 0) {
    throw new ExecutionParseError("에듀파인 실시간 집행실적 102-2 파일을 넣어주세요. 필수 항목을 찾을 수 없습니다.");
  }
  const headers = matrix[headerIndex].map(text);
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  const rawRows = matrix.slice(headerIndex + 1).filter(row => text(row[indexes["학교명"]]));
  const rows: ExecutionRow[] = rawRows.map((row, index) => {
    const original = Object.fromEntries(headers.map((header, col) => [header, row[col]]));
    return {
      id: `execution-${index + 1}`,
      policy: text(row[indexes["정책사업"]]),
      unitBusiness: text(row[indexes["단위사업"]]),
      detailBusiness: text(row[indexes["세부사업"]]),
      detailItem: text(row[indexes["세부항목"]]),
      account: text(row[indexes["목명"]]),
      subAccount: text(row[indexes["세목명"]]),
      costCategory: text(row[indexes["원가통계비목명"]]),
      description: text(row[indexes["산출내역"]]),
      budgetAmount: number(row[indexes["예산액(4)(1+2+3)"]]),
      committedAmount: number(row[indexes["원인행위금액(17)"]]),
      paidAmount: number(row[indexes["지출금액(18)"]]),
      original,
    };
  });
  if (!rows.length) throw new ExecutionParseError("102-2 파일에 처리할 집행자료가 없습니다.");
  return {
    fiscalYear: number(rawRows[0][indexes["회계연도"]]),
    executionDate: text(rawRows[0][indexes["집행일자"]]),
    schoolName: text(rawRows[0][indexes["학교명"]]),
    sourceSheetName,
    headers,
    originalRows: matrix,
    rows,
  };
}
