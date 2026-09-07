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
});
