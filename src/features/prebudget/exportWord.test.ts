import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createPrebudgetDocument } from "./createDocument";
import { createPrebudgetDraft } from "./draft";
import { exportPrebudgetWord } from "./exporters";

const readBlob = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

describe("prebudget Word export", () => {
  it("includes the seven-column budget table and total row", async () => {
    const draft = createPrebudgetDraft("Test School");
    Object.assign(draft, {
      title: "Student safety program",
      requester: "Business manager",
      officialDocument: "Related document 2026-1",
    });
    draft.items[0] = {
      ...draft.items[0],
      unitBusiness: "Safety education",
      business: "Student safety",
      detail: "Safety equipment",
      category: "Program costs",
      description: "Safety training materials",
      manualAmount: 800_000,
    };

    const { blob } = await exportPrebudgetWord(createPrebudgetDocument(draft));
    const zip = await JSZip.loadAsync(await readBlob(blob));
    const xml = await zip.file("word/document.xml")!.async("string");

    expect(xml).toContain("<w:tbl");
    expect(xml).toContain("단위사업");
    expect(xml).toContain("Safety education");
    expect(xml).toContain("합계");
  });
});
