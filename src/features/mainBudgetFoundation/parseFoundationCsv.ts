import { decodeBudgetCsv } from "./decodeCsv";
import { parseCsvRecords } from "./parseCsvRecords";
import type {
  FoundationBudgetDocument,
  FoundationExpenseRow,
  FoundationRevenueRow,
  FoundationSection,
} from "./types";

const clean = (value = "") => value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
const label = (value = "") => clean(value).replace(/^\d+\.\s*/, "");

function amount(value = ""): number {
  const normalized = value.replace(/[,원\s]/g, "");
  if (!normalized || normalized === "-") return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalAmount(value = ""): number | null {
  const normalized = value.replace(/[,원\s]/g, "");
  if (!normalized || normalized === "-") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowText(row: string[]): string {
  return row.map(clean).join(" ");
}

function isRepeatedHeader(row: string[]): boolean {
  const text = rowText(row).replace(/\s/g, "");
  return text.includes("예산구분")
    || text.startsWith("과목예산액")
    || text.startsWith("사업예산액")
    || (text.includes("원가통계비목") && (text.includes("장관항목") || text.includes("정책단위세부")));
}

function appendCalculation<T extends FoundationRevenueRow | FoundationExpenseRow>(target: T | undefined, row: string[]): void {
  if (!target || !clean(row[8])) return;
  target.calculationBasis = [target.calculationBasis, clean(row[8])].filter(Boolean).join("\n");
  const next = optionalAmount(row[9]);
  if (next !== null) target.calculationAmount = (target.calculationAmount ?? 0) + next;
}

export function parseFoundationCsv(fileName: string, bytes: ArrayBuffer): FoundationBudgetDocument {
  const decoded = decodeBudgetCsv(bytes);
  const records = parseCsvRecords(decoded.text);
  const revenueRows: FoundationRevenueRow[] = [];
  const expenseRows: FoundationExpenseRow[] = [];
  const revenueHierarchy = ["", "", "", "", ""];
  const expenseHierarchy = ["", "", "", "", ""];
  let section: FoundationSection | null = null;
  let sawRevenue = false;
  let sawExpense = false;
  let sourceRevenueTotal: number | null = null;
  let sourceExpenseTotal: number | null = null;
  let fiscalYear = 0;
  let budgetType = "";
  let lastRevenue: FoundationRevenueRow | undefined;
  let lastExpense: FoundationExpenseRow | undefined;

  records.forEach((row, recordIndex) => {
    const text = rowText(row);
    const year = text.match(/(20\d{2})학년도/);
    if (year && fiscalYear === 0) fiscalYear = Number(year[1]);
    if (text.includes("예산구분")) {
      const match = text.match(/예산구분\s*:?\s*(본예산|추경예산|성립전예산)/);
      if (match && !budgetType) budgetType = match[1];
    }
    if (text.includes("세입예산명세서")) {
      section = "revenue";
      sawRevenue = true;
      return;
    }
    if (text.includes("세출예산명세서")) {
      section = "expense";
      sawExpense = true;
      return;
    }
    if (clean(row[0]) === "세입합계") {
      sourceRevenueTotal = amount(row[1]);
      return;
    }
    if (clean(row[0]) === "세출합계") {
      sourceExpenseTotal = amount(row[1]);
      return;
    }
    if (!section || isRepeatedHeader(row)) return;

    const hierarchy = section === "revenue" ? revenueHierarchy : expenseHierarchy;
    let deepest = -1;
    for (let index = 0; index < 5; index += 1) {
      if (clean(row[index])) {
        hierarchy[index] = label(row[index]);
        deepest = index;
        for (let child = index + 1; child < 5; child += 1) hierarchy[child] = "";
      }
    }

    if (deepest !== 4) {
      if (section === "revenue") appendCalculation(lastRevenue, row);
      else appendCalculation(lastExpense, row);
      return;
    }

    const source = { line: recordIndex + 1, raw: row.join(",") };
    if (section === "revenue") {
      lastRevenue = {
        chapter: hierarchy[0], division: hierarchy[1], section: hierarchy[2], item: hierarchy[3], costItem: hierarchy[4],
        currentAmount: amount(row[5]), priorAmount: amount(row[6]), changeAmount: amount(row[7]),
        calculationBasis: clean(row[8]), calculationAmount: optionalAmount(row[9]), source,
      };
      revenueRows.push(lastRevenue);
    } else {
      lastExpense = {
        policy: hierarchy[0], unit: hierarchy[1], business: hierarchy[2], detail: hierarchy[3], costItem: hierarchy[4],
        currentAmount: amount(row[5]), priorAmount: amount(row[6]), changeAmount: amount(row[7]),
        calculationBasis: clean(row[8]), calculationAmount: optionalAmount(row[9]), department: "", manager: "", source,
      };
      expenseRows.push(lastExpense);
    }
  });

  if (!sawRevenue || sourceRevenueTotal === null) throw new Error("세입예산명세서 또는 세입합계를 확인할 수 없습니다.");
  if (!sawExpense || sourceExpenseTotal === null) throw new Error("세출예산명세서 또는 세출합계를 확인할 수 없습니다.");
  if (!fiscalYear) throw new Error("회계연도를 확인할 수 없습니다.");
  if (!budgetType) throw new Error("예산구분을 확인할 수 없습니다.");

  return {
    fileName,
    encoding: decoded.encoding,
    fiscalYear,
    budgetType,
    unit: "천원",
    revenueRows,
    expenseRows,
    sourceRevenueTotal,
    sourceExpenseTotal,
    warnings: [],
  };
}
