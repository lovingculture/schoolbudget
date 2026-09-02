import type { AnalysisWarning, BudgetCellCoordinate, BudgetLogicalRow, RevenueFact } from "./analysisTypes";
import { normalizeLabel, parseBudgetNumber, stripHierarchyPrefix } from "./normalizeBudgetValue";

export type BudgetSection = "summary" | "revenue" | "expenditure";
export const MIN_BUDGET_ROW_CONFIDENCE = 0.8;

export type BudgetSummaryParseResult = {
  totalRevenue: RevenueFact;
  isComplete: boolean;
  warnings: AnalysisWarning[];
};

export function canonicalBudgetLabel(value: unknown): string {
  return stripHierarchyPrefix(normalizeLabel(value))
    .replace(/[\s·•・ㆍ:()（）[\]\-]/g, "");
}

export function rowText(row: BudgetLogicalRow): string {
  return row.cells.map(canonicalBudgetLabel).join("");
}

export function isReliableBudgetRow(row: BudgetLogicalRow | undefined): boolean {
  return row !== undefined && (row.confidence === undefined || row.confidence >= MIN_BUDGET_ROW_CONFIDENCE);
}

export function isNonBlankBudgetRow(row: BudgetLogicalRow): boolean {
  return row.cells.some((cell) => canonicalBudgetLabel(cell) !== "" || parseBudgetNumber(cell) !== null);
}

export function isClosingTotal(row: BudgetLogicalRow, section: "revenue" | "expenditure"): boolean {
  const labels = row.cells.map(canonicalBudgetLabel);
  return labels.includes(section === "revenue" ? "세입합계" : "세출합계")
    || labels.includes(section === "revenue" ? "세입예산합계" : "세출예산합계");
}

export function isSectionHeading(row: BudgetLogicalRow, section: BudgetSection): boolean {
  const text = rowText(row);
  if (section === "summary") {
    return text.includes("세입세출예산총괄")
      || (text.includes("세입세출예산서") && !text.includes("명세서"));
  }
  return text.includes(section === "revenue" ? "세입예산명세서" : "세출예산명세서");
}

export function findSectionStart(rows: BudgetLogicalRow[], section: BudgetSection): number {
  if (section === "summary") {
    const strict = rows.findIndex((row) => rowText(row).includes("세입세출예산총괄"));
    if (strict >= 0) return strict;
  }
  return rows.findIndex((row) => isSectionHeading(row, section));
}

export function findSectionEnd(rows: BudgetLogicalRow[], start: number, boundaries: BudgetSection[]): number {
  if (start < 0) return -1;
  const offset = rows.slice(start + 1).findIndex((row) => boundaries.some((section) => isSectionHeading(row, section)));
  return offset < 0 ? rows.length : start + 1 + offset;
}

export function isCurrentBudgetHeader(value: unknown): boolean {
  const label = canonicalBudgetLabel(value);
  if (!label || /(전년|전년도|기정|비교|증감)/.test(label)) return false;
  return label === "예산액"
    || label.startsWith("예산액A")
    || label.startsWith("본예산액")
    || label.startsWith("당해연도예산액")
    || label.startsWith("현재예산액");
}

export function findCurrentBudgetColumn(row: BudgetLogicalRow): number {
  return row.cells.findIndex(isCurrentBudgetHeader);
}

export type CurrentBudgetContext = {
  start: number;
  currentColumn: number;
  currentHeaderRow: BudgetLogicalRow;
};

export function currentBudgetContexts(
  rows: BudgetLogicalRow[],
  start: number,
  end: number,
): CurrentBudgetContext[] {
  const contexts: CurrentBudgetContext[] = [];
  for (let index = start + 1; index < end; index += 1) {
    const currentColumn = findCurrentBudgetColumn(rows[index]);
    if (currentColumn < 0) continue;
    const previous = contexts.at(-1);
    const samePdfHeader = previous
      && rows[index].sourcePage !== undefined
      && rows[index].sourcePage === previous.currentHeaderRow.sourcePage
      && index - previous.start <= 2;
    if (samePdfHeader) continue;
    contexts.push({ start: index, currentColumn, currentHeaderRow: rows[index] });
  }
  return contexts;
}

function intervalGap(left: BudgetCellCoordinate, right: BudgetCellCoordinate): number {
  const leftEnd = left.x + (left.width ?? 0);
  const rightEnd = right.x + (right.width ?? 0);
  if (leftEnd < right.x) return right.x - leftEnd;
  if (rightEnd < left.x) return left.x - rightEnd;
  return 0;
}

export function cellAtBudgetColumn(
  row: BudgetLogicalRow,
  headerRow: BudgetLogicalRow,
  headerColumn: number,
): unknown {
  const fallback = row.cells[headerColumn];
  if (row.sourcePage === undefined || row.sourcePage !== headerRow.sourcePage) return fallback;
  const header = headerRow.coordinates?.[headerColumn];
  if (!header || !row.coordinates) return fallback;
  const headerEnd = header.x + (header.width ?? 0);
  const candidates = row.cells.flatMap((cell, index) => {
    const coordinate = row.coordinates?.[index];
    return coordinate && (canonicalBudgetLabel(cell) !== "" || parseBudgetNumber(cell) !== null)
      ? [{ cell, coordinate, gap: intervalGap(coordinate, header) }]
      : [];
  }).sort((left, right) => left.gap - right.gap
    || Math.abs((left.coordinate.x + (left.coordinate.width ?? 0)) - headerEnd)
      - Math.abs((right.coordinate.x + (right.coordinate.width ?? 0)) - headerEnd));
  const closest = candidates[0];
  return closest && closest.gap <= Math.max(12, (header.width ?? 0) * 0.75) ? closest.cell : fallback;
}

function warning(code: string, message: string, row?: BudgetLogicalRow): AnalysisWarning {
  return { code, message, severity: "error", row };
}

function mainBudgetMarkerRow(rows: BudgetLogicalRow[], end: number): BudgetLogicalRow | undefined {
  return rows.slice(0, end).find((row) => {
    const text = rowText(row);
    return text.includes("예산안") || text.includes("본예산");
  });
}

export function parseBudgetSummary(rows: BudgetLogicalRow[]): BudgetSummaryParseResult {
  const warnings: AnalysisWarning[] = [];
  const start = findSectionStart(rows, "summary");
  const end = findSectionEnd(rows, start, ["revenue", "expenditure"]);
  const markerRow = mainBudgetMarkerRow(rows, start < 0 ? rows.length : end);
  const markerFound = markerRow !== undefined;
  const sectionRow = start < 0 ? undefined : rows[start];
  let currentHeaderRow: BudgetLogicalRow | undefined;
  let currentColumn = -1;
  let totalRow: BudgetLogicalRow | undefined;
  let amount: number | null = null;

  if (start >= 0) {
    const contexts = currentBudgetContexts(rows, start, end);
    let contextIndex = -1;
    for (let index = start + 1; index < end; index += 1) {
      while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
      const context = contexts[contextIndex];
      if (rows[index].cells.some((cell) => ["세입예산총액", "세입합계"].includes(canonicalBudgetLabel(cell)))) {
        totalRow = rows[index];
        if (context) {
          currentColumn = context.currentColumn;
          currentHeaderRow = context.currentHeaderRow;
          amount = parseBudgetNumber(cellAtBudgetColumn(totalRow, currentHeaderRow, currentColumn));
        }
        break;
      }
    }

    if (!totalRow) {
      for (const context of contexts) {
        const candidate = rows.slice(context.start + 1, end).find((row) => row.sourcePage === context.currentHeaderRow.sourcePage
          && rowText(row).includes("본예산")
          && parseBudgetNumber(cellAtBudgetColumn(row, context.currentHeaderRow, context.currentColumn)) !== null);
        if (!candidate) continue;
        totalRow = candidate;
        currentColumn = context.currentColumn;
        currentHeaderRow = context.currentHeaderRow;
        amount = parseBudgetNumber(cellAtBudgetColumn(candidate, currentHeaderRow, currentColumn));
        break;
      }
    }
  }

  if (!totalRow) {
    const revenueStart = findSectionStart(rows, "revenue");
    const revenueEnd = findSectionEnd(rows, revenueStart, ["expenditure", "summary"]);
    const contexts = revenueStart < 0 ? [] : currentBudgetContexts(rows, revenueStart, revenueEnd);
    let contextIndex = -1;
    for (let index = revenueStart + 1; index < revenueEnd; index += 1) {
      while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
      if (!isClosingTotal(rows[index], "revenue")) continue;
      const context = contexts[contextIndex];
      if (context) {
        totalRow = rows[index];
        currentColumn = context.currentColumn;
        currentHeaderRow = context.currentHeaderRow;
        amount = parseBudgetNumber(cellAtBudgetColumn(totalRow, currentHeaderRow, currentColumn));
      }
      break;
    }
  }

  if (start < 0) warnings.push(warning("BUDGET_SUMMARY_SECTION", "세입세출예산총괄 구역을 확인할 수 없습니다."));
  if (!markerFound) warnings.push(warning("MAIN_BUDGET_MARKER", "본예산 또는 예산안 표시를 확인할 수 없습니다."));
  else if (!isReliableBudgetRow(markerRow)) warnings.push(warning("LOW_CONFIDENCE_MAIN_BUDGET_MARKER", "본예산 또는 예산안 표시의 신뢰도가 낮아 확인이 필요합니다.", markerRow));
  if (currentColumn < 0) warnings.push(warning("BUDGET_SUMMARY_CURRENT_COLUMN", "총괄의 현재 예산액 열을 확인할 수 없습니다."));
  if (amount === null) warnings.push(warning("TOTAL_REVENUE", "세입예산총액을 확인할 수 없습니다.", totalRow));
  if (sectionRow && !isReliableBudgetRow(sectionRow)) warnings.push(warning("LOW_CONFIDENCE_BUDGET_SUMMARY_HEADING", "세입세출예산총괄 제목의 신뢰도가 낮아 확인이 필요합니다.", sectionRow));
  if (currentHeaderRow && !isReliableBudgetRow(currentHeaderRow)) warnings.push(warning("LOW_CONFIDENCE_BUDGET_SUMMARY_HEADER", "총괄 예산액 머리글의 신뢰도가 낮아 확인이 필요합니다.", currentHeaderRow));
  if (totalRow && !isReliableBudgetRow(totalRow)) warnings.push(warning("LOW_CONFIDENCE_TOTAL_REVENUE", "세입예산총액 행의 신뢰도가 낮아 확인이 필요합니다.", totalRow));

  return {
    totalRevenue: { label: "세입예산총액", amount, row: totalRow },
    isComplete: start >= 0
      && markerFound
      && currentColumn >= 0
      && amount !== null
      && isReliableBudgetRow(markerRow)
      && isReliableBudgetRow(sectionRow)
      && isReliableBudgetRow(currentHeaderRow)
      && isReliableBudgetRow(totalRow),
    warnings,
  };
}
