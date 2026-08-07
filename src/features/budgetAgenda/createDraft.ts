import type { BudgetAgendaDraft, BudgetAgendaSource } from "./types";

function budgetLabel(budgetType: string) {
  const revised = budgetType.match(/추경\s*(\d+)\s*회|추경\s*(\d+)\s*차/);
  if (revised) return `${revised[1] ?? revised[2]}차 추경`;
  return budgetType.replace(/\s/g, "").includes("본예산") ? "본예산" : budgetType.trim();
}

export function createBudgetAgendaDraft(source: BudgetAgendaSource): BudgetAgendaDraft {
  const label = budgetLabel(source.budgetType);
  const revised = label.includes("추경");
  const budgetName = revised ? `${label}예산` : label;
  return {
    ...source,
    incomeRows: source.incomeRows.map(row => ({ ...row })),
    expenseRows: source.expenseRows.map(row => ({ ...row })),
    title: `${source.fiscalYear}학년도 ${source.schoolName} 회계 ${budgetName}(안)`,
    agendaNumber: "",
    proposalDate: "",
    proposer: "학교장",
    presenter: "행정실장",
    revisedBudgetLabel: "경정예산액(B)",
    previousBudgetLabel: "기정예산액(A)",
    reason: `${source.fiscalYear}학년도 학교회계 ${budgetName}을 심의 받고자 함`,
    basis: `가. 「초·중등교육법」 제30조의3(학교회계의 운영), 제32조(심의·자문사항)\n나. ${source.fiscalYear}학년도 학교회계 예산편성 기본지침`,
    contentTitle: revised ? "추경예산 편성 주요내용" : "예산 편성 주요내용",
    majorContents: ["", ""],
  };
}
