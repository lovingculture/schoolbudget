import type { BudgetLogicalRow } from "../analysisTypes";

export const logicalBudgetRows: BudgetLogicalRow[] = [
  { cells: ["2026회계연도 예산안"], sourcePage: 1, confidence: 0.99 },
  { cells: ["세입 세출 예산 총괄"], sourcePage: 2, confidence: 0.98 },
  { cells: ["구분", "본예산액(A)", "전년도예산액"], sourcePage: 2, confidence: 0.97 },
  { cells: ["세입예산총액", "1,010,749", "900,000"], sourcePage: 2, confidence: 0.96 },

  { cells: ["세입 예산 명세서"], sourcePage: 3, confidence: 0.98 },
  { cells: ["장", "관", "항", "목", "원가통계비목", "예산액", "전년도예산액"], sourcePage: 3, confidence: 0.97 },
  { cells: ["1.이전수입", "", "", "", "", 721_573, 700_000], sourcePage: 3, confidence: 0.95 },
  { cells: ["", "", "", "1.목적사업비전입금", "", 0, 50_000], sourcePage: 3, confidence: 0.94 },
  { cells: ["", "", "", "", "1.목적사업비전입금", 0, 50_000], sourcePage: 3, confidence: 0.93 },
  { cells: ["", "", "", "2.수익자부담수입", "", 207_176, 200_000], sourcePage: 3, confidence: 0.92 },
  { cells: ["", "", "", "", "1.수익자부담수입", 207_176, 200_000], sourcePage: 3, confidence: 0.91 },
  { cells: ["", "", "", "", "1.학교운영비전입금", 721_573, 700_000], sourcePage: 3, confidence: 0.9 },
  { cells: ["", "", "", "", "1.이자수입", 2_000, 1_000], sourcePage: 4, confidence: 0.89 },
  { cells: ["", "", "", "", "1.순세계잉여금", 80_000, 70_000], sourcePage: 4, confidence: 0.88 },

  { cells: ["세출 예산 명세서"], sourcePage: 10, confidence: 0.98 },
  { cells: ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액", "전년도예산액"], sourcePage: 10, confidence: 0.97 },
  { cells: ["1.교육활동", "", "", "", "", 50_000, 40_000], sourcePage: 10, confidence: 0.96 },
  { cells: ["", "1.교육지원", "", "", "", 30_000, 20_000], sourcePage: 10, confidence: 0.95 },
  { cells: ["", "", "1.학생지원", "", "", 20_000, 10_000], sourcePage: 10, confidence: 0.94 },
  { cells: ["", "", "", "1.학생자치", "", 10_000, 5_000], sourcePage: 10, confidence: 0.93 },
  { cells: ["", "", "", "", "4.일반업무추진비", 10_000, 5_000], sourcePage: 10, confidence: 0.92 },
  { cells: ["세출예산명세서"], sourcePage: 11, confidence: 0.91 },
  { cells: ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액", "전년도예산액"], sourcePage: 11, confidence: 0.9 },
  { cells: ["", "", "", "2.학부모협력", "", 13_020, 10_000], sourcePage: 11, confidence: 0.89 },
  { cells: ["", "", "", "", "2.일반업무추진비", 13_020, 10_000], sourcePage: 11, confidence: 0.88 },
  { cells: ["", "", "", "", "3.목적사업업무추진비", 99_000, 0], sourcePage: 11, confidence: 0.87 },
];
