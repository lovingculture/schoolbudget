import { calculateRequestedAmount } from "../../domain/prebudget";
import { activePrebudgetItems } from "./draft";
import type { PrebudgetFormDraft } from "./types";

export function createPrebudgetDocument(draft: PrebudgetFormDraft) {
  const items = activePrebudgetItems(draft.items).map((item) => ({ ...item, amount: calculateRequestedAmount(item) }));
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const subject = draft.title.replace(/\s*성립전예산(?:\s*편성)?\s*$/, "").trim();
  const approvalLine = draft.approvalGranter.trim()
    ? [`라. 예산(품의) 권한 부여 대상: ${draft.approvalGranter.trim()}`]
    : [];
  const totalPrefix = approvalLine.length ? "마" : "라";
  const detailsPrefix = approvalLine.length ? "바" : "마";
  const headers = ["단위사업", "세부사업", "세부항목", "원가통계비목", "산출내역", "산출식", "요구금액"];
  const rows = items.map((item) => {
    const hasFormula = (item.unitPrice ?? 0) > 0 && (item.quantity ?? 0) > 0 && (item.count ?? 0) > 0;
    const formula = hasFormula ? `${item.unitPrice!.toLocaleString()}원 × ${item.quantity!.toLocaleString()} × ${item.count!.toLocaleString()}회` : "-";
    return [item.unitBusiness ?? "", item.business ?? "", item.detail ?? "", item.category ?? "", item.description ?? "", formula, `${item.amount.toLocaleString()}원`];
  });
  const budgetTable = { headers, rows, total: `${total.toLocaleString()}원` };
  const bodyLines = [
    `1. 관련: ${draft.officialDocument}`,
    `2. ${draft.fiscalYear}학년도 ${subject ? `${subject} ` : ""}성립전예산을 다음과 같이 편성하고자 합니다.`,
    "",
    `가. 재원구분: ${draft.source}`,
    `나. 요구부서: ${draft.department}`,
    `다. 사업담당자: ${draft.requester}`,
    ...approvalLine,
    `${totalPrefix}. 예산요구 총액: ${total.toLocaleString()}원`,
    `${detailsPrefix}. 성립전예산 요구내역`,
  ];
  const tableText = [headers.join("\t"), ...rows.map((row) => row.join("\t")), ["합계", "", "", "", "", "", budgetTable.total].join("\t")];
  const copyText = [draft.title, "", ...bodyLines, ...tableText].join("\n");

  return { ...draft, items, total, bodyLines, budgetTable, copyText };
}
export type PrebudgetDocument = ReturnType<typeof createPrebudgetDocument>;
