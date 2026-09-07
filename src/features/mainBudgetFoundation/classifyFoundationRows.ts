import { INDIVIDUAL_OPERATING_BUSINESSES, INTEGRATED_GRANT_BUSINESSES } from "./referenceData";
import type { FoundationExpenseRow, FoundationRevenueRow } from "./types";

export type RevenueCharacter = "공" | "통" | "일" | "수" | "확인";

const normalize = (value: string) => value.replace(/[\s·()_-]/g, "").toLowerCase();
const containsKnown = (text: string, candidates: readonly string[]) => {
  const normalized = normalize(text);
  return candidates.some((candidate) => normalized.includes(normalize(candidate)));
};

export function classifyRevenue(row: FoundationRevenueRow): RevenueCharacter {
  const hierarchy = `${row.chapter} ${row.division} ${row.section} ${row.item} ${row.costItem}`;
  const basis = row.calculationBasis;
  if (/학부모부담|수익자부담/.test(hierarchy)) return "수";
  if (containsKnown(basis, INTEGRATED_GRANT_BUSINESSES)) return "통";
  if (/학교기본운영비/.test(basis) || /^\(개별\)/.test(basis) || containsKnown(basis, INDIVIDUAL_OPERATING_BUSINESSES)) return "공";
  if (/자체수입|사용료|수수료|자산매각대|지난년도수입|이자수입|기타행정활동수입|순세계잉여금/.test(hierarchy)) return "일";
  return "확인";
}

export function selectBusinessExpenses(rows: FoundationExpenseRow[]): FoundationExpenseRow[] {
  return rows.filter((row) => row.costItem.trim() === "일반업무추진비");
}
