import type { BudgetLogicalRow } from "../analysisTypes";

function row(sourceRow: number, cells: unknown[]): BudgetLogicalRow {
  return { cells, sourceSheet: "세입예산명세서", sourceRow };
}

export const detailStatementRows2026: BudgetLogicalRow[] = [
  row(1, ["2026학년도 학교회계 세입예산명세서"]),
  row(39, ["세입예산명세서"]),
  row(40, ["장", "관", "항", "목", "원가통계비목", "예산액"]),
  row(131, ["세입합계"]),
  row(137, ["2026학년도 학교회계 세출예산명세서"]),
  row(138, ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액"]),
  row(735, ["세출합계"]),
];

export const detailStatementRows2025: BudgetLogicalRow[] = [
  row(2, ["2025학년도 학교회계 세입예산명세서"]),
  row(3, ["장", "관", "항", "목", "원가통계비목", "예산액"]),
  row(34, ["세입합계"]),
  row(40, ["2025학년도 학교회계 세출예산명세서"]),
  row(41, ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액"]),
  row(506, ["세출합계"]),
];
