import type { AnalysisWarning, BudgetLogicalRow, RevenueFact, RevenueFactCollection } from "./analysisTypes";
import { parseBudgetNumber } from "./normalizeBudgetValue";
import {
  canonicalBudgetLabel,
  findCurrentBudgetColumn,
  findSectionStart,
  isClosingTotal,
  isReliableBudgetRow,
  isSectionHeading,
} from "./parseBudgetSummary";

const verificationLabels = ["학교운영비전입금", "사용료", "수수료", "자산매각대", "지난년도수입", "이자수입", "기타행정활동수입", "순세계잉여금"] as const;
const targetLabels = new Set<string>(["목적사업비전입금", "수익자부담수입", ...verificationLabels]);

export type RevenueStatementParseResult = {
  purposeRevenue: RevenueFact;
  beneficiaryRevenue: RevenueFact;
  verificationRevenue: RevenueFactCollection;
  warnings: AnalysisWarning[];
};

type HeaderContext = { start: number; currentColumn: number; itemColumn: number; isReliable: boolean };

type SectionSpan = { end: number; hasReliableClosure: boolean };

function warning(code: string, message: string, row?: BudgetLogicalRow): AnalysisWarning {
  return { code, message, severity: "error", row };
}

function revenueSectionSpan(rows: BudgetLogicalRow[], start: number): SectionSpan {
  for (let index = start + 1; index < rows.length; index += 1) {
    if (isClosingTotal(rows[index], "revenue")) return { end: index + 1, hasReliableClosure: isReliableBudgetRow(rows[index]) };
    if (isSectionHeading(rows[index], "expenditure") || isSectionHeading(rows[index], "summary")) {
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
    if (itemColumn >= 0) contexts.push({
      start: index,
      currentColumn,
      itemColumn,
      isReliable: isReliableBudgetRow(rows[index]) && isReliableBudgetRow(itemHeaderRow),
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
    const label = canonicalBudgetLabel(rows[index].cells[context.itemColumn]);
    if (!label) continue;
    if (!targetLabels.has(label)) continue;
    const amount = parseBudgetNumber(rows[index].cells[context.currentColumn]);
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
    const label = canonicalBudgetLabel(rows[index].cells[context.itemColumn]);
    if (label && parseBudgetNumber(rows[index].cells[context.currentColumn]) !== null) return true;
  }
  return false;
}

export function parseRevenueStatement(rows: BudgetLogicalRow[]): RevenueStatementParseResult {
  const warnings: AnalysisWarning[] = [];
  const start = findSectionStart(rows, "revenue");
  const span = start < 0 ? { end: -1, hasReliableClosure: false } : revenueSectionSpan(rows, start);
  const end = span.end;
  const contexts = start < 0 ? [] : headerContexts(rows, start, end);
  const hasUsableHeader = contexts.length > 0;
  const facts = start >= 0 && hasUsableHeader ? targetFacts(rows, start, end, contexts) : new Map<string, RevenueFact>();

  const requiredFact = (label: string): RevenueFact => facts.get(label) ?? { label, amount: null };
  const purposeRevenue = requiredFact("목적사업비전입금");
  const beneficiaryRevenue = requiredFact("수익자부담수입");
  const factRowsReliable = [...facts.values()].every((fact) => isReliableBudgetRow(fact.row));
  const hasCompleteStructure = start >= 0
    && isReliableBudgetRow(rows[start])
    && hasUsableHeader
    && contexts.every((context) => context.isReliable)
    && hasParsedData(rows, start, end, contexts)
    && span.hasReliableClosure;
  const isComplete = hasCompleteStructure
    && purposeRevenue.amount !== null
    && beneficiaryRevenue.amount !== null
    && factRowsReliable;
  const verificationRevenue: RevenueFactCollection = {
    facts: verificationLabels.map((label) => facts.get(label) ?? { label, amount: isComplete ? 0 : null }),
    isComplete,
  };

  if (start < 0) warnings.push(warning("REVENUE_SECTION", "세입예산명세서 구역을 확인할 수 없습니다."));
  else if (!hasUsableHeader) warnings.push(warning("REVENUE_CURRENT_COLUMN", "세입예산명세서의 현재 예산액과 원가통계비목 열을 확인할 수 없습니다."));
  else if (!isComplete) warnings.push(warning("REVENUE_SECTION_INCOMPLETE", "세입예산명세서의 데이터와 종료 구조를 완전하게 확인할 수 없습니다."));
  if (hasCompleteStructure && purposeRevenue.amount === null) warnings.push(warning("PURPOSE_REVENUE", "목적사업비전입금을 확인할 수 없습니다."));
  if (hasCompleteStructure && beneficiaryRevenue.amount === null) warnings.push(warning("BENEFICIARY_REVENUE", "수익자부담수입을 확인할 수 없습니다."));
  for (const fact of facts.values()) {
    if (!isReliableBudgetRow(fact.row)) warnings.push(warning("LOW_CONFIDENCE_REVENUE", `${fact.label} 행의 신뢰도가 낮아 확인이 필요합니다.`, fact.row));
  }

  return { purposeRevenue, beneficiaryRevenue, verificationRevenue, warnings };
}
