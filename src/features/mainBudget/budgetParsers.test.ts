import { describe, expect, it } from "vitest";

import { logicalBudgetRows } from "./__fixtures__/logicalBudgetRows";
import { parseBudgetSummary } from "./parseBudgetSummary";
import { parseExpenditureStatement } from "./parseExpenditureStatement";
import { parseRevenueStatement } from "./parseRevenueStatement";

const revenueHeader = ["장", "관", "항", "목", "원가통계비목", "예산액"];
const expenditureHeader = ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액"];

describe("본예산 공통 구역 파서", () => {
  it("띄어쓴 총괄 제목과 2026회계연도 예산안을 확인한 후 현재 예산액을 읽는다", () => {
    const summary = parseBudgetSummary(logicalBudgetRows);

    expect(summary.isComplete).toBe(true);
    expect(summary.totalRevenue).toEqual({
      label: "세입예산총액",
      amount: 1_010_749,
      row: logicalBudgetRows[3],
    });
    expect(summary.warnings).toEqual([]);
  });

  it("번호 접두어를 제거하고 상위·하위 수익자부담수입을 중복 집계하지 않는다", () => {
    const revenue = parseRevenueStatement(logicalBudgetRows);

    expect(revenue.purposeRevenue).toEqual({ label: "목적사업비전입금", amount: 0, row: logicalBudgetRows[8] });
    expect(revenue.beneficiaryRevenue).toEqual({ label: "수익자부담수입", amount: 207_176, row: logicalBudgetRows[10] });
    expect(revenue.verificationRevenue.isComplete).toBe(true);
    expect(revenue.verificationRevenue.facts).toEqual([
      { label: "학교운영비전입금", amount: 721_573, row: logicalBudgetRows[11] },
      { label: "사용료", amount: 0 },
      { label: "수수료", amount: 0 },
      { label: "자산매각대", amount: 0 },
      { label: "지난년도수입", amount: 0 },
      { label: "이자수입", amount: 2_000, row: logicalBudgetRows[12] },
      { label: "기타행정활동수입", amount: 0 },
      { label: "순세계잉여금", amount: 80_000, row: logicalBudgetRows[13] },
    ]);
  });

  it("페이지가 바뀌어도 계층을 유지하고 정확히 일치하는 일반업무추진비만 수집한다", () => {
    const expenditure = parseExpenditureStatement(logicalBudgetRows);

    expect(expenditure.isComplete).toBe(true);
    expect(expenditure.expenses).toHaveLength(2);
    expect(expenditure.expenses.every((row) => row.costItem === "일반업무추진비")).toBe(true);
    expect(expenditure.expenses.reduce((sum, row) => sum + (row.amount ?? 0), 0)).toBe(23_020);
    expect(expenditure.expenses[1]).toMatchObject({
      policy: "교육활동",
      unit: "교육지원",
      business: "학생지원",
      detail: "학부모협력",
      row: logicalBudgetRows[24],
    });
    expect(logicalBudgetRows[25].cells).toContain("3.목적사업업무추진비");
    expect(expenditure.expenses.some((row) => row.amount === 99_000)).toBe(false);
  });

  it("관련 구역과 현재 예산액 열을 모두 확인해야만 완전한 목록으로 표시한다", () => {
    const withoutCurrentBudget = logicalBudgetRows.map((row) => ({ ...row, cells: row.cells.map((cell) => cell === "예산액" || cell === "본예산액(A)" ? "전년도예산액" : cell) }));

    const incompleteRevenue = parseRevenueStatement(withoutCurrentBudget).verificationRevenue;
    expect(incompleteRevenue.isComplete).toBe(false);
    expect(incompleteRevenue.facts.every((fact) => fact.amount === null)).toBe(true);
    expect(parseExpenditureStatement(withoutCurrentBudget).isComplete).toBe(false);
    expect(parseExpenditureStatement(logicalBudgetRows.filter((row) => !String(row.cells[0]).replace(/\s/g, "").includes("세출예산명세서"))).isComplete).toBe(false);
  });

  it("엑셀 병합 앵커가 열마다 반복되어도 로컬 머리글을 기준으로 파싱한다", () => {
    const repeatedMergeAnchors = logicalBudgetRows.map((row) => ({
      ...row,
      cells: row.cells.flatMap((cell) => [cell, cell]),
    }));

    expect(parseBudgetSummary(repeatedMergeAnchors).totalRevenue.amount).toBe(1_010_749);
    expect(parseRevenueStatement(repeatedMergeAnchors).beneficiaryRevenue.amount).toBe(207_176);
    expect(parseExpenditureStatement(repeatedMergeAnchors).expenses.map((expense) => expense.amount)).toEqual([10_000, 13_020]);
  });

  it("머리글만 있는 잘린 구역을 완전한 0원 목록으로 확정하지 않는다", () => {
    const truncatedRevenue = [
      { cells: ["세입예산명세서"], sourcePage: 1, confidence: 0.99 },
      { cells: revenueHeader, sourcePage: 1, confidence: 0.99 },
    ];
    const truncatedExpenditure = [
      { cells: ["세출예산명세서"], sourcePage: 2, confidence: 0.99 },
      { cells: expenditureHeader, sourcePage: 2, confidence: 0.99 },
    ];

    const revenue = parseRevenueStatement(truncatedRevenue);
    expect(revenue.verificationRevenue.isComplete).toBe(false);
    expect(revenue.verificationRevenue.facts.every((fact) => fact.amount === null)).toBe(true);
    expect(revenue.warnings).toContainEqual(expect.objectContaining({ code: "REVENUE_SECTION_INCOMPLETE" }));
    const expenditure = parseExpenditureStatement(truncatedExpenditure);
    expect(expenditure).toMatchObject({ expenses: [], isComplete: false });
    expect(expenditure.warnings).toContainEqual(expect.objectContaining({ code: "EXPENDITURE_SECTION_INCOMPLETE" }));
  });

  it("낮은 신뢰도의 필수 행은 출처와 값을 유지하지만 관련 결과를 미완료로 만든다", () => {
    const lowSummaryRows = logicalBudgetRows.map((row, index) => index === 3 ? { ...row, confidence: 0.3 } : row);
    const lowMarkerRows = logicalBudgetRows.map((row, index) => index === 0 ? { ...row, confidence: 0.3 } : row);
    const lowRevenueRows = logicalBudgetRows.map((row, index) => index === 10 ? { ...row, confidence: 0.3 } : row);
    const lowExpenseRows = logicalBudgetRows.map((row, index) => index === 20 ? { ...row, confidence: 0.3 } : row);

    const summary = parseBudgetSummary(lowSummaryRows);
    expect(summary.totalRevenue).toMatchObject({ amount: 1_010_749, row: lowSummaryRows[3] });
    expect(summary.isComplete).toBe(false);
    expect(parseBudgetSummary(lowMarkerRows).isComplete).toBe(false);
    const revenue = parseRevenueStatement(lowRevenueRows);
    expect(revenue.beneficiaryRevenue).toMatchObject({ amount: 207_176, row: lowRevenueRows[10] });
    expect(revenue.verificationRevenue.isComplete).toBe(false);
    expect(revenue.warnings).toContainEqual(expect.objectContaining({ code: "LOW_CONFIDENCE_REVENUE" }));
    const expenditure = parseExpenditureStatement(lowExpenseRows);
    expect(expenditure.expenses[0]).toMatchObject({ amount: 10_000, row: lowExpenseRows[20] });
    expect(expenditure.isComplete).toBe(false);
    expect(expenditure.warnings).toContainEqual(expect.objectContaining({ code: "LOW_CONFIDENCE_EXPENSE" }));
  });

  it("세출 합계 뒤의 다른 시트 표를 세출 구역으로 포함하지 않는다", () => {
    const appendixRows = [
      ...logicalBudgetRows,
      { cells: ["부록"], sourceSheet: "부록", sourceRow: 1, confidence: 0.99 },
      { cells: expenditureHeader, sourceSheet: "부록", sourceRow: 2, confidence: 0.99 },
      { cells: ["부록정책", "부록단위", "부록사업", "부록항목", "일반업무추진비", 999_999], sourceSheet: "부록", sourceRow: 3, confidence: 0.99 },
    ];

    expect(parseExpenditureStatement(appendixRows).expenses.map((expense) => expense.amount)).toEqual([10_000, 13_020]);
  });

  it("계층 머리글이 예산액 머리글 바로 위에 있는 2행 머리글을 인식한다", () => {
    const rows = [
      { cells: ["세입예산명세서"], sourcePage: 1, confidence: 0.99 },
      { cells: ["장", "관", "항", "목", "원가통계비목", ""], sourcePage: 1, confidence: 0.99 },
      { cells: ["", "", "", "", "", "예산액"], sourcePage: 1, confidence: 0.99 },
      { cells: ["", "", "", "", "목적사업비전입금", 0], sourcePage: 1, confidence: 0.99 },
      { cells: ["", "", "", "", "수익자부담수입", 20], sourcePage: 1, confidence: 0.99 },
      { cells: ["세출예산명세서"], sourcePage: 2, confidence: 0.99 },
      { cells: ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", ""], sourcePage: 2, confidence: 0.99 },
      { cells: ["", "", "", "", "", "예산액"], sourcePage: 2, confidence: 0.99 },
      { cells: ["정책값", "단위값", "사업값", "항목값", "일반업무추진비", 30], sourcePage: 2, confidence: 0.99 },
      { cells: ["세출합계", "", "", "", "", 30], sourcePage: 2, confidence: 0.99 },
    ];

    expect(parseRevenueStatement(rows).beneficiaryRevenue.amount).toBe(20);
    expect(parseExpenditureStatement(rows)).toMatchObject({ isComplete: true, expenses: [{ amount: 30 }] });
  });

  it("선택적 병합 반복을 유지하되 새 부모가 시작되면 이전 하위 계층을 지운다", () => {
    const rows = [
      { cells: ["세출예산명세서"], sourceSheet: "표지", sourceRow: 1 },
      { cells: expenditureHeader, sourceSheet: "표지", sourceRow: 2 },
      { cells: ["1.정책A", "1.단위A", "1.사업A", "1.항목A", "", 100], sourceSheet: "표지", sourceRow: 3 },
      { cells: ["정책A", "단위A", "사업A", "항목A", "1.일반업무추진비", 10], sourceSheet: "표지", sourceRow: 4 },
      { cells: ["2.정책B", "", "", "", "", 200], sourceSheet: "표지", sourceRow: 5 },
      { cells: ["정책B", "", "", "", "2.일반업무추진비", 20], sourceSheet: "표지", sourceRow: 6 },
      { cells: ["세출합계", "", "", "", "", 30], sourceSheet: "표지", sourceRow: 7 },
    ];

    expect(parseExpenditureStatement(rows).expenses).toEqual([
      expect.objectContaining({ policy: "정책A", unit: "단위A", business: "사업A", detail: "항목A", amount: 10 }),
      expect.objectContaining({ policy: "정책B", unit: "", business: "", detail: "", amount: 20 }),
    ]);
  });

  it("인식하지 못한 낮은 신뢰도 세입 본문 행은 0원 확정을 막고 출처 경고를 남긴다", () => {
    const unreadableRow = { cells: ["", "", "", "", "1.ㅅㅏ용ㄹㅛ", 123, 0], sourcePage: 4, confidence: 0.3 };
    const rows = [...logicalBudgetRows.slice(0, 14), unreadableRow, ...logicalBudgetRows.slice(14)];

    const revenue = parseRevenueStatement(rows);
    expect(revenue.verificationRevenue.isComplete).toBe(false);
    expect(revenue.verificationRevenue.facts.find((fact) => fact.label === "사용료")?.amount).toBeNull();
    expect(revenue.warnings).toContainEqual(expect.objectContaining({ code: "LOW_CONFIDENCE_REVENUE_ROW", row: unreadableRow }));
  });

  it("인식하지 못한 낮은 신뢰도 세출 본문 행은 빈 집계를 완료로 확정하지 않는다", () => {
    const unreadableRow = { cells: ["", "", "", "", "3.ㅇㅣㄹ반업무추진비", 999, 0], sourcePage: 11, confidence: 0.3 };
    const rows = [...logicalBudgetRows.slice(0, -1), unreadableRow, logicalBudgetRows.at(-1)!];

    const expenditure = parseExpenditureStatement(rows);
    expect(expenditure.expenses.map((expense) => expense.amount)).toEqual([10_000, 13_020]);
    expect(expenditure.isComplete).toBe(false);
    expect(expenditure.warnings).toContainEqual(expect.objectContaining({ code: "LOW_CONFIDENCE_EXPENDITURE_ROW", row: unreadableRow }));
  });

  it("낮은 신뢰도의 총괄 제목과 머리글을 각각 출처가 있는 경고로 표시한다", () => {
    const lowHeadingRows = logicalBudgetRows.map((row, index) => index === 1 ? { ...row, confidence: 0.3 } : row);
    const lowHeaderRows = logicalBudgetRows.map((row, index) => index === 2 ? { ...row, confidence: 0.3 } : row);

    expect(parseBudgetSummary(lowHeadingRows).warnings).toContainEqual(expect.objectContaining({ code: "LOW_CONFIDENCE_BUDGET_SUMMARY_HEADING", row: lowHeadingRows[1] }));
    expect(parseBudgetSummary(lowHeaderRows).warnings).toContainEqual(expect.objectContaining({ code: "LOW_CONFIDENCE_BUDGET_SUMMARY_HEADER", row: lowHeaderRows[2] }));
  });

  it("다른 시트가 같은 세출 제목으로 시작해도 기존 세출 구역을 종료한다", () => {
    const rows = [
      { cells: ["세출예산명세서"], sourceSheet: "본문", sourceRow: 1 },
      { cells: expenditureHeader, sourceSheet: "본문", sourceRow: 2 },
      { cells: ["정책값", "단위값", "사업값", "항목값", "1.일반업무추진비", 10], sourceSheet: "본문", sourceRow: 3 },
      { cells: ["세출예산명세서"], sourceSheet: "부록", sourceRow: 1 },
      { cells: expenditureHeader, sourceSheet: "부록", sourceRow: 2 },
      { cells: ["부록정책", "부록단위", "부록사업", "부록항목", "1.일반업무추진비", 999], sourceSheet: "부록", sourceRow: 3 },
      { cells: ["세출합계", "", "", "", "", 999], sourceSheet: "부록", sourceRow: 4 },
    ];

    expect(parseExpenditureStatement(rows)).toMatchObject({
      isComplete: true,
      expenses: [expect.objectContaining({ amount: 10, row: rows[2] })],
      warnings: [],
    });
  });

  it("세입 구역도 명세서 제목을 반복하는 다른 시트 앞에서 종료한다", () => {
    const rows = [
      { cells: ["세입예산명세서"], sourceSheet: "본문", sourceRow: 1 },
      { cells: revenueHeader, sourceSheet: "본문", sourceRow: 2 },
      { cells: ["", "", "", "", "목적사업비전입금", 0], sourceSheet: "본문", sourceRow: 3 },
      { cells: ["", "", "", "", "수익자부담수입", 20], sourceSheet: "본문", sourceRow: 4 },
      { cells: ["세입예산명세서"], sourceSheet: "부록", sourceRow: 1 },
      { cells: revenueHeader, sourceSheet: "부록", sourceRow: 2 },
      { cells: ["", "", "", "", "수익자부담수입", 999], sourceSheet: "부록", sourceRow: 3 },
      { cells: ["", "", "", "", "학교운영비전입금", 999], sourceSheet: "부록", sourceRow: 4 },
      { cells: ["세입합계", "", "", "", "", 999], sourceSheet: "부록", sourceRow: 5 },
    ];

    const revenue = parseRevenueStatement(rows);
    expect(revenue.beneficiaryRevenue).toMatchObject({ amount: 20, row: rows[3] });
    expect(revenue.verificationRevenue.isComplete).toBe(true);
    expect(revenue.verificationRevenue.facts.find((fact) => fact.label === "학교운영비전입금")?.amount).toBe(0);
  });
});
