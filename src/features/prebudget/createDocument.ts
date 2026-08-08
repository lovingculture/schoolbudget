import { calculateRequestedAmount } from "../../domain/prebudget";
import { activePrebudgetItems } from "./draft";
import type { PrebudgetFormDraft } from "./types";

export function createPrebudgetDocument(draft: PrebudgetFormDraft) {
  const items = activePrebudgetItems(draft.items).map((item) => ({ ...item, amount: calculateRequestedAmount(item) }));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const subject = draft.title.replace(/\s*성립전예산(?:\s*편성)?\s*$/, "").trim();
  const approvalLine = draft.approvalGranter.trim()
    ? [`라. 품의권한 부여자: ${draft.approvalGranter.trim()}`]
    : [];
  const totalPrefix = approvalLine.length ? "마" : "라";
  const detailsPrefix = approvalLine.length ? "바" : "마";
  const bodyLines = [
    `관련: ${draft.officialDocument}`,
    `${draft.fiscalYear}학년도 ${subject ? `${subject} ` : ""}성립전예산을 다음과 같이 편성하고자 합니다.`,
    "",
    `가. 재원구분: ${draft.source}`,
    `나. 요구부서: ${draft.department}`,
    `다. 사업담당자: ${draft.requester}`,
    ...approvalLine,
    `${totalPrefix}. 예산요구 총액: ${total.toLocaleString()}원`,
    `${detailsPrefix}. 성립전예산 요구내역`,
    ...items.map((item) => `단위사업) ${item.unitBusiness} / 세부사업) ${item.business} / 세부항목) ${item.detail} / 원가통계비목) ${item.category} / 산출기초) ${item.description} / ${item.amount.toLocaleString()}원`),
  ];
  const copyText = [draft.title, "", ...bodyLines].join("\n");

  return { ...draft, items, total, bodyLines, copyText };
}
export type PrebudgetDocument = ReturnType<typeof createPrebudgetDocument>;
