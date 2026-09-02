import { describe, expect, it } from "vitest";

import { normalizeLabel, parseBudgetNumber, stripHierarchyPrefix } from "./normalizeBudgetValue";

describe("budget value normalization", () => {
  it("parses comma-separated and negative budget amounts", () => {
    expect(parseBudgetNumber("1,010,749")).toBe(1010749);
    expect(parseBudgetNumber("-6,660")).toBe(-6660);
  });

  it("parses finite integer amounts after removing allowed budget notation", () => {
    expect(parseBudgetNumber(" 23,020 천원 = ")).toBe(23020);
    expect(parseBudgetNumber(42)).toBe(42);
    expect(parseBudgetNumber("1.5")).toBeNull();
    expect(parseBudgetNumber("예산액")).toBeNull();
    expect(parseBudgetNumber(" ")).toBeNull();
  });

  it("removes only a leading hierarchy number from a label", () => {
    expect(stripHierarchyPrefix("4.일반업무추진비")).toBe("일반업무추진비");
    expect(stripHierarchyPrefix("일반업무추진비 4.0")).toBe("일반업무추진비 4.0");
  });

  it("normalizes whitespace in labels", () => {
    expect(normalizeLabel("세입 예산 명세서")).toBe("세입예산명세서");
    expect(normalizeLabel(null)).toBe("");
  });
});
