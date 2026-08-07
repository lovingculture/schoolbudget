import * as XLSX from "xlsx";
import type { BudgetAgendaSource, BudgetExpenseRow, BudgetIncomeRow } from "./types";

const INVALID_FILE_MESSAGE = "에듀파인 예산현황의 세입세출예산총괄 파일인지 확인해 주세요.";

export class BudgetAgendaParseError extends Error {}

const text = (value: unknown) => String(value ?? "").trim();
const number = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(text(value).replace(/,/g, "").replace(/%/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const numeric = (value: unknown) =>
  typeof value === "number" || /^-?[\d,]+(?:\.\d+)?%?$/.test(text(value));

function grid(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];
}

function findCell(rows: unknown[][], predicate: (value: string) => boolean) {
  for (let row = 0; row < rows.length; row += 1) {
    for (let col = 0; col < (rows[row]?.length ?? 0); col += 1) {
      if (predicate(text(rows[row][col]))) return { row, col };
    }
  }
  return null;
}

function metadata(value: string, label: string) {
  const match = value.match(new RegExp(`${label}\\s*:\\s*([^\\n\\r]+)`));
  return match?.[1]?.trim() ?? "";
}

function parseIncome(rows: unknown[][], headerRow: number): BudgetIncomeRow[] {
  const result: BudgetIncomeRow[] = [];
  let chapter = "";
  for (let row = headerRow + 1; row < rows.length; row += 1) {
    const nextChapter = text(rows[row]?.[0]);
    const section = text(rows[row]?.[1]);
    if (nextChapter === "계" || section === "계") break;
    if (nextChapter) chapter = nextChapter;
    if (!section || !numeric(rows[row]?.[3]) || !numeric(rows[row]?.[4])) continue;
    result.push({
      id: `income-${result.length + 1}`,
      chapter,
      section,
      current: number(rows[row][3]),
      cumulative: number(rows[row][4]),
      ratio: number(rows[row][9]),
      note: "",
    });
  }
  return result;
}

function parseExpense(rows: unknown[][], headerRow: number): BudgetExpenseRow[] {
  const result: BudgetExpenseRow[] = [];
  for (let row = headerRow + 1; row < rows.length; row += 1) {
    const policy = text(rows[row]?.[10]);
    if (policy === "계") break;
    if (!policy || !numeric(rows[row]?.[14]) || !numeric(rows[row]?.[16])) continue;
    result.push({
      id: `expense-${result.length + 1}`,
      policy,
      current: number(rows[row][14]),
      cumulative: number(rows[row][16]),
      ratio: number(rows[row][18]),
      note: "",
    });
  }
  return result;
}

export function parseBudgetAgendaWorkbook(data: ArrayBuffer): BudgetAgendaSource {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data, { type: "array" });
  } catch {
    throw new BudgetAgendaParseError("파일이 손상되었거나 지원하지 않는 엑셀 형식입니다.");
  }

  const entry = workbook.SheetNames
    .map(name => ({ name, sheet: workbook.Sheets[name], rows: grid(workbook.Sheets[name]) }))
    .find(({ rows }) => findCell(rows, value => value.replace(/\s/g, "").includes("세입세출예산총괄")));
  if (!entry) throw new BudgetAgendaParseError(INVALID_FILE_MESSAGE);

  const infoCell = findCell(entry.rows, value => value.includes("회계연도") && value.includes("학교"));
  const budgetHeader = findCell(entry.rows, value => value === "예산구분");
  const incomeHeader = findCell(entry.rows, value => value === "장");
  const expenseHeader = findCell(entry.rows, value => value === "정책사업");
  if (!infoCell || !budgetHeader || !incomeHeader || !expenseHeader) {
    throw new BudgetAgendaParseError(INVALID_FILE_MESSAGE);
  }

  const info = text(entry.rows[infoCell.row][infoCell.col]);
  const fiscalYear = Number(metadata(info, "회계연도"));
  const schoolName = metadata(info, "학\\s*교\\s*명");
  const budgetType = metadata(info, "예산구분") || text(entry.rows[budgetHeader.row + 2]?.[budgetHeader.col]);
  const totalsRow = budgetHeader.row + 2;
  const incomeRows = parseIncome(entry.rows, incomeHeader.row);
  const expenseRows = parseExpense(entry.rows, expenseHeader.row);
  if (!fiscalYear || !schoolName || !budgetType || !incomeRows.length || !expenseRows.length) {
    throw new BudgetAgendaParseError(INVALID_FILE_MESSAGE);
  }

  return {
    fiscalYear,
    schoolName,
    budgetType,
    revisedBudget: number(entry.rows[totalsRow]?.[2]),
    previousBudget: number(entry.rows[totalsRow]?.[5]),
    changeAmount: number(entry.rows[totalsRow]?.[13]),
    changeRate: number(entry.rows[totalsRow]?.[17]),
    incomeRows,
    expenseRows,
  };
}
