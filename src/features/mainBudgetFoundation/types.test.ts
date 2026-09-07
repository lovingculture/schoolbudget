import { describe, expect, it } from "vitest";
import { combinedBudgetSampleText } from "./fixtures/combinedBudgetSample";

describe("본예산 기초자료 샘플", () => {
  it("contains both sections and source totals", () => {
    expect(combinedBudgetSampleText).toContain("세입예산명세서");
    expect(combinedBudgetSampleText).toContain('세입합계,"1,010,749"');
    expect(combinedBudgetSampleText).toContain("세출예산명세서");
    expect(combinedBudgetSampleText).toContain('세출합계,"1,010,749"');
  });
});
