import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createClosingDraft } from "./createDraft";
import { exportClosingPdf } from "./exportPdf";
import { exportClosingWord } from "./exportWord";
import type { ClosingSource } from "./types";

const readBlob = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

const source: ClosingSource = {
  fiscalYear: 2025, schoolName: "서울옥정초등학교", budget: 2727447000, currentBudget: 2730444440,
  incomeTotal: 2724818217, expenseTotal: 2698568069, surplus: 26250148,
  carryovers: { specified: 4466880, accident: 0, continuing: 0 }, subsidyReturn: 0,
  priorTransfer: 15000000, afterTransfer: 6783268, netSurplus: 21783268,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방자치단체이전수입", amount: 2724818217, ratio: 100 }],
  expenseRows: [{ id: "e1", policy: "인적자원 운용", amount: 2698568069, ratio: 100 }],
};

describe("결산 안건설명서 파일 생성", () => {
  it("편집값을 포함한 Word Blob을 만든다", async () => {
    const blob = await exportClosingWord({ ...createClosingDraft(source), agendaNumber: "제3호", proposer: "학교장" });
    expect(blob.type).toContain("wordprocessingml");
    expect(blob.size).toBeGreaterThan(1000);
    const zip = await JSZip.loadAsync(await readBlob(blob));
    const documentXml = await zip.file("word/document.xml")!.async("string");
    expect(documentXml).toContain("서울옥정초등학교");
    expect(documentXml).toContain("제3호");
    expect(documentXml).toContain("2,724,818,217");
    expect(documentXml).toContain("2,698,568,069");
    expect(documentXml).toContain("26,250,148");
    expect(documentXml).toContain("지방자치단체이전수입");
    expect(documentXml).toContain("인적자원 운용");
  });

  it("A4 미리보기를 PDF Blob으로 만든다", async () => {
    const blob = await exportClosingPdf([]).catch(error => error as Error);
    expect(blob).toBeInstanceOf(Error);
    expect((blob as Error).message).toContain("미리보기가 없습니다");
  });
});
