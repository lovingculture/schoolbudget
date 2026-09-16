import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { MainBudgetFoundationPage } from "./MainBudgetFoundationPage";
import { foundationStorage } from "./foundationStorage";

vi.mock("./downloadFoundationWorkbook", () => ({ downloadFoundationWorkbook: vi.fn().mockResolvedValue(undefined) }));

const validCsv = [
  "2026학년도 세입예산명세서",
  "예산구분 : ,본예산,(단위 : 천원)",
  "장,관,항,목,원가통계비목",
  ',,,,1.이자수입,100,80,20,"예금이자 =",100000',
  "세입합계,100,80,20",
  "2026학년도 세출예산명세서",
  "예산구분 : ,본예산,,(단위 : 천원)",
  "정책,단위,세부,세부항목,원가통계비목",
  ',,,,1.일반업무추진비,100,80,20,"협의회비 =",100000',
  "세출합계,100,80,20",
].join("\r\n");

function csvFile(text = validCsv): File {
  const bytes = new TextEncoder().encode(text);
  const file = new File([bytes], "세입세출.csv", { type: "text/csv" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
  return file;
}

function excelFile(expenseTotal = 100): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["2026학년도 세입예산명세서"],
    ["예산구분 :", "본예산", "(단위 : 천원)"],
    ["장", "관", "항", "목", "원가통계비목", "예산액", "전년도예산액", "증감", "산출기초", "산출금액"],
    ["1. 자체수입", "1. 행정활동수입", "1. 이자수입", "1. 예금이자", "1. 예금이자수입", 100, 80, 20, "예금이자 =", 100000],
    ["세입합계", 100],
  ]), "세입예산명세서");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["2026학년도 세출예산명세서"],
    ["예산구분 :", "본예산", "(단위 : 천원)"],
    ["정책사업", "단위사업", "세부사업", "세부항목", "원가통계비목", "예산액", "전년도예산액", "증감", "산출기초", "산출금액"],
    ["1. 학교일반운영", "1. 학교기관운영", "1. 부서기본운영", "1. 행정실운영", "1. 일반업무추진비", expenseTotal, 80, expenseTotal - 80, "협의회비 =", expenseTotal * 1000],
    ["세출합계", expenseTotal],
  ]), "세출예산명세서");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const file = new File([bytes], "세입세출.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes });
  return file;
}

describe("MainBudgetFoundationPage", () => {
  beforeEach(() => localStorage.clear());

  it("shows the Edufine Excel download guide before the file picker", () => {
    render(<MainBudgetFoundationPage />);
    expect(screen.getByRole("heading", { name: "세입세출예산서 엑셀로 다운 받기" })).toBeVisible();
    expect(screen.getByRole("list", { name: "에듀파인 예산서 메뉴 이동 경로" }).children).toHaveLength(4);
    expect(screen.getByText("예산서현황에서 세입예산명세서와 세출예산명세서를 각각 클릭한 뒤 Excel(.xls 또는 .xlsx)로 저장합니다.")).toBeVisible();
    expect(screen.getByRole("img", { name: "학교명이 가려진 에듀파인 예산서현황 Excel 선택 화면" })).toHaveAttribute(
      "src", "/guides/edu-finance-foundation-csv.png",
    );
    const guide = screen.getByRole("region", { name: "세입세출예산서 엑셀로 다운 받기" });
    const upload = screen.getByRole("heading", { name: "세입·세출예산서 Excel 파일 불러오기" }).closest("section")!;
    expect(guide.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uploads one Excel file, shows reconciled totals, and enables Excel export", async () => {
    const user = userEvent.setup();
    render(<MainBudgetFoundationPage />);
    const input = screen.getByLabelText("세입·세출예산서 Excel 파일 선택");
    expect(input).toHaveAttribute("accept", ".xls,.xlsx");
    await user.upload(input, excelFile());
    expect(await screen.findByText("세입·세출 일치")).toBeVisible();
    expect(screen.getAllByText("100천원").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "엑셀 자료 내려받기" }));
    expect(screen.getByRole("button", { name: "분석 결과 Excel 내려받기" })).toBeEnabled();
  });

  it("analyzes a file dropped on the upload area", async () => {
    render(<MainBudgetFoundationPage />);
    const uploadArea = screen.getByRole("region", { name: "세입·세출예산서 Excel 파일 불러오기" });
    fireEvent.drop(uploadArea, { dataTransfer: { files: [excelFile()] } });
    expect(await screen.findByText("세입·세출 일치")).toBeVisible();
  });

  it("shows workbook-style sheet tabs after analysis", async () => {
    const user = userEvent.setup();
    render(<MainBudgetFoundationPage />);
    await user.upload(screen.getByLabelText("세입·세출예산서 Excel 파일 선택"), excelFile());
    await screen.findByText("세입·세출 일치");
    await user.click(screen.getByRole("tab", { name: "세출(원안)" }));
    expect(screen.getByRole("tabpanel", { name: "세출(원안)" })).toHaveTextContent("일반업무추진비");
  });

  it("restores a saved result and clears it for a new file", async () => {
    const bytes = await csvFile().arrayBuffer();
    const { parseFoundationCsv } = await import("./parseFoundationCsv");
    foundationStorage.save({ document: parseFoundationCsv("복원.csv", bytes), edits: {} });
    const user = userEvent.setup();
    render(<MainBudgetFoundationPage />);
    expect(screen.getByText("복원.csv")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "새 파일 분석" }));
    expect(screen.getByLabelText("세입·세출예산서 Excel 파일 선택")).toBeVisible();
    expect(foundationStorage.load()).toBeNull();
  });

  it("shows a blocking validation error for mismatched totals", async () => {
    const user = userEvent.setup();
    render(<MainBudgetFoundationPage />);
    await user.upload(screen.getByLabelText("세입·세출예산서 Excel 파일 선택"), excelFile(90));
    expect(await screen.findByText(/세입합계와 세출합계가 10천원 차이/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "엑셀 자료 내려받기" }));
    expect(screen.getByRole("button", { name: "분석 결과 Excel 내려받기" })).toBeDisabled();
  });

  it("rejects a CSV dropped on the Excel upload area", async () => {
    render(<MainBudgetFoundationPage />);
    const uploadArea = screen.getByRole("region", { name: "세입·세출예산서 Excel 파일 불러오기" });
    fireEvent.drop(uploadArea, { dataTransfer: { files: [csvFile()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(".xls 또는 .xlsx 파일을 선택해 주세요.");
    expect(screen.queryByText("세입·세출 일치")).not.toBeInTheDocument();
  });
});
