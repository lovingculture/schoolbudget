import { describe, expect, it } from "vitest";

import garakHigh from "../../../public/data/school-analysis/schools/B100000370_2025_202603.json";
import gangdongMiddle from "../../../public/data/school-analysis/schools/B100005540_2025_202603.json";
import seoulBeodeulElementary from "../../../public/data/school-analysis/schools/B100005384_2025_202603.json";
import {
  getExpenseInsights,
  getExpenseLevel,
  getIncomeLevel,
  getIncomeStructure,
  getRigidExpenseSummary,
  getSummaryMetrics,
  getTopExpenseItems,
} from "./calculations";
import type { BudgetDataset } from "./types";

const fixtures: Array<{
  dataset: BudgetDataset;
  expectedExpenseTotal: number;
  expectedIncomeRate: number;
  expectedExpensePath: string[];
  expectedExpenseChildPath: string[];
  expectedTopExpense: string;
}> = [
  {
    dataset: garakHigh as BudgetDataset,
    expectedExpenseTotal: 2_569_339_810,
    expectedIncomeRate: 99.94742150981246,
    expectedExpensePath: ["학생복지/교육격차 해소"],
    expectedExpenseChildPath: ["학생복지/교육격차 해소", "급식 관리"],
    expectedTopExpense: "급식재료구입비",
  },
  {
    dataset: gangdongMiddle as BudgetDataset,
    expectedExpenseTotal: 1_769_148_830,
    expectedIncomeRate: 99.99930620629297,
    expectedExpensePath: ["학교 일반운영"],
    expectedExpenseChildPath: ["학교 일반운영", "시설 장비 유지"],
    expectedTopExpense: "친환경무상급식비",
  },
  {
    dataset: seoulBeodeulElementary as BudgetDataset,
    expectedExpenseTotal: 2_477_057_263,
    expectedIncomeRate: 100.05177879726479,
    expectedExpensePath: ["선택적 교육활동"],
    expectedExpenseChildPath: ["선택적 교육활동", "방과후학교 운영"],
    expectedTopExpense: "급식재료구입비",
  },
];

describe("school settlement calculation parity", () => {
  it.each(fixtures)(
    "$dataset.summary.schoolName preserves bundle-one totals, hierarchy paths, and rates",
    ({
      dataset,
      expectedExpenseTotal,
      expectedIncomeRate,
      expectedExpensePath,
      expectedExpenseChildPath,
      expectedTopExpense,
    }) => {
      const expenseRoot = getExpenseLevel(dataset.expenseRows, 1, []);
      const expenseNode = getExpenseLevel(
        dataset.expenseRows,
        1,
        expectedExpensePath,
      );

      expect(
        expenseRoot.reduce((sum, row) => sum + row.settlementAmount, 0),
      ).toBe(expectedExpenseTotal);
      expect(expenseNode[0]?.path).toEqual(expectedExpenseChildPath);
      expect(
        getIncomeStructure(dataset.incomeRows, 1).incomeSettlementRate.rate,
      ).toBeCloseTo(expectedIncomeRate, 6);
      expect(getTopExpenseItems(dataset.expenseRows, 1, "settlementAmount")[0]?.name).toBe(
        expectedTopExpense,
      );
    },
  );

  it("derives summary, expense insights, rigid expenses, and income paths from stored rows", () => {
    const dataset = garakHigh as BudgetDataset;

    expect(getSummaryMetrics(dataset)).toMatchObject({
      incomeSettlementRate: 99.94742150981246,
      expenseExecutionRate: 99.23261544355825,
      surplus: 18_507_823,
    });
    expect(getIncomeLevel(dataset.incomeRows, 1, ["이전수입"])[0]?.path).toEqual([
      "이전수입",
      "지방자치단체이전수입",
    ]);
    expect(getExpenseInsights(dataset.expenseRows, 1).meal.settlementAmount).toBe(
      901_430_190,
    );
    expect(getRigidExpenseSummary(dataset.expenseRows, 1).totalExpenseSettlementAmount).toBe(
      2_569_339_810,
    );
  });
});
