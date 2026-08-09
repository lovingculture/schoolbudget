import type { MainBudgetExpenditureRow, ReviewIssue } from "./types";

const required: Array<[keyof MainBudgetExpenditureRow, string, string]> = [
  ["department", "REQUIRED_DEPARTMENT", "부서명"],
  ["business", "REQUIRED_BUSINESS", "세부사업명"],
  ["detail", "REQUIRED_DETAIL", "세부항목명"],
  ["costCategory", "REQUIRED_COST_CATEGORY", "원가통계비목명"],
  ["description", "REQUIRED_DESCRIPTION", "산출내역"],
];

function issue(code: string, level: ReviewIssue["level"], message: string, basis: string): ReviewIssue {
  return { code, level, message, basis };
}

function duplicateKey(row: MainBudgetExpenditureRow): string {
  return [row.department, row.business, row.detail, row.description]
    .map((value) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase())
    .join("|");
}

export function reviewExpenditures(rows: MainBudgetExpenditureRow[]): MainBudgetExpenditureRow[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = duplicateKey(row);
    if (!key.replace(/\|/g, "")) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return rows.map((row) => {
    const issues: ReviewIssue[] = [];
    for (const [field, code, label] of required) {
      if (!String(row[field] ?? "").trim()) issues.push(issue(code, "error", `${label}이(가) 비어 있습니다.`, `${label}은 세출 통합 필수항목입니다.`));
    }
    if (row.requestedAmount === undefined) {
      issues.push(issue("EXPRESSION_UNSUPPORTED", "review", "산출식을 계산하지 못했습니다.", `원본 산출식: ${row.expression || "(비어 있음)"}`));
    }
    if (row.requestedAmount !== undefined && row.originalRequestedAmount !== undefined && row.requestedAmount !== row.originalRequestedAmount) {
      issues.push(issue("REQUEST_AMOUNT_MISMATCH", "error", "산출식 계산액과 원본 요구금액이 다릅니다.", `${row.requestedAmount.toLocaleString()}원 ≠ ${row.originalRequestedAmount.toLocaleString()}원`));
    }
    if (row.variance !== undefined && row.originalVariance !== undefined && row.variance !== row.originalVariance) {
      issues.push(issue("VARIANCE_MISMATCH", "error", "증감 계산액과 원본 증감이 다릅니다.", `${row.variance.toLocaleString()}원 ≠ ${row.originalVariance.toLocaleString()}원`));
    }
    if ((counts.get(duplicateKey(row)) ?? 0) > 1) {
      issues.push(issue("DUPLICATE_SUSPECTED", "warning", "동일한 예산요구가 중복되었을 수 있습니다.", "부서·세부사업·세부항목·산출내역이 같습니다."));
    }
    if (row.requestedAmount !== undefined && row.requestedAmount <= 0) {
      issues.push(issue("AMOUNT_NON_POSITIVE", "warning", "요구금액이 0원 이하입니다.", `계산 요구금액: ${row.requestedAmount.toLocaleString()}원`));
    } else if (row.requestedAmount !== undefined && row.requestedAmount >= 100_000_000) {
      issues.push(issue("AMOUNT_OUTLIER", "warning", "요구금액이 1억원 이상입니다.", "단가·인원·횟수를 다시 확인해 주세요."));
    }
    return { ...row, issues };
  });
}
