import type { AnalysisWarning, BudgetLogicalRow, RevenueFact } from "./analysisTypes";
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

  if (start >= 0) {
    for (let index = start + 1; index < end; index += 1) {
      const foundColumn = findCurrentBudgetColumn(rows[index]);
      if (foundColumn >= 0) {
        currentColumn = foundColumn;
        currentHeaderRow = rows[index];
      }
      if (rows[index].cells.some((cell) => ["세입예산총액", "세입합계"].includes(canonicalBudgetLabel(cell)))) {
        totalRow = rows[index];
        break;
      }
    }
  }

  let amount = totalRow && currentColumn >= 0 ? parseBudgetNumber(totalRow.cells[currentColumn]) : null;
  if (!totalRow && start >= 0) {
    const inlineRow = rows.slice(start, end).find((row) => findCurrentBudgetColumn(row) >= 0
      && row.cells.slice(findCurrentBudgetColumn(row) + 1).some((cell) => parseBudgetNumber(cell) !== null));
    if (inlineRow) {
      totalRow = inlineRow;
      const labelColumn = findCurrentBudgetColumn(inlineRow);
      amount = inlineRow.cells.slice(labelColumn + 1).map(parseBudgetNumber).find((value) => value !== null) ?? null;
      currentColumn = labelColumn;
      currentHeaderRow = inlineRow;
    }
  }

  if (start < 0) warnings.push(warning("BUDGET_SUMMARY_SECTION", "세입세출예산총괄 구역을 확인할 수 없습니다."));
  if (!markerFound) warnings.push(warning("MAIN_BUDGET_MARKER", "본예산 또는 예산안 표시를 확인할 수 없습니다."));
  else if (!isReliableBudgetRow(markerRow)) warnings.push(warning("LOW_CONFIDENCE_MAIN_BUDGET_MARKER", "본예산 또는 예산안 표시의 신뢰도가 낮아 확인이 필요합니다.", markerRow));
  if (currentColumn < 0) warnings.push(warning("BUDGET_SUMMARY_CURRENT_COLUMN", "총괄의 현재 예산액 열을 확인할 수 없습니다."));
  if (amount === null) warnings.push(warning("TOTAL_REVENUE", "세입예산총액을 확인할 수 없습니다.", totalRow));
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
