import { describe, expect, it } from "vitest";
import type { MainBudgetExpenditureRow } from "./types";
import { buildExpenditureWorkbook } from "./exportExpenditures";

const rows: MainBudgetExpenditureRow[] = [{
  id: "1", sourceFile: "교육부.xls", sourceSheet: "세출예산서식", sourceRow: 2,
  department: "교육부", business: "교육과정", detail: "교재", costCategory: "교육운영비",
  description: "교재", expression: "100000*2", originalRequestedAmount: 200000, requestedAmount: 200000,
  manager: "김담당", priorExpression: "100000", priorRequestedAmount: 100000, originalVariance: 100000, variance: 100000,
  issues: [{ code: "DUPLICATE_SUSPECTED", level: "warning", message: "중복 의심", basis: "동일 항목" }],
}];

describe("본예산 세출 통합 엑셀", () => {
  it("세출통합·파일현황·검토결과 시트를 생성하고 합계를 일치시킨다", async () => {
    const workbook = await buildExpenditureWorkbook(rows);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["세출통합", "파일현황", "검토결과"]);
    const integrated = workbook.getWorksheet("세출통합")!;
    expect(integrated.getCell("A4").value).toBe("교육부.xls");
    expect(integrated.getCell("M4").value).toBe(200000);
    expect(integrated.getCell("M5").result).toBe(200000);
    expect(integrated.views[0]).toMatchObject({ state: "frozen", ySplit: 3 });
    const review = workbook.getWorksheet("검토결과")!;
    expect(review.getCell("A4").value).toBe("주의");
    expect(review.getCell("G4").value).toBe("중복 의심");
  });
});
