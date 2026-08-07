import { describe, expect, it } from "vitest";
import { aggregateByUnitBusiness, calculateExecutionRow } from "./calculations";
import type { ExecutionRow } from "./types";

const row = (overrides: Partial<ExecutionRow> = {}): ExecutionRow => ({
  id: "1", policy: "정책", unitBusiness: "단위", detailBusiness: "세부", detailItem: "항목",
  account: "목", subAccount: "세목", costCategory: "일반수용비", description: "산출",
  budgetAmount: 1000, committedAmount: 400, paidAmount: 350, original: {},
  ...overrides,
});

describe("추경 검토 계산", () => {
  it("예산액(4)을 기준으로 잔액·불일치·집행률·추경가능액을 계산한다", () => {
    expect(calculateExecutionRow(row(), 100, -200)).toMatchObject({
      balance: 600, discrepancy: 50, executionRate: 40,
      plannedAmount: 100, availableSupplement: 500, supplementProposal: -200,
    });
  });

  it("예산액이 0원이면 집행률은 0이다", () => {
    expect(calculateExecutionRow(row({ budgetAmount: 0 }), 0, 0).executionRate).toBe(0);
  });

  it("정책사업과 단위사업별로 합산한다", () => {
    const summary = aggregateByUnitBusiness([
      calculateExecutionRow(row(), 100, 0),
      calculateExecutionRow(row({ id: "2", budgetAmount: 2000, committedAmount: 500, paidAmount: 450 }), 200, 0),
    ]);
    expect(summary).toEqual([expect.objectContaining({
      policy: "정책", unitBusiness: "단위", budgetAmount: 3000,
      committedAmount: 900, paidAmount: 800, balance: 2100, executionRate: 30,
    })]);
  });
});
