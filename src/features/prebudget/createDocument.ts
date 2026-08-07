import { calculateRequestedAmount } from "../../domain/prebudget";
import { activePrebudgetItems } from "./draft";
import type { PrebudgetFormDraft } from "./types";

export function createPrebudgetDocument(draft: PrebudgetFormDraft) {
  const items = activePrebudgetItems(draft.items).map((item) => ({ ...item, amount: calculateRequestedAmount(item) }));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const lines = [`${draft.title}`, "", `1. 관련: ${draft.officialDocument}`, `2. ${draft.fiscalYear}학년도 성립전예산을 다음과 같이 편성하고자 합니다.`, "", `  가. 재원구분: ${draft.source}`, `  나. 요구부서: ${draft.department}`, `  다. 요구자: ${draft.requester}`, `  라. 예산요구 총액: ${total.toLocaleString()}원`, "", "[성립전예산 요구내역]", ...items.map((item, i) => `${i + 1}. ${item.unitBusiness} > ${item.business} / ${item.detail} / ${item.category} / ${item.description} / ${item.amount.toLocaleString()}원`), "", "붙임  성립전예산 요구내역 1부.  끝."];
  return { ...draft, items, total, copyText: lines.join("\n") };
}
export type PrebudgetDocument = ReturnType<typeof createPrebudgetDocument>;
