import type { AnalysisWarning, BudgetLogicalRow, GeneralBusinessExpense } from "./analysisTypes";
import { parseBudgetNumber } from "./normalizeBudgetValue";
import {
  canonicalBudgetLabel,
  findCurrentBudgetColumn,
  findSectionStart,
  isClosingTotal,
  isNonBlankBudgetRow,
  isReliableBudgetRow,
  isSectionHeading,
} from "./parseBudgetSummary";

export type ExpenditureStatementParseResult = {
  expenses: GeneralBusinessExpense[];
  isComplete: boolean;
  warnings: AnalysisWarning[];
};

type HeaderContext = {
  start: number;
  currentColumn: number;
  policyColumn: number;
  unitColumn: number;
  businessColumn: number;
  detailColumn: number;
  costItemColumn: number;
  isReliable: boolean;
};

type SectionSpan = { end: number; hasReliableClosure: boolean };

const hierarchyHeaders = {
  policyColumn: ["정책사업", "정책"],
  unitColumn: ["단위사업", "단위"],
  businessColumn: ["세부사업", "세부"],
  detailColumn: ["세부항목"],
  costItemColumn: ["원가통계비목", "원가통계비목명"],
} as const;

function isHierarchyHeader(value: unknown): boolean {
  const label = canonicalBudgetLabel(value);
  return Object.values(hierarchyHeaders).some((labels) => (labels as readonly string[]).includes(label));
}

function columnInWindow(
  rows: BudgetLogicalRow[],
  sectionStart: number,
  headerIndex: number,
  end: number,
  labels: readonly string[],
): { column: number; row?: BudgetLogicalRow } {
  for (let index = Math.max(sectionStart + 1, headerIndex - 2); index < Math.min(end, headerIndex + 3); index += 1) {
    const column = rows[index].cells.findIndex((cell) => labels.includes(canonicalBudgetLabel(cell)));
    if (column >= 0) return { column, row: rows[index] };
  }
  return { column: -1 };
}

function expenditureSectionSpan(rows: BudgetLogicalRow[], start: number): SectionSpan {
  let activeSheet = rows[start].sourceSheet;
  for (let index = start + 1; index < rows.length; index += 1) {
    if (rows[index].sourceSheet && activeSheet && rows[index].sourceSheet !== activeSheet) {
      return { end: index, hasReliableClosure: true };
    }
    if (!activeSheet && rows[index].sourceSheet) activeSheet = rows[index].sourceSheet;
    if (isClosingTotal(rows[index], "expenditure")) return { end: index + 1, hasReliableClosure: isReliableBudgetRow(rows[index]) };
    if (isSectionHeading(rows[index], "summary") || isSectionHeading(rows[index], "revenue")) {
      return { end: index, hasReliableClosure: isReliableBudgetRow(rows[index]) };
    }
  }
  return { end: rows.length, hasReliableClosure: false };
}

function headerContexts(rows: BudgetLogicalRow[], start: number, end: number): HeaderContext[] {
  const contexts: HeaderContext[] = [];
  for (let index = start + 1; index < end; index += 1) {
    const currentColumn = findCurrentBudgetColumn(rows[index]);
    if (currentColumn < 0) continue;
    const policy = columnInWindow(rows, start, index, end, hierarchyHeaders.policyColumn);
    const unit = columnInWindow(rows, start, index, end, hierarchyHeaders.unitColumn);
    const business = columnInWindow(rows, start, index, end, hierarchyHeaders.businessColumn);
    const detail = columnInWindow(rows, start, index, end, hierarchyHeaders.detailColumn);
    const costItem = columnInWindow(rows, start, index, end, hierarchyHeaders.costItemColumn);
    const context = {
      start: index,
      currentColumn,
      policyColumn: policy.column,
      unitColumn: unit.column,
      businessColumn: business.column,
      detailColumn: detail.column,
      costItemColumn: costItem.column,
      isReliable: [rows[index], policy.row, unit.row, business.row, detail.row, costItem.row].every(isReliableBudgetRow),
    };
    if ([context.policyColumn, context.unitColumn, context.businessColumn, context.detailColumn, context.costItemColumn]
      .every((column) => column >= 0)) contexts.push(context);
  }
  return contexts;
}

function hasParsedData(rows: BudgetLogicalRow[], start: number, end: number, contexts: HeaderContext[]): boolean {
  let contextIndex = -1;
  for (let index = start + 1; index < end; index += 1) {
    while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
    const context = contexts[contextIndex];
    if (!context || index === context.start || isSectionHeading(rows[index], "expenditure") || isClosingTotal(rows[index], "expenditure")) continue;
    if (parseBudgetNumber(rows[index].cells[context.currentColumn]) !== null && !rows[index].cells.some(isHierarchyHeader)) return true;
  }
  return false;
}

function expenseId(row: BudgetLogicalRow, index: number): string {
  const source = row.sourceSheet ?? (row.sourcePage === undefined ? "row" : `page-${row.sourcePage}`);
  return `${source}:${row.sourceRow ?? index + 1}`;
}

export function parseExpenditureStatement(rows: BudgetLogicalRow[]): ExpenditureStatementParseResult {
  const warnings: AnalysisWarning[] = [];
  const start = findSectionStart(rows, "expenditure");
  const span = start < 0 ? { end: -1, hasReliableClosure: false } : expenditureSectionSpan(rows, start);
  const end = span.end;
  const contexts = start < 0 ? [] : headerContexts(rows, start, end);
  const hasUsableHeader = contexts.length > 0;
  const lowConfidenceRows = start < 0 ? [] : rows.slice(start + 1, end)
    .filter((row) => isNonBlankBudgetRow(row) && !isReliableBudgetRow(row));
  const expenses: GeneralBusinessExpense[] = [];
  let contextIndex = -1;
  let policy = "";
  let unit = "";
  let business = "";
  let detail = "";

  if (start >= 0 && hasUsableHeader) {
    for (let index = start + 1; index < end; index += 1) {
      while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
      const context = contexts[contextIndex];
      if (!context || index === context.start || isSectionHeading(rows[index], "expenditure") || isClosingTotal(rows[index], "expenditure")) continue;
      if (rows[index].cells.some(isHierarchyHeader)) continue;

      const nextPolicy = canonicalBudgetLabel(rows[index].cells[context.policyColumn]);
      const nextUnit = canonicalBudgetLabel(rows[index].cells[context.unitColumn]);
      const nextBusiness = canonicalBudgetLabel(rows[index].cells[context.businessColumn]);
      const nextDetail = canonicalBudgetLabel(rows[index].cells[context.detailColumn]);
      if (nextPolicy && nextPolicy !== policy) {
        policy = nextPolicy;
        unit = "";
        business = "";
        detail = "";
      }
      if (nextUnit && nextUnit !== unit) {
        unit = nextUnit;
        business = "";
        detail = "";
      }
      if (nextBusiness && nextBusiness !== business) {
        business = nextBusiness;
        detail = "";
      }
      if (nextDetail) detail = nextDetail;

      const costItem = canonicalBudgetLabel(rows[index].cells[context.costItemColumn]);
      if (costItem !== "일반업무추진비") continue;
      const amount = parseBudgetNumber(rows[index].cells[context.currentColumn]);
      expenses.push({ id: expenseId(rows[index], index), policy, unit, business, detail, costItem, amount, row: rows[index] });
      if (amount === null) warnings.push({
        code: "GENERAL_BUSINESS_EXPENSE_AMOUNT",
        message: "일반업무추진비 예산액을 확인할 수 없습니다.",
        severity: "error",
        row: rows[index],
      });
    }
  }

  const isComplete = start >= 0
    && isReliableBudgetRow(rows[start])
    && hasUsableHeader
    && contexts.every((context) => context.isReliable)
    && hasParsedData(rows, start, end, contexts)
    && span.hasReliableClosure
    && lowConfidenceRows.length === 0
    && expenses.every((expense) => isReliableBudgetRow(expense.row));

  if (start < 0) warnings.push({ code: "EXPENDITURE_SECTION", message: "세출예산명세서 구역을 확인할 수 없습니다.", severity: "error" });
  else if (!hasUsableHeader) warnings.push({ code: "EXPENDITURE_CURRENT_COLUMN", message: "세출예산명세서의 계층과 현재 예산액 열을 확인할 수 없습니다.", severity: "error" });
  else if (!isComplete) warnings.push({ code: "EXPENDITURE_SECTION_INCOMPLETE", message: "세출예산명세서의 데이터와 종료 구조를 완전하게 확인할 수 없습니다.", severity: "error" });
  for (const expense of expenses) {
    if (!isReliableBudgetRow(expense.row)) warnings.push({ code: "LOW_CONFIDENCE_EXPENSE", message: "일반업무추진비 행의 신뢰도가 낮아 확인이 필요합니다.", severity: "error", row: expense.row });
  }
  for (const row of lowConfidenceRows) {
    warnings.push({ code: "LOW_CONFIDENCE_EXPENDITURE_ROW", message: "세출예산명세서 본문에 신뢰도가 낮은 행이 있어 확인이 필요합니다.", severity: "error", row });
  }

  return { expenses, isComplete, warnings };
}
