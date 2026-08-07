import * as XLSX from "xlsx";
import type { ClosingSource, ExpenseRow, IncomeRow } from "./types";

export class ClosingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClosingParseError";
  }
}

type CellMatch = { row: number; col: number; value: unknown };

const asText = (value: unknown) => String(value ?? "").replace(/\r?\n/g, " ").trim();
const INTEGER_MONEY = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)$/;

function parseMoneyCell(value: unknown, context: string): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new ClosingParseError(`${context} 금액이 올바르지 않습니다.`);
  }
  const text = String(value).trim();
  if (!INTEGER_MONEY.test(text)) {
    throw new ClosingParseError(`${context} 금액 '${text}'을 숫자로 읽을 수 없습니다.`);
  }
  const parsed = Number(text.replace(/,/g, ""));
  if (!Number.isSafeInteger(parsed)) {
    throw new ClosingParseError(`${context} 금액이 처리 가능한 범위를 벗어났습니다.`);
  }
  return parsed;
}

function requiredMoney(value: unknown, context: string) {
  const parsed = parseMoneyCell(value, context);
  if (parsed === null) throw new ClosingParseError(`${context} 금액이 비어 있습니다.`);
  return parsed;
}
const ratioOf = (amount: number, total: number) => total === 0
  ? 0
  : Math.round((amount / total) * 1000) / 10;

function valueAt(sheet: XLSX.WorkSheet, row: number, col: number) {
  return sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v;
}

function matches(sheet: XLSX.WorkSheet, predicate: (text: string) => boolean): CellMatch[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const found: CellMatch[] = [];
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const value = valueAt(sheet, row, col);
      if (value !== undefined && predicate(asText(value))) found.push({ row, col, value });
    }
  }
  return found;
}

function firstMatch(sheet: XLSX.WorkSheet, predicate: (text: string) => boolean, error: string) {
  const match = matches(sheet, predicate)[0];
  if (!match) throw new ClosingParseError(error);
  return match;
}

function numberUnder(sheet: XLSX.WorkSheet, label: string, rowsDown = 1, colsRight = 0) {
  const cell = firstMatch(sheet, text => text === label, `${label} 항목을 찾을 수 없습니다.`);
  return requiredMoney(valueAt(sheet, cell.row + rowsDown, cell.col + colsRight), label);
}

function extractSchoolName(sheet: XLSX.WorkSheet) {
  const schoolText = matches(
    sheet,
    text => /학교$/.test(text) && (text.includes("교육청") || /초등학교|중학교|고등학교/.test(text)),
  ).map(match => asText(match.value))[0] ?? "";
  const token = schoolText.split(/\s+/).reverse().find((part: string) => /(?:초등학교|중학교|고등학교|학교)$/.test(part));
  return token ?? schoolText ?? "학교명 확인 필요";
}

function extractIncomeRows(sheet: XLSX.WorkSheet, incomeTotal: number): IncomeRow[] {
  const header = firstMatch(sheet, text => text === "장", "세입 결산내역을 찾을 수 없습니다.");
  const sectionHeader = firstMatch(sheet, text => text === "관", "세입 관 항목을 찾을 수 없습니다.");
  const amountHeader = matches(sheet, text => text === "결산액").find(cell => cell.row === header.row);
  if (!amountHeader) throw new ClosingParseError("세입 결산금액 열을 찾을 수 없습니다.");

  const rows: IncomeRow[] = [];
  let chapter = "";
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let row = header.row + 1; row <= range.e.r; row += 1) {
    const nextChapter = asText(valueAt(sheet, row, header.col));
    if (nextChapter === "합계") break;
    if (nextChapter) chapter = nextChapter;
    const section = asText(valueAt(sheet, row, sectionHeader.col));
    const amountValue = valueAt(sheet, row, amountHeader.col);
    if (!section && (amountValue === undefined || amountValue === null || amountValue === "")) continue;
    if (!section) throw new ClosingParseError(`세입 결산내역 ${row + 1}행의 관 항목이 비어 있습니다.`);
    const amount = requiredMoney(amountValue, `세입 결산내역 ${row + 1}행`);
    rows.push({
      id: `income-${rows.length + 1}`,
      chapter,
      section,
      amount,
      ratio: ratioOf(amount, incomeTotal),
    });
  }
  if (!rows.length) throw new ClosingParseError("세입 결산내역을 읽을 수 없습니다.");
  return rows;
}

function extractExpenseRows(sheet: XLSX.WorkSheet, expenseTotal: number): ExpenseRow[] {
  const header = firstMatch(sheet, text => text === "정책사업", "세출 정책사업을 찾을 수 없습니다.");
  const amountHeader = matches(sheet, text => text === "결산액").find(cell => cell.row === header.row);
  if (!amountHeader) throw new ClosingParseError("세출 결산금액 열을 찾을 수 없습니다.");

  const rows: ExpenseRow[] = [];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  for (let row = header.row + 1; row <= range.e.r; row += 1) {
    const policy = asText(valueAt(sheet, row, header.col));
    if (policy === "합계") break;
    const amountValue = valueAt(sheet, row, amountHeader.col);
    if (!policy && (amountValue === undefined || amountValue === null || amountValue === "")) continue;
    if (!policy) throw new ClosingParseError(`세출 결산내역 ${row + 1}행의 정책사업이 비어 있습니다.`);
    const amount = requiredMoney(amountValue, `세출 결산내역 ${row + 1}행`);
    rows.push({
      id: `expense-${rows.length + 1}`,
      policy,
      amount,
      ratio: ratioOf(amount, expenseTotal),
    });
  }
  if (!rows.length) throw new ClosingParseError("세출 결산내역을 읽을 수 없습니다.");
  return rows;
}

export function parseClosingWorkbook(data: ArrayBuffer): ClosingSource {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array" });
  } catch {
    throw new ClosingParseError("파일이 손상되었거나 지원하지 않는 엑셀 형식입니다.");
  }
  const sheetName = workbook.SheetNames.find(name => name.includes("세입세출결산총괄표"));
  if (!sheetName) throw new ClosingParseError("에듀파인 세입세출결산총괄표가 아닙니다.");
  const sheet = workbook.Sheets[sheetName];
  const title = firstMatch(
    sheet,
    text => /\d{4}년도 학교회계 결산총괄표/.test(text),
    "에듀파인 세입세출결산총괄표가 아닙니다.",
  );
  const fiscalYear = Number(asText(title.value).match(/\d{4}/)?.[0]);
  if (!fiscalYear) throw new ClosingParseError("결산 학년도를 읽을 수 없습니다.");

  const netHeader = firstMatch(sheet, text => text === "순세계잉여금", "순세계잉여금 항목을 찾을 수 없습니다.");
  const subsidyHeader = firstMatch(sheet, text => text.includes("보조금반환"), "보조금반환 항목을 찾을 수 없습니다.");
  const incomeTotal = numberUnder(sheet, "세입결산액(A)");
  const expenseTotal = numberUnder(sheet, "세출결산액(B)");

  return {
    fiscalYear,
    schoolName: extractSchoolName(sheet),
    budget: numberUnder(sheet, "예산액"),
    currentBudget: numberUnder(sheet, "예산현액"),
    incomeTotal,
    expenseTotal,
    surplus: numberUnder(sheet, "세계잉여금(A-B)"),
    carryovers: {
      specified: numberUnder(sheet, "명시"),
      accident: numberUnder(sheet, "사고"),
      continuing: numberUnder(sheet, "계속비"),
    },
    subsidyReturn: requiredMoney(valueAt(sheet, subsidyHeader.row + 2, subsidyHeader.col), "보조금반환 확정액"),
    priorTransfer: requiredMoney(valueAt(sheet, netHeader.row + 2, netHeader.col), "결산전 이입"),
    afterTransfer: requiredMoney(valueAt(sheet, netHeader.row + 2, netHeader.col + 1), "결산 후 이월"),
    netSurplus: requiredMoney(valueAt(sheet, netHeader.row + 2, netHeader.col + 3), "순세계잉여금"),
    incomeRows: extractIncomeRows(sheet, incomeTotal),
    expenseRows: extractExpenseRows(sheet, expenseTotal),
  };
}
