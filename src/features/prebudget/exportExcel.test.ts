import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { createPrebudgetDocument } from "./createDocument";
import { createPrebudgetDraft } from "./draft";
import { exportPrebudgetExcel } from "./exporters";

const readBlob = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

describe("성립전예산 Excel 내보내기", () => {
  it("7열 요구내역과 합계를 표로 저장한다", async () => {
    const draft = createPrebudgetDraft("테스트초등학교");
    Object.assign(draft, { title: "학생안전 성립전예산", department: "교육부", requester: "김담당", officialDocument: "교육부-1" });
    draft.items[0] = { ...draft.items[0], unitBusiness: "생활지도", business: "안전교육", detail: "안전용품", category: "교육운영비", description: "안전용품 구입", manualAmount: 800_000 };

    const file = await exportPrebudgetExcel(createPrebudgetDocument(draft));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await readBlob(file.blob));
    const sheet = workbook.getWorksheet("성립전예산 요구내역")!;

    expect(file.filename).toMatch(/\.xlsx$/);
    expect(sheet.getRow(3).values).toEqual([undefined, "단위사업", "세부사업", "세부항목", "원가통계비목", "산출내역", "산출식", "요구금액"]);
    expect(sheet.getRow(4).values).toEqual([undefined, "생활지도", "안전교육", "안전용품", "교육운영비", "안전용품 구입", "-", 800_000]);
    expect(sheet.getCell("A5").value).toBe("합계");
    expect(sheet.getCell("G5").value).toBe(800_000);
    expect(sheet.getCell("E3").alignment.horizontal).toBe("center");
    expect(sheet.getCell("G3").alignment.horizontal).toBe("center");
    expect(sheet.getCell("E4").alignment.horizontal).toBe("left");
    expect(sheet.getCell("G4").alignment.horizontal).toBe("right");
  });
});
