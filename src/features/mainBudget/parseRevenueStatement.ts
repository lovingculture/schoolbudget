import type { AnalysisWarning, BudgetLogicalRow, RevenueFact, RevenueFactCollection } from "./analysisTypes";
import { parseBudgetNumber } from "./normalizeBudgetValue";
import {
  canonicalBudgetLabel,
  findCurrentBudgetColumn,
  findSectionEnd,
  findSectionStart,
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

type HeaderContext = { start: number; currentColumn: number; itemColumn: number };

function warning(code: string, message: string, row?: BudgetLogicalRow): AnalysisWarning {
  return { code, message, severity: "error", row };
}

function headerContexts(rows: BudgetLogicalRow[], start: number, end: number): HeaderContext[] {
  const contexts: HeaderContext[] = [];
  for (let index = start + 1; index < end; index += 1) {
    const currentColumn = findCurrentBudgetColumn(rows[index]);
    if (currentColumn < 0) continue;
    let itemColumn = -1;
    for (let lookahead = index; lookahead < Math.min(end, index + 3); lookahead += 1) {
      const found = rows[lookahead].cells.findIndex((cell) => canonicalBudgetLabel(cell).startsWith("원가통계비목"));
      if (found >= 0) {
        itemColumn = found;
        break;
      }
    }
    if (itemColumn >= 0) contexts.push({ start: index, currentColumn, itemColumn });
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

export function parseRevenueStatement(rows: BudgetLogicalRow[]): RevenueStatementParseResult {
  const warnings: AnalysisWarning[] = [];
  const start = findSectionStart(rows, "revenue");
  const end = findSectionEnd(rows, start, ["expenditure"]);
  const contexts = start < 0 ? [] : headerContexts(rows, start, end);
  const hasUsableHeader = contexts.length > 0;
  const isComplete = start >= 0 && hasUsableHeader;
  const facts = isComplete ? targetFacts(rows, start, end, contexts) : new Map<string, RevenueFact>();

  const requiredFact = (label: string): RevenueFact => facts.get(label) ?? { label, amount: null };
  const purposeRevenue = requiredFact("목적사업비전입금");
  const beneficiaryRevenue = requiredFact("수익자부담수입");
  const verificationRevenue: RevenueFactCollection = {
    facts: verificationLabels.map((label) => facts.get(label) ?? { label, amount: isComplete ? 0 : null }),
    isComplete,
  };

  if (start < 0) warnings.push(warning("REVENUE_SECTION", "세입예산명세서 구역을 확인할 수 없습니다."));
  else if (!hasUsableHeader) warnings.push(warning("REVENUE_CURRENT_COLUMN", "세입예산명세서의 현재 예산액과 원가통계비목 열을 확인할 수 없습니다."));
  if (isComplete && purposeRevenue.amount === null) warnings.push(warning("PURPOSE_REVENUE", "목적사업비전입금을 확인할 수 없습니다."));
  if (isComplete && beneficiaryRevenue.amount === null) warnings.push(warning("BENEFICIARY_REVENUE", "수익자부담수입을 확인할 수 없습니다."));

  return { purposeRevenue, beneficiaryRevenue, verificationRevenue, warnings };
}
