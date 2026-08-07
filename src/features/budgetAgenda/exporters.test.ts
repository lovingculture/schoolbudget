import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createBudgetAgendaDraft } from "./createDraft";
import { exportBudgetAgendaExcel } from "./exportExcel";
import { exportBudgetAgendaWord } from "./exportWord";
import type { BudgetAgendaSource } from "./types";

const source: BudgetAgendaSource = {
  fiscalYear: 2026, schoolName: "서울옥정초등학교", budgetType: "추경1회",
  revisedBudget: 1771057, previousBudget: 1010749, changeAmount: 760308, changeRate: 75.2,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방자치단체이전수입", current: 760308, cumulative: 1771057, ratio: 100, note: "" }],
  expenseRows: [{ id: "e1", policy: "학교 일반운영", current: 760308, cumulative: 1771057, ratio: 100, note: "" }],
};

describe("예산 안건설명서 파일 출력", () => {
  it("편집 가능한 Word 문서를 만든다", async () => {
    const draft = { ...createBudgetAgendaDraft(source), revisedBudgetLabel: "1차추경예산액(B)", previousBudgetLabel: "본예산액(A)", majorContents: ["목적사업비 반영", "전기요금 편성"] };
    const blob = await exportBudgetAgendaWord(draft);
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(blob.size).toBeGreaterThan(1000);
    const wordBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    const zip = await JSZip.loadAsync(wordBuffer);
    const documentXml = await zip.file("word/document.xml")!.async("string");
    expect(documentXml).toContain("1차추경예산액(B)");
    expect(documentXml).toContain("본예산액(A)");
    expect(documentXml).toMatch(/<w:sz w:val="24"\/><w:szCs w:val="24"\/>[\s\S]{0,160}2026학년도 학교회계 1차 추경예산을 심의 받고자 함/);
    expect(documentXml).toMatch(/<w:sz w:val="24"\/><w:szCs w:val="24"\/>[\s\S]{0,160}라\. 추경예산 편성 주요내용/);
    expect(documentXml).toMatch(/<w:sz w:val="24"\/><w:szCs w:val="24"\/>[\s\S]{0,160}1\) 목적사업비 반영/);
  });

  it("입력과 안건설명서 시트가 있는 일반 Excel을 만든다", async () => {
    const draft = { ...createBudgetAgendaDraft(source), revisedBudgetLabel: "1차추경예산액(B)", previousBudgetLabel: "본예산액(A)", majorContents: ["목적사업비 반영", "전기요금 편성"] };
    const blob = await exportBudgetAgendaExcel(draft);
    expect(blob.type).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const workbook = new ExcelJS.Workbook();
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(["입력", "안건설명서"]);
    expect(workbook.getWorksheet("안건설명서")?.getCell("A1").value).toBe("2026학년도 서울옥정초등학교 회계 1차 추경예산(안)");
    expect(workbook.getWorksheet("입력")?.getCell("B10").value).toBe(1771057);
    expect(workbook.getWorksheet("입력")?.getCell("A10").value).toBe("1차추경예산액(B)");
    expect(workbook.getWorksheet("입력")?.getCell("A11").value).toBe("본예산액(A)");
    expect(workbook.getWorksheet("안건설명서")?.getCell("B13").value).toBe("1차추경예산액(B)");
    expect(workbook.getWorksheet("안건설명서")?.getCell("C13").value).toBe("본예산액(A)");
    const agenda = workbook.getWorksheet("안건설명서")!;
    const rowFor = (value: string) => agenda.getColumn(1).values.findIndex(cell => cell === value);
    expect(agenda.getCell(rowFor(draft.reason), 1).font.size).toBe(12);
    expect(agenda.getCell(rowFor(draft.basis), 1).font.size).toBe(12);
    expect(agenda.getCell(rowFor(`라. ${draft.contentTitle}`), 1).font.size).toBe(12);
    expect(agenda.getCell(rowFor("1) 목적사업비 반영"), 1).font.size).toBe(12);
    expect((workbook as ExcelJS.Workbook & { vbaProject?: unknown }).vbaProject).toBeUndefined();
  });
});
