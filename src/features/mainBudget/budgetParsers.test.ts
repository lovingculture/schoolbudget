import { describe, expect, it } from "vitest";

import { logicalBudgetRows } from "./__fixtures__/logicalBudgetRows";
import { parseBudgetSummary } from "./parseBudgetSummary";
import { parseExpenditureStatement } from "./parseExpenditureStatement";
import { parseRevenueStatement } from "./parseRevenueStatement";

const revenueHeader = ["장", "관", "항", "목", "원가통계비목", "예산액"];
const expenditureHeader = ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액"];

describe("본예산 공통 구역 파서", () => {
  it("PDF 행의 배열 열이 달라도 좌표로 현재 예산액과 비목을 맞춘다", () => {
    const at = (x: number, width: number) => ({ x, y: 0, width, height: 10 });
    const rows = [
      { cells: ["가람초등학교", "2026회계연도", "본예산"], coordinates: [at(10, 50), at(70, 50), at(130, 30)], sourcePage: 1, sourceRow: 1, confidence: 0.99 },
      { cells: ["세입 세출 예산 총괄"], coordinates: [at(10, 100)], sourcePage: 1, sourceRow: 2, confidence: 0.99 },
      { cells: ["예산액"], coordinates: [at(100, 30)], sourcePage: 1, sourceRow: 3, confidence: 0.99 },
      { cells: ["본예산", "1,010,749"], coordinates: [at(10, 30), at(94, 36)], sourcePage: 1, sourceRow: 4, confidence: 0.99 },
      { cells: ["세입예산명세서"], coordinates: [at(10, 100)], sourcePage: 2, sourceRow: 1, confidence: 0.99 },
      { cells: ["원가통계비목"], coordinates: [at(40, 60)], sourcePage: 2, sourceRow: 2, confidence: 0.99 },
      { cells: ["예산액"], coordinates: [at(140, 30)], sourcePage: 2, sourceRow: 3, confidence: 0.99 },
      { cells: ["목적사업비전입금", 0, 6_660], coordinates: [at(30, 68), at(166, 4), at(190, 24)], sourcePage: 2, sourceRow: 4, confidence: 0.99 },
      { cells: ["수익자부담수입", 207_176, 0], coordinates: [at(30, 64), at(142, 28), at(190, 4)], sourcePage: 2, sourceRow: 5, confidence: 0.99 },
      { cells: ["학교운영비전입금", 721_573], coordinates: [at(30, 68), at(142, 28)], sourcePage: 2, sourceRow: 6, confidence: 0.99 },
      { cells: ["이자수입", 2_000], coordinates: [at(55, 30), at(150, 20)], sourcePage: 2, sourceRow: 7, confidence: 0.99 },
      { cells: ["순세계잉여금", 80_000], coordinates: [at(45, 50), at(146, 24)], sourcePage: 2, sourceRow: 8, confidence: 0.99 },
      { cells: ["세입합계", 1_010_749], coordinates: [at(45, 40), at(134, 36)], sourcePage: 2, sourceRow: 9, confidence: 0.99 },
      { cells: ["세출예산명세서"], coordinates: [at(10, 100)], sourcePage: 3, sourceRow: 1, confidence: 0.99 },
      {
        cells: ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목"],
        coordinates: [at(10, 30), at(45, 30), at(80, 30), at(115, 30), at(150, 60)],
        sourcePage: 3,
        sourceRow: 2,
        confidence: 0.99,
      },
      { cells: ["예산액"], coordinates: [at(230, 30)], sourcePage: 3, sourceRow: 3, confidence: 0.99 },
      {
        cells: ["교육활동", "교육지원", "학생지원", "학부모협력", "일반업무추진비", 23_020],
        coordinates: [at(10, 30), at(45, 30), at(80, 30), at(115, 30), at(145, 65), at(236, 24)],
        sourcePage: 3,
        sourceRow: 4,
        confidence: 0.99,
      },
      { cells: ["세출합계", 23_020], coordinates: [at(45, 40), at(236, 24)], sourcePage: 3, sourceRow: 5, confidence: 0.99 },
    ];

    expect(parseBudgetSummary(rows)).toMatchObject({ isComplete: true, totalRevenue: { amount: 1_010_749 } });
    expect(parseRevenueStatement(rows)).toMatchObject({
      purposeRevenue: { amount: 0 },
      beneficiaryRevenue: { amount: 207_176 },
      verificationRevenue: { isComplete: true },
    });
    expect(parseExpenditureStatement(rows)).toMatchObject({
      isComplete: true,
      expenses: [expect.objectContaining({ costItem: "일반업무추진비", amount: 23_020 })],
    });
  });

  it("띄어쓴 총괄 제목과 2026회계연도 예산안을 확인한 후 현재 예산액을 읽는다", () => {
    const summary = parseBudgetSummary(logicalBudgetRows);

    expect(summary.isComplete).toBe(true);
    expect(summary.identity).toEqual({ schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" });
    expect(summary.budgetTypeEvidence).toBe("generic");
    expect(summary.hasValidStructure).toBe(true);
    expect(summary.totalRevenue).toEqual({
      label: "세입예산총액",
      amount: 1_010_749,
      row: logicalBudgetRows[3],
    });
    expect(summary.warnings).toEqual([]);
  });

  it("추가경정·추경·성립전·결산 표시는 본예산 정체성으로 허용하지 않는다", () => {
    for (const marker of ["제1회 추가경정예산", "추경예산", "성립전예산", "2026학년도 결산서"]) {
      const rows = logicalBudgetRows.map((row, index) => index === 0
        ? { ...row, cells: ["가람초등학교", marker] }
        : row);
      const summary = parseBudgetSummary(rows);

      expect(summary.identity, marker).toBeNull();
      expect(summary.isComplete, marker).toBe(false);
      expect(summary.warnings, marker).toContainEqual(expect.objectContaining({ code: "NON_MAIN_BUDGET_MARKER", row: rows[0] }));
    }
  });

  it("추경 제목 뒤에 성립 이전 법령 문구가 이어져도 본예산으로 허용하지 않는다", () => {
    const rows = logicalBudgetRows.map((row, index) => index === 0
      ? { ...row, cells: ["가람초등학교", "2026학년도 제1회 추가경정예산안 추가경정예산의 성립 이전"] }
      : row);

    const summary = parseBudgetSummary(rows);

    expect(summary.identity).toBeNull();
    expect(summary.isComplete).toBe(false);
    expect(summary.warnings).toContainEqual(expect.objectContaining({
      code: "NON_MAIN_BUDGET_MARKER",
      row: rows[0],
    }));
  });

  it("긴 예산총칙 문장 속 추가경정 언급은 본예산 표지를 무효화하지 않는다", () => {
    const rows = [
      ...logicalBudgetRows.slice(0, 1),
      { cells: ["제3조 지정 경비는 추가경정예산의 성립 이전에 사용할 수 있으며 차기 추가경정예산에 계상한다."], sourcePage: 1, confidence: 0.99 },
      ...logicalBudgetRows.slice(1),
    ];

    expect(parseBudgetSummary(rows)).toMatchObject({
      identity: { schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" },
      isComplete: true,
    });
  });

  it("OCR로 분리된 예산총칙 법령 문구도 본예산 표지를 무효화하지 않는다", () => {
    const rows = [
      ...logicalBudgetRows.slice(0, 1),
      { cells: ["불가피한 사유로 추가경정예산을 편성하지 못할 경우 학교운영위원회의 심의를 받은 것으로 간주 처리한다."], sourcePage: 3, sourceRow: 23, confidence: 0.85 },
      ...logicalBudgetRows.slice(1),
    ];

    expect(parseBudgetSummary(rows)).toMatchObject({
      identity: { schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" },
    });
  });

  it("OCR 표의 세부 머리글이 유실돼도 출처 있는 확인 경고와 함께 세 구역 구조를 보존한다", () => {
    const rows = [
      { cells: ["가람초등학교", "2026학년도 본예산"], sourcePage: 1, sourceRow: 1, confidence: 0.92 },
      { cells: ["세입세출예산서"], sourcePage: 3, sourceRow: 1, confidence: 0.91 },
      { cells: ["예산총칙"], sourcePage: 3, sourceRow: 2, confidence: 0.94 },
      { cells: ["2026년도 가람초등학교회계 세입세출예산총액은", "1,020,223,000원"], sourcePage: 3, sourceRow: 3, confidence: 0.72 },
      { cells: ["세입예산명세서"], sourcePage: 5, sourceRow: 1, confidence: 0.9 },
      { cells: ["구분"], sourcePage: 5, sourceRow: 2, confidence: 0.93 },
      { cells: ["예산액", "산출기초", "비고"], sourcePage: 6, sourceRow: 3, confidence: 0.29 },
      { cells: ["학교운영비전입금", "650,605"], sourcePage: 6, sourceRow: 4, confidence: 0.42 },
      { cells: ["세출예산명세서"], sourcePage: 8, sourceRow: 1, confidence: 0.91 },
      { cells: ["구분"], sourcePage: 8, sourceRow: 2, confidence: 0.88 },
      { cells: ["예산액", "산출기초"], sourcePage: 10, sourceRow: 3, confidence: 0.51 },
      { cells: ["일반업무추진비", "1,050,000"], sourcePage: 10, sourceRow: 4, confidence: 0.34 },
      { cells: ["세출예산명세서"], sourcePage: 11, sourceRow: 1, confidence: 0.89 },
      { cells: ["일반업무추진비", "60,000"], sourcePage: 11, sourceRow: 2, confidence: 0.27 },
    ];

    const summary = parseBudgetSummary(rows);
    const revenue = parseRevenueStatement(rows);
    const expenditure = parseExpenditureStatement(rows);

    expect(summary.hasValidStructure).toBe(true);
    expect(revenue.hasValidStructure).toBe(true);
    expect(expenditure.hasValidStructure).toBe(true);
    expect(summary.totalRevenue.amount).toBeNull();
    expect(revenue.beneficiaryRevenue.amount).toBeNull();
    expect(expenditure.isComplete).toBe(false);
    for (const warning of [...summary.warnings, ...revenue.warnings, ...expenditure.warnings]
      .filter(({ code }) => code.includes("OCR_REVIEW"))) {
      expect(warning.row).toMatchObject({ sourcePage: expect.any(Number), sourceRow: expect.any(Number) });
    }
    expect(summary.warnings.find(({ code }) => code === "TOTAL_REVENUE")?.row)
      .toMatchObject({ sourcePage: 3, sourceRow: 3 });
    expect(revenue.warnings.find(({ code }) => code === "PURPOSE_REVENUE")?.row)
      .toMatchObject({ sourcePage: 6, sourceRow: 4 });
    expect(revenue.warnings.find(({ code }) => code === "BENEFICIARY_REVENUE")?.row)
      .toMatchObject({ sourcePage: 6, sourceRow: 4 });
  });

  it("OCR이 예산액 머리글까지 놓친 경우 본예산·단위·구분·본문·구역 경계를 함께 확인해야만 검토 구조로 인정한다", () => {
    const rows = [
      { cells: ["세입예산명세서"], sourcePage: 5, sourceRow: 1, confidence: 0.92 },
      { cells: ["예산", "본예산", "단위", "천원"], sourcePage: 5, sourceRow: 2, confidence: 0.31 },
      { cells: ["구분"], sourcePage: 5, sourceRow: 3, confidence: 0.8 },
      { cells: ["학교운영비전입금", "13,354"], sourcePage: 5, sourceRow: 4, confidence: 0.42 },
      { cells: ["세출예산명세서"], sourcePage: 6, sourceRow: 1, confidence: 0.86 },
      { cells: ["예산", "본예산", "단위", "천원"], sourcePage: 6, sourceRow: 2, confidence: 0.33 },
      { cells: ["구분"], sourcePage: 6, sourceRow: 3, confidence: 0.78 },
      { cells: ["교직원복지", "15,620"], sourcePage: 6, sourceRow: 4, confidence: 0.52 },
      { cells: ["세출예산명세서"], sourcePage: 7, sourceRow: 1, confidence: 0.91 },
    ];

    expect(parseRevenueStatement(rows)).toMatchObject({ hasValidStructure: true });
    expect(parseExpenditureStatement(rows)).toMatchObject({ hasValidStructure: true, isComplete: false });
  });

  it("번호 접두어를 제거하고 상위·하위 수익자부담수입을 중복 집계하지 않는다", () => {
    const revenue = parseRevenueStatement(logicalBudgetRows);

    expect(revenue.purposeRevenue).toEqual({ label: "목적사업비전입금", amount: 0, row: logicalBudgetRows[8] });
    expect(revenue.beneficiaryRevenue).toEqual({ label: "수익자부담수입", amount: 207_176, row: logicalBudgetRows[10] });
    expect(revenue.verificationRevenue.isComplete).toBe(true);
    expect(revenue.verificationRevenue.facts).toEqual([
      { label: "학교운영비전입금", amount: 721_573, row: logicalBudgetRows[11] },
      { label: "사용료", amount: 0, inferredAbsent: true, row: logicalBudgetRows[4] },
      { label: "수수료", amount: 0, inferredAbsent: true, row: logicalBudgetRows[4] },
      { label: "자산매각대", amount: 0, inferredAbsent: true, row: logicalBudgetRows[4] },
      { label: "지난년도수입", amount: 0, inferredAbsent: true, row: logicalBudgetRows[4] },
      { label: "이자수입", amount: 2_000, row: logicalBudgetRows[12] },
      { label: "기타행정활동수입", amount: 0, inferredAbsent: true, row: logicalBudgetRows[4] },
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

  it("신뢰도 높은 일반업무추진비 한 글자 오인식은 정확 집계에서 제외하고 미완료 경고를 남긴다", () => {
    const nearMissRow = { cells: ["", "", "", "", "3.일반업무추진버", 999], sourcePage: 11, sourceRow: 9, confidence: 0.96 };
    const rows = [...logicalBudgetRows.slice(0, -1), nearMissRow, logicalBudgetRows.at(-1)!];

    const expenditure = parseExpenditureStatement(rows);

    expect(expenditure.expenses.map((expense) => expense.amount)).toEqual([10_000, 13_020]);
    expect(expenditure.isComplete).toBe(false);
    expect(expenditure.warnings).toContainEqual(expect.objectContaining({
      code: "NEAR_MATCH_GENERAL_BUSINESS_EXPENSE",
      row: nearMissRow,
    }));
    expect(expenditure.warnings).not.toContainEqual(expect.objectContaining({ row: logicalBudgetRows[25] }));
  });

  it("신뢰도 높은 필수 세입 항목 한 글자 오인식은 0원 추론을 막고 출처 경고를 남긴다", () => {
    const nearMissRow = { cells: ["", "", "", "", "1.사용러", 123], sourcePage: 4, sourceRow: 20, confidence: 0.97 };
    const rows = [...logicalBudgetRows.slice(0, 14), nearMissRow, ...logicalBudgetRows.slice(14)];

    const revenue = parseRevenueStatement(rows);

    expect(revenue.verificationRevenue.isComplete).toBe(false);
    expect(revenue.verificationRevenue.facts.find((fact) => fact.label === "사용료")?.amount).toBeNull();
    expect(revenue.warnings).toContainEqual(expect.objectContaining({ code: "NEAR_MATCH_REVENUE_LABEL", row: nearMissRow }));
  });

  it("병합된 상위 세입 분류가 필수 항목과 한 글자만 달라도 오인식으로 취급하지 않는다", () => {
    const rows = logicalBudgetRows.map((row, index) => index === 6
      ? { ...row, cells: ["1.이전수입", "1.이전수입", "1.이전수입", "1.이전수입", "1.이전수입", 721_573, 700_000] }
      : row);

    const revenue = parseRevenueStatement(rows);

    expect(revenue.verificationRevenue.isComplete).toBe(true);
    expect(revenue.warnings).not.toContainEqual(expect.objectContaining({ code: "NEAR_MATCH_REVENUE_LABEL" }));
  });

  it("총액과 차감 항목의 신뢰도 높은 한 글자 오인식도 필수 세입 경고로 남긴다", () => {
    const summaryRows = logicalBudgetRows.map((row, index) => index === 3
      ? { ...row, cells: ["세입예산총앱", "1,010,749", "900,000"], confidence: 0.97 }
      : row);
    const purposeRows = logicalBudgetRows.map((row, index) => index === 8
      ? { ...row, cells: ["", "", "", "", "1.목적사업비전입건", 0, 50_000], confidence: 0.97 }
      : row);

    expect(parseBudgetSummary(summaryRows).warnings).toContainEqual(expect.objectContaining({
      code: "NEAR_MATCH_REVENUE_LABEL",
      row: summaryRows[3],
    }));
    const revenue = parseRevenueStatement(purposeRows);
    expect(revenue.purposeRevenue.amount).toBeNull();
    expect(revenue.verificationRevenue.isComplete).toBe(false);
    expect(revenue.warnings).toContainEqual(expect.objectContaining({
      code: "NEAR_MATCH_REVENUE_LABEL",
      row: purposeRows[8],
    }));
  });

  it("구조가 완전하고 의심 행이 없으면 생략된 차감 항목을 출처 있는 0원 사실로 추론한다", () => {
    const rows = logicalBudgetRows.filter((_row, index) => ![8, 10].includes(index));

    const revenue = parseRevenueStatement(rows);

    expect(revenue.hasValidStructure).toBe(true);
    expect(revenue.purposeRevenue).toMatchObject({ amount: 0, inferredAbsent: true, row: expect.objectContaining({ sourcePage: 3 }) });
    expect(revenue.beneficiaryRevenue).toMatchObject({ amount: 0, inferredAbsent: true, row: expect.objectContaining({ sourcePage: 3 }) });
    expect(revenue.verificationRevenue.isComplete).toBe(true);
    expect(revenue.verificationRevenue.facts.find((fact) => fact.label === "사용료"))
      .toMatchObject({ amount: 0, inferredAbsent: true, row: expect.objectContaining({ sourcePage: 3 }) });
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
