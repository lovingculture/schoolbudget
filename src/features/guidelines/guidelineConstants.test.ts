import { describe, expect, it } from "vitest";
import { GUIDELINE_PDF_URL, GUIDELINE_TITLE } from "./guidelineConstants";

describe("guideline constants", () => {
  it("provides the public guideline title and PDF path independently of page components", () => {
    expect(GUIDELINE_TITLE).toBe("2026학년도 학교회계 예산편성 기본지침");
    expect(GUIDELINE_PDF_URL).toBe("/guidelines/2026-school-budget-guideline.pdf");
  });
});
