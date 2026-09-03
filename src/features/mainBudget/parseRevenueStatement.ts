import type { AnalysisWarning, BudgetLogicalRow, RevenueFact, RevenueFactCollection } from "./analysisTypes";
import { parseBudgetNumber } from "./normalizeBudgetValue";
import {
  cellAtBudgetColumn,
  canonicalBudgetLabel,
  currentBudgetContexts,
  findSectionStart,
  isClosingTotal,
  isNearBudgetLabel,
  isNonBlankBudgetRow,
  isReliableBudgetRow,
  isSectionHeading,
} from "./parseBudgetSummary";

const verificationLabels = ["학교운영비전입금", "사용료", "수수료", "자산매각대", "지난년도수입", "이자수입", "기타행정활동수입", "순세계잉여금"] as const;
const targetLabels = new Set<string>(["목적사업비전입금", "수익자부담수입", ...verificationLabels]);

export type RevenueStatementParseResult = {
  purposeRevenue: RevenueFact;
  beneficiaryRevenue: RevenueFact;
  verificationRevenue: RevenueFactCollection;
  hasValidStructure: boolean;
  warnings: AnalysisWarning[];
};

type HeaderContext = {
  start: number;
  currentColumn: number;
  currentHeaderRow: BudgetLogicalRow;
  itemColumn: number;
  itemHeaderRow: BudgetLogicalRow;
  isReliable: boolean;
};

type SectionSpan = { end: number; hasReliableClosure: boolean };

function warning(code: string, message: string, row?: BudgetLogicalRow): AnalysisWarning {
  return { code, message, severity: "error", row };
}

function revenueSectionSpan(rows: BudgetLogicalRow[], start: number): SectionSpan {
  let activeSheet = rows[start].sourceSheet;
  for (let index = start + 1; index < rows.length; index += 1) {
    if (rows[index].sourceSheet && activeSheet && rows[index].sourceSheet !== activeSheet) {
      return { end: index, hasReliableClosure: true };
    }
    if (!activeSheet && rows[index].sourceSheet) activeSheet = rows[index].sourceSheet;
    if (isClosingTotal(rows[index], "revenue")) return { end: index + 1, hasReliableClosure: isReliableBudgetRow(rows[index]) };
    if (isSectionHeading(rows[index], "expenditure") || isSectionHeading(rows[index], "summary")) {
      return { end: index, hasReliableClosure: isReliableBudgetRow(rows[index]) };
    }
  }
  return { end: rows.length, hasReliableClosure: false };
}

function headerContexts(rows: BudgetLogicalRow[], start: number, end: number): HeaderContext[] {
  const contexts: HeaderContext[] = [];
  for (const current of currentBudgetContexts(rows, start, end)) {
    const index = current.start;
    let itemColumn = -1;
    let itemHeaderRow: BudgetLogicalRow | undefined;
    for (let candidate = Math.max(start + 1, index - 2); candidate < Math.min(end, index + 3); candidate += 1) {
      const found = rows[candidate].cells.findIndex((cell) => canonicalBudgetLabel(cell).startsWith("원가통계비목"));
      if (found >= 0) {
        itemColumn = found;
        itemHeaderRow = rows[candidate];
        break;
      }
    }
    if (itemColumn >= 0 && itemHeaderRow) contexts.push({
      start: index,
      currentColumn: current.currentColumn,
      currentHeaderRow: current.currentHeaderRow,
      itemColumn,
      itemHeaderRow,
      isReliable: isReliableBudgetRow(current.currentHeaderRow) && isReliableBudgetRow(itemHeaderRow),
    });
  }
  return contexts;
}

function targetFacts(
  rows: BudgetLogicalRow[],
  start: number,
  end: number,
  contexts: HeaderContext[],
): Map<string, RevenueFact> {
  const facts = new Map<string, RevenueFact>();
  let contextIndex = -1;
  for (let index = start + 1; index < end; index += 1) {
    while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
    const context = contexts[contextIndex];
    if (!context || index === context.start || isSectionHeading(rows[index], "revenue")) continue;
    const label = canonicalBudgetLabel(cellAtBudgetColumn(rows[index], context.itemHeaderRow, context.itemColumn));
    if (!label) continue;
    if (!targetLabels.has(label)) continue;
    const amount = parseBudgetNumber(cellAtBudgetColumn(rows[index], context.currentHeaderRow, context.currentColumn));
    const existing = facts.get(label);
    if (!existing || existing.amount === null) facts.set(label, { label, amount, row: rows[index] });
  }
  return facts;
}

function hasParsedData(rows: BudgetLogicalRow[], start: number, end: number, contexts: HeaderContext[]): boolean {
  let contextIndex = -1;
  for (let index = start + 1; index < end; index += 1) {
    while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
    const context = contexts[contextIndex];
    if (!context || index === context.start || isSectionHeading(rows[index], "revenue") || isClosingTotal(rows[index], "revenue")) continue;
    const label = canonicalBudgetLabel(cellAtBudgetColumn(rows[index], context.itemHeaderRow, context.itemColumn));
    if (label && parseBudgetNumber(cellAtBudgetColumn(rows[index], context.currentHeaderRow, context.currentColumn)) !== null) return true;
  }
  return false;
}

function nearTargetRows(
  rows: BudgetLogicalRow[],
  start: number,
  end: number,
  contexts: HeaderContext[],
): BudgetLogicalRow[] {
  const suspicious: BudgetLogicalRow[] = [];
  let contextIndex = -1;
  for (let index = start + 1; index < end; index += 1) {
    while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
    const context = contexts[contextIndex];
    const row = rows[index];
    if (!context || index === context.start || !isReliableBudgetRow(row)) continue;
    const value = cellAtBudgetColumn(row, context.itemHeaderRow, context.itemColumn);
    const label = canonicalBudgetLabel(value);
    if (!label || targetLabels.has(label)) continue;
    const repeatedHierarchyLabel = row.cells.filter((cell) => canonicalBudgetLabel(cell) === label).length > 1;
    if (repeatedHierarchyLabel) continue;
    if (parseBudgetNumber(cellAtBudgetColumn(row, context.currentHeaderRow, context.currentColumn)) === null) continue;
    if ([...targetLabels].some((target) => isNearBudgetLabel(value, target))) suspicious.push(row);
  }
  return suspicious;
}

export function parseRevenueStatement(rows: BudgetLogicalRow[]): RevenueStatementParseResult {
  const warnings: AnalysisWarning[] = [];
  const start = findSectionStart(rows, "revenue");
  const span = start < 0 ? { end: -1, hasReliableClosure: false } : revenueSectionSpan(rows, start);
  const end = span.end;
  const contexts = start < 0 ? [] : headerContexts(rows, start, end);
  const hasUsableHeader = contexts.length > 0;
  const facts = start >= 0 && hasUsableHeader ? targetFacts(rows, start, end, contexts) : new Map<string, RevenueFact>();
  const lowConfidenceRows = start < 0 ? [] : rows.slice(start + 1, end)
    .filter((row) => isNonBlankBudgetRow(row) && !isReliableBudgetRow(row));
  const nearMissRows = start < 0 || !hasUsableHeader ? [] : nearTargetRows(rows, start, end, contexts);

  const hasValidStructure = start >= 0
    && isReliableBudgetRow(rows[start])
    && hasUsableHeader
    && contexts.every((context) => context.isReliable)
    && hasParsedData(rows, start, end, contexts)
    && span.hasReliableClosure;
  const canInferAbsence = hasValidStructure && lowConfidenceRows.length === 0 && nearMissRows.length === 0;
  const absenceRow = start < 0 ? undefined : rows[start];
  const requiredFact = (label: string): RevenueFact => facts.get(label) ?? (canInferAbsence
    ? { label, amount: 0, row: absenceRow, inferredAbsent: true }
    : { label, amount: null });
  const purposeRevenue = requiredFact("목적사업비전입금");
  const beneficiaryRevenue = requiredFact("수익자부담수입");
  const factRowsReliable = [...facts.values()].every((fact) => isReliableBudgetRow(fact.row));
  const isComplete = canInferAbsence
    && purposeRevenue.amount !== null
    && beneficiaryRevenue.amount !== null
    && factRowsReliable;
  const verificationRevenue: RevenueFactCollection = {
    facts: verificationLabels.map(requiredFact),
    isComplete,
  };

  if (start < 0) warnings.push(warning("REVENUE_SECTION", "세입예산명세서 구역을 확인할 수 없습니다."));
  else if (!hasUsableHeader) warnings.push(warning("REVENUE_CURRENT_COLUMN", "세입예산명세서의 현재 예산액과 원가통계비목 열을 확인할 수 없습니다."));
  else if (!hasValidStructure) warnings.push(warning("REVENUE_SECTION_INCOMPLETE", "세입예산명세서의 데이터와 종료 구조를 완전하게 확인할 수 없습니다."));
  if (hasValidStructure && purposeRevenue.amount === null) warnings.push(warning("PURPOSE_REVENUE", "목적사업비전입금을 확인할 수 없습니다."));
  if (hasValidStructure && beneficiaryRevenue.amount === null) warnings.push(warning("BENEFICIARY_REVENUE", "수익자부담수입을 확인할 수 없습니다."));
  for (const fact of facts.values()) {
    if (!isReliableBudgetRow(fact.row)) warnings.push(warning("LOW_CONFIDENCE_REVENUE", `${fact.label} 행의 신뢰도가 낮아 확인이 필요합니다.`, fact.row));
  }
  for (const row of lowConfidenceRows) {
    warnings.push(warning("LOW_CONFIDENCE_REVENUE_ROW", "세입예산명세서 본문에 신뢰도가 낮은 행이 있어 확인이 필요합니다.", row));
  }
  for (const row of nearMissRows) {
    warnings.push(warning("NEAR_MATCH_REVENUE_LABEL", "필수 세입 항목과 유사한 인식 문자열이 있어 원본 확인이 필요합니다.", row));
  }

  return { purposeRevenue, beneficiaryRevenue, verificationRevenue, hasValidStructure, warnings };
}
