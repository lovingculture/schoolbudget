import { expect, it } from "vitest";
import type { MainBudgetExpenditureRow } from "./types";
import { summarizeExpenditures } from "./summarizeExpenditures";

it("세출 통합 행의 금액·부서·검토 건수를 요약한다", () => {
  const rows = [
    { department: "교육부", requestedAmount: 300000, priorRequestedAmount: 100000, issues: [{ code: "A", level: "warning", message: "", basis: "" }] },
    { department: "행정실", requestedAmount: undefined, priorRequestedAmount: 50000, issues: [{ code: "B", level: "review", message: "", basis: "" }] },
  ] as MainBudgetExpenditureRow[];
  expect(summarizeExpenditures(rows)).toMatchObject({ requestedTotal: 300000, priorTotal: 150000, variance: 150000, departmentCount: 2, rowCount: 2, unresolvedCount: 1, warningCount: 1, reviewCount: 1 });
});
