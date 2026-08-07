import * as XLSX from "xlsx";
import type { ClosingAgendaDraft } from "./types";

const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function exportClosingExcel(draft: ClosingAgendaDraft): Blob {
  const workbook = XLSX.utils.book_new();
  const summary = [
    [draft.title], [], ["안건번호", draft.agendaNumber, "제안연월일", draft.proposalDate],
    ["제안자", draft.proposer, "제안설명자", draft.presenter], [],
    ["제안 근거", draft.basis], ["제안 이유", draft.reason], [],
    ["구분", "예산액", "예산현액", "세입결산액", "세출결산액", "세계잉여금"],
    ["결산 총괄", draft.budget, draft.currentBudget, draft.incomeTotal, draft.expenseTotal, draft.surplus], [],
    ["세계잉여금 처리", "사고이월", "명시이월", "계속비이월", "보조금반환", "순세계잉여금"],
    ["금액", draft.carryovers.accident, draft.carryovers.specified, draft.carryovers.continuing, draft.subsidyReturn, draft.netSurplus],
    [], ["별첨", draft.attachment],
  ];
  const detail = [
    ["세입 결산내역"], ["장", "관", "결산액", "구성비"],
    ...draft.incomeRows.map(row => [row.chapter, row.section, row.amount, row.ratio]),
    ["합계", "", draft.incomeTotal, 100], [], ["세출 결산내역"],
    ["정책사업", "결산액", "구성비"],
    ...draft.expenseRows.map(row => [row.policy, row.amount, row.ratio]),
    ["합계", draft.expenseTotal, 100],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  const detailSheet = XLSX.utils.aoa_to_sheet(detail);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 24 }, { wch: 19 }, { wch: 19 }, { wch: 19 }, { wch: 19 }];
  detailSheet["!cols"] = [{ wch: 26 }, { wch: 34 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "안건설명서");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "세입세출 결산내역");
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([output], { type: MIME });
}
