import type { ClosingAgendaDraft, ClosingSource } from "./types";

export function createClosingDraft(source: ClosingSource): ClosingAgendaDraft {
  return {
    ...source,
    carryovers: { ...source.carryovers },
    incomeRows: source.incomeRows.map(row => ({ ...row })),
    expenseRows: source.expenseRows.map(row => ({ ...row })),
    title: `${source.fiscalYear}학년도 학교회계 세입·세출 결산(안)`,
    agendaNumber: "",
    proposalDate: "",
    proposer: "학교장",
    presenter: "행정실장",
    basis: "○ 초·중등교육법 제32조(기능) 심의 - 학교의 예산안 및 결산에 관한 사항",
    reason: `○ ${source.fiscalYear}학년도 학교회계 세입·세출 결산에 관한 사항에 대해 심의 및 공개`,
    attachment: `별첨 1. ${source.fiscalYear}학년도 결산서 및 부속자료 각 1부. 끝.`,
  };
}
