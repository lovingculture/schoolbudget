import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseFoundationExcel } from "./parseFoundationExcel";

function workbookBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const revenue = XLSX.utils.aoa_to_sheet([
    ["2026학년도 세입예산명세서"],
    ["예산구분 :", "본예산", "(단위 : 천원)"],
    ["장", "관", "항", "목", "원가통계비목", "예산액", "전년도예산액", "증감", "산출기초", "산출금액"],
    ["1. 이전수입", "1. 교육비특별회계", "1. 전입금", "1. 학교운영비", "1. 학교운영비전입금", "1,200", "1,100", "100", "1,200,000원 * 1교 =", "1,200,000"],
    ["세입합계", "1,200"],
  ]);
  const expense = XLSX.utils.aoa_to_sheet([
    ["2026학년도 세출예산명세서"],
    ["예산구분 :", "본예산", "(단위 : 천원)"],
    ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액", "전년도예산액", "증감", "산출기초", "산출금액"],
    ["1. 학교운영", "1. 기본운영", "1. 교무학사", "1. 일반운영", "1. 일반업무추진비", 1200, 1100, 100, "120,000원 * 10회 =", 1200000],
    ["세출합계", 1200],
  ]);
  XLSX.utils.book_append_sheet(workbook, revenue, "세입예산명세서");
  XLSX.utils.book_append_sheet(workbook, expense, "세출예산명세서");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function wideEdufineWorkbookBytes(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];
  const put = (row: number, values: Record<number, string | number>) => {
    rows[row] = [];
    Object.entries(values).forEach(([column, value]) => { rows[row][Number(column)] = value; });
  };

  put(0, { 0: "2023학년도 세입예산명세서" });
  put(2, { 0: "예산구분 :", 7: "본예산", 19: "(단위 : 천원)" });
  put(3, { 0: "과 목", 9: "예산액", 11: "전년도 예산액", 17: "비교증감", 19: "산출기초(원)" });
  put(4, { 0: "장", 1: "관", 3: "항", 5: "목", 6: "원가통계비목" });
  put(5, { 0: "1.이전수입", 9: 1200, 11: 1100, 17: 100 });
  put(6, { 1: "1.지방교육행정기관이전수입", 9: 1200, 11: 1100, 17: 100 });
  put(7, { 3: "1.교육비특별회계전입금수입", 9: 1200, 11: 1100, 17: 100 });
  put(8, { 5: "1.학교운영비", 9: 1200, 11: 1100, 17: 100 });
  put(9, { 6: "1.학교운영비전입금", 9: 1200, 11: 1100, 17: 100, 19: "1,200,000원 * 1교 =", 23: 1200000 });
  put(10, { 0: "세입합계", 9: 1200, 11: 1100, 17: 100 });

  put(12, { 0: "2023학년도 세출예산명세서" });
  put(14, { 0: "예산구분 :", 6: "본예산", 20: "(단위 : 천원)" });
  put(15, { 0: "사업", 10: "예산액", 16: "전년도 예산액", 18: "비교증감", 20: "산출기초(원)" });
  put(16, { 0: "정책", 2: "단위", 4: "세부", 6: "세부항목", 8: "원가통계비목" });
  put(17, { 0: "1.학교운영", 10: 1200, 16: 1100, 18: 100 });
  put(18, { 2: "1.기본운영", 10: 1200, 16: 1100, 18: 100 });
  put(19, { 4: "1.교무학사", 10: 1200, 16: 1100, 18: 100 });
  put(20, { 6: "1.일반운영", 10: 1200, 16: 1100, 18: 100 });
  put(21, { 8: "1.일반업무추진비", 10: 1200, 16: 1100, 18: 100, 20: "120,000원 * 10회 =", 25: 1200000 });
  put(22, { 0: "세출합계", 10: 1200, 16: 1100, 18: 100 });

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "세입예산명세서");
  return XLSX.write(workbook, { bookType: "xls", type: "array" }) as ArrayBuffer;
}

describe("parseFoundationExcel", () => {
  it("normalizes separate revenue and expense sheets into one document", () => {
    const result = parseFoundationExcel(workbookBytes(), "2026 본예산.xlsx");
    expect(result).toMatchObject({ fiscalYear: 2026, budgetType: "본예산", sourceRevenueTotal: 1200, sourceExpenseTotal: 1200 });
    expect(result.revenueRows[0]).toMatchObject({ chapter: "이전수입", costItem: "학교운영비전입금", currentAmount: 1200 });
    expect(result.expenseRows[0]).toMatchObject({ policy: "학교운영", costItem: "일반업무추진비", currentAmount: 1200 });
  });

  it("reports a clear error when the expense statement is missing", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["2026학년도 세입예산명세서"], ["세입합계", 0]]), "세입");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    expect(() => parseFoundationExcel(bytes, "세입만.xlsx")).toThrow("세출예산명세서");
  });

  it("auto-detects hierarchy and amount columns in a combined Edufine print-layout sheet", () => {
    const result = parseFoundationExcel(wideEdufineWorkbookBytes(), "2023본예산.xls");

    expect(result).toMatchObject({ fiscalYear: 2023, budgetType: "본예산", sourceRevenueTotal: 1200, sourceExpenseTotal: 1200 });
    expect(result.revenueRows[0]).toMatchObject({
      chapter: "이전수입",
      division: "지방교육행정기관이전수입",
      section: "교육비특별회계전입금수입",
      item: "학교운영비",
      costItem: "학교운영비전입금",
      currentAmount: 1200,
      calculationAmount: 1200000,
    });
    expect(result.expenseRows[0]).toMatchObject({
      policy: "학교운영",
      unit: "기본운영",
      business: "교무학사",
      detail: "일반운영",
      costItem: "일반업무추진비",
      currentAmount: 1200,
      calculationAmount: 1200000,
    });
  });

  it("uses the budget year in the file name when an older year also appears inside the workbook", () => {
    const result = parseFoundationExcel(wideEdufineWorkbookBytes(), "2026예산서.xls");

    expect(result.fiscalYear).toBe(2026);
  });
});
