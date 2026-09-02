import { describe, expect, it } from "vitest";

import { logicalBudgetRows } from "./__fixtures__/logicalBudgetRows";
import { parseBudgetSummary } from "./parseBudgetSummary";
import { parseExpenditureStatement } from "./parseExpenditureStatement";
import { parseRevenueStatement } from "./parseRevenueStatement";

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
});
