import type {
  AnalysisWarning,
  BudgetCellCoordinate,
  BudgetDocumentIdentity,
  BudgetLogicalRow,
  RevenueFact,
} from "./analysisTypes";
import { normalizeLabel, parseBudgetNumber, stripHierarchyPrefix } from "./normalizeBudgetValue";

export type BudgetSection = "summary" | "revenue" | "expenditure";
export const MIN_BUDGET_ROW_CONFIDENCE = 0.8;

export type BudgetSummaryParseResult = {
  identity: BudgetDocumentIdentity | null;
  budgetTypeEvidence: "explicit" | "generic" | null;
  totalRevenue: RevenueFact;
  hasValidStructure: boolean;
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

export function isNearBudgetLabel(value: unknown, target: string): boolean {
  const candidate = canonicalBudgetLabel(value);
  if (!candidate || candidate === target || Math.abs(candidate.length - target.length) > 1) return false;
  let left = 0;
  let right = 0;
  let edits = 0;
  while (left < candidate.length && right < target.length) {
    if (candidate[left] === target[right]) {
      left += 1;
      right += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (candidate.length > target.length) left += 1;
    else if (candidate.length < target.length) right += 1;
    else {
      left += 1;
      right += 1;
    }
  }
  if (left < candidate.length || right < target.length) edits += 1;
  return edits === 1;
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

type IdentityCandidate = { label: string; row: BudgetLogicalRow };

function identityCandidates(rows: BudgetLogicalRow[], end: number): IdentityCandidate[] {
  return rows.slice(0, end).flatMap((row) => {
    const values = row.cells.map(canonicalBudgetLabel).filter((label) => label && label.length <= 80);
    const combined = rowText(row);
    if (combined && combined.length <= 80) values.push(combined);
    return [...new Set(values)].map((label) => ({ label, row }));
  });
}

function schoolIdentity(candidates: IdentityCandidate[]): { value: string; row: BudgetLogicalRow } | null {
  const suffix = "(?:유치원|초등학교|중학교|고등학교|특수학교|학교)";
  for (const candidate of candidates) {
    const withoutYear = candidate.label.replace(/^(?:19|20)\d{2}(?:학년도|회계연도)/, "");
    const exact = new RegExp(`^[가-힣A-Za-z0-9]{2,40}${suffix}$`).exec(withoutYear);
    if (exact) return { value: exact[0], row: candidate.row };
  }
  for (const candidate of candidates) {
    const withoutYear = candidate.label.replace(/^(?:19|20)\d{2}(?:학년도|회계연도)/, "");
    const embedded = new RegExp(`([가-힣A-Za-z0-9]{2,40}?${suffix})(?:회계|세입|세출|예산)`).exec(withoutYear);
    if (embedded) return { value: embedded[1], row: candidate.row };
  }
  return null;
}

function yearIdentity(rows: BudgetLogicalRow[], end: number): { value: number; row: BudgetLogicalRow } | null {
  for (const row of rows.slice(0, end)) {
    const text = rowText(row);
    const match = /((?:19|20)\d{2})(?:학년도|회계연도)/.exec(text)
      ?? /(?:학년도|회계연도)((?:19|20)\d{2})/.exec(text);
    if (match) return { value: Number(match[1]), row };
  }
  return null;
}

function isNonMainBudgetMarker(label: string): boolean {
  const withoutLegalBoilerplate = label
    .replace(/불가피한사유로추가경정예산을편성하지못할경우.*$/, "")
    .replace(/추가경정예산의성립이전|차기추가경정예산에계상/g, "");
  return /(추가경정(?:예산)?|추경(?:예산)?|성립전(?:예산)?|결산(?:서|보고서)?)/.test(withoutLegalBoilerplate);
}

function isOcrRow(row: BudgetLogicalRow): boolean {
  return row.sourcePage !== undefined && row.confidence !== undefined && row.confidence < 1;
}

export function reviewableOcrTableEvidence(
  rows: BudgetLogicalRow[],
  start: number,
  end: number,
): { header: BudgetLogicalRow; body: BudgetLogicalRow } | null {
  if (start < 0 || end <= start + 1 || !isOcrRow(rows[start])) return null;
  const section = rows.slice(start + 1, end);
  const genericHeader = section.find((row) => isOcrRow(row)
    && row.cells.some((cell) => canonicalBudgetLabel(cell) === "구분"));
  const currentHeader = section.find((row) => isOcrRow(row)
    && row.cells.some((cell) => isCurrentBudgetHeader(cell)));
  const explicitBudgetContext = section.find((row) => {
    const text = rowText(row);
    return isOcrRow(row) && text.includes("본예산") && text.includes("천원");
  });
  const body = section.find((row) => isOcrRow(row)
    && row.cells.some((cell) => /[가-힣]{2,}/.test(canonicalBudgetLabel(cell)))
    && row.cells.some((cell) => parseBudgetNumber(cell) !== null));
  const header = currentHeader ?? explicitBudgetContext;
  if (!genericHeader || !header || !body) return null;
  return { header, body };
}

export function parseBudgetSummary(rows: BudgetLogicalRow[]): BudgetSummaryParseResult {
  const warnings: AnalysisWarning[] = [];
  const start = findSectionStart(rows, "summary");
  const end = findSectionEnd(rows, start, ["revenue", "expenditure"]);
  const identityEnd = [findSectionStart(rows, "revenue"), findSectionStart(rows, "expenditure")]
    .filter((index) => index >= 0)
    .reduce((first, index) => Math.min(first, index), rows.length);
  const candidates = identityCandidates(rows, identityEnd);
  const nonMainMarker = candidates.find(({ label }) => isNonMainBudgetMarker(label));
  const explicitMarker = candidates.find(({ label }) => label.includes("본예산") && !label.includes("본예산액"));
  const genericMarker = candidates.find(({ label }) => /(?:19|20)\d{2}(?:학년도|회계연도).*(?:예산안|예산서안)/.test(label));
  const marker = nonMainMarker ? undefined : explicitMarker ?? genericMarker;
  const budgetTypeEvidence = marker === undefined ? null : marker === explicitMarker ? "explicit" as const : "generic" as const;
  const school = schoolIdentity(candidates);
  const accountingYear = yearIdentity(rows, identityEnd);
  const identity: BudgetDocumentIdentity | null = marker && school && accountingYear
    ? { schoolName: school.value, accountingYear: accountingYear.value, budgetType: "본예산" }
    : null;
  const sectionRow = start < 0 ? undefined : rows[start];
  let currentHeaderRow: BudgetLogicalRow | undefined;
  let currentColumn = -1;
  let totalRow: BudgetLogicalRow | undefined;
  let nearTotalRow: BudgetLogicalRow | undefined;
  let amount: number | null = null;

  if (start >= 0) {
    const contexts = currentBudgetContexts(rows, start, end);
    let contextIndex = -1;
    for (let index = start + 1; index < end; index += 1) {
      while (contextIndex + 1 < contexts.length && contexts[contextIndex + 1].start <= index) contextIndex += 1;
      const context = contexts[contextIndex];
      if (!nearTotalRow && rows[index].cells.some((cell) => isNearBudgetLabel(cell, "세입예산총액"))) {
        nearTotalRow = rows[index];
      }
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

  const summaryOcrEvidence = start < 0 ? undefined : rows.slice(start + 1, end).find((row) => {
    const text = rowText(row);
    return isOcrRow(row) && text.includes("세입세출예산총액")
      && row.cells.some((cell) => parseBudgetNumber(cell) !== null);
  });
  const hasReviewableOcrStructure = summaryOcrEvidence !== undefined
    && rows.slice(start + 1, end).some((row) => isOcrRow(row) && rowText(row).includes("예산총칙"));

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
  if (nonMainMarker) warnings.push(warning("NON_MAIN_BUDGET_MARKER", "본예산이 아닌 예산 구분 표시가 있어 분석할 수 없습니다.", nonMainMarker.row));
  else if (!marker) warnings.push(warning("MAIN_BUDGET_MARKER", "본예산 또는 예산안 표시를 확인할 수 없습니다."));
  else if (!isReliableBudgetRow(marker.row)) warnings.push(warning("LOW_CONFIDENCE_MAIN_BUDGET_MARKER", "본예산 또는 예산안 표시의 신뢰도가 낮아 확인이 필요합니다.", marker.row));
  if (!school) warnings.push(warning("SCHOOL_NAME", "학교명을 확인할 수 없습니다."));
  else if (!isReliableBudgetRow(school.row)) warnings.push(warning("LOW_CONFIDENCE_SCHOOL_NAME", "학교명 인식 신뢰도가 낮아 확인이 필요합니다.", school.row));
  if (!accountingYear) warnings.push(warning("ACCOUNTING_YEAR", "회계연도를 확인할 수 없습니다."));
  else if (!isReliableBudgetRow(accountingYear.row)) warnings.push(warning("LOW_CONFIDENCE_ACCOUNTING_YEAR", "회계연도 인식 신뢰도가 낮아 확인이 필요합니다.", accountingYear.row));
  if (currentColumn < 0) warnings.push(warning("BUDGET_SUMMARY_CURRENT_COLUMN", "총괄의 현재 예산액 열을 확인할 수 없습니다."));
  if (amount === null) warnings.push(warning("TOTAL_REVENUE", "세입예산총액을 확인할 수 없습니다.", totalRow ?? summaryOcrEvidence));
  if (nearTotalRow && isReliableBudgetRow(nearTotalRow)) warnings.push(warning("NEAR_MATCH_REVENUE_LABEL", "세입예산총액과 유사한 인식 문자열이 있어 원본 확인이 필요합니다.", nearTotalRow));
  if (sectionRow && !isReliableBudgetRow(sectionRow)) warnings.push(warning("LOW_CONFIDENCE_BUDGET_SUMMARY_HEADING", "세입세출예산총괄 제목의 신뢰도가 낮아 확인이 필요합니다.", sectionRow));
  if (currentHeaderRow && !isReliableBudgetRow(currentHeaderRow)) warnings.push(warning("LOW_CONFIDENCE_BUDGET_SUMMARY_HEADER", "총괄 예산액 머리글의 신뢰도가 낮아 확인이 필요합니다.", currentHeaderRow));
  if (totalRow && !isReliableBudgetRow(totalRow)) warnings.push(warning("LOW_CONFIDENCE_TOTAL_REVENUE", "세입예산총액 행의 신뢰도가 낮아 확인이 필요합니다.", totalRow));
  if (hasReviewableOcrStructure) warnings.push(warning("OCR_REVIEW_BUDGET_SUMMARY", "OCR에서 총괄 구조는 확인했지만 금액과 머리글은 원본 확인이 필요합니다.", summaryOcrEvidence));

  const hasValidStructure = (start >= 0
    && currentColumn >= 0
    && isReliableBudgetRow(sectionRow)
    && isReliableBudgetRow(currentHeaderRow)) || hasReviewableOcrStructure;

  return {
    identity,
    budgetTypeEvidence,
    totalRevenue: { label: "세입예산총액", amount, row: totalRow ?? summaryOcrEvidence },
    hasValidStructure,
    isComplete: hasValidStructure
      && identity !== null
      && amount !== null
      && isReliableBudgetRow(marker?.row)
      && isReliableBudgetRow(school?.row)
      && isReliableBudgetRow(accountingYear?.row)
      && isReliableBudgetRow(totalRow),
    warnings,
  };
}
