import { describe, expect, it } from "vitest";
import { combinedBudgetSampleText } from "./fixtures/combinedBudgetSample";
import { parseFoundationCsv } from "./parseFoundationCsv";

function bytes(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

describe("parseFoundationCsv", () => {
  it("parses one combined file without treating repeated page headings as data", () => {
    const result = parseFoundationCsv("000.csv", bytes(combinedBudgetSampleText));
    expect(result).toMatchObject({
      fiscalYear: 2026,
      budgetType: "본예산",
      sourceRevenueTotal: 1_010_749,
      sourceExpenseTotal: 1_010_749,
    });
    expect(result.revenueRows).toContainEqual(expect.objectContaining({
      chapter: "이전수입",
      division: "지방교육행정기관이전수입",
      costItem: "학교운영비전입금",
      currentAmount: 721_573,
    }));
    expect(result.revenueRows).toHaveLength(1);
    expect(result.expenseRows).toContainEqual(expect.objectContaining({
      policy: "인적자원 운용",
      detail: "교직원연수",
      costItem: "일반업무추진비",
      currentAmount: 640,
    }));
    expect(result.expenseRows).toHaveLength(2);
    expect(result.expenseRows.some((row) => row.costItem.includes("세출예산명세서"))).toBe(false);
  });

  it("finds sections after arbitrary leading and repeated rows", () => {
    const repeated = combinedBudgetSampleText.replace(
      ',,,,2.일반업무추진비',
      '2026학년도 세출예산명세서\r\n사업,예산액,전년도 예산액,비교증감,산출기초(원)\r\n정책,단위,세부,세부항목,원가통계비목\r\n,,,,2.일반업무추진비',
    );
    const result = parseFoundationCsv("shifted.csv", bytes(`안내문\r\n\r\n${repeated}`));
    expect(result.sourceRevenueTotal).toBe(1_010_749);
    expect(result.expenseRows.filter((row) => row.costItem === "일반업무추진비")).toHaveLength(1);
  });

  it.each([
    ["세입 누락", "2026학년도 세출예산명세서\r\n세출합계,10"],
    ["세출 누락", "2026학년도 세입예산명세서\r\n세입합계,10"],
  ])("rejects %s", (_label, text) => {
    expect(() => parseFoundationCsv("bad.csv", bytes(text))).toThrow(/세입|세출/);
  });
});
