import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createPrebudgetDocument } from "./createDocument";
import { createPrebudgetDraft } from "./draft";
import { exportPrebudgetHwpx } from "./exportHwpx";

const readBlob = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

const activeDocument = (officialDocument = "Related document 2026-1", approvalGranter = "") => {
  const draft = createPrebudgetDraft("Test School");
  Object.assign(draft, {
    title: "Student safety program budget request",
    requester: "Business manager",
    approvalGranter,
    officialDocument,
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
  return createPrebudgetDocument(draft);
};

describe("prebudget HWPX export", () => {
  it("packages the canonical blank-approval document as valid editable HWPX", async () => {
    const document = activeDocument();
    const blob = await exportPrebudgetHwpx(document);

    expect(blob.type).toBe("application/hwp+zip");
    const zip = await JSZip.loadAsync(await readBlob(blob));
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
      "mimetype",
      "version.xml",
      "settings.xml",
      "Contents/header.xml",
      "Contents/section0.xml",
      "Contents/content.hpf",
      "META-INF/container.xml",
      "META-INF/container.rdf",
      "META-INF/manifest.xml",
      "Preview/PrvText.txt",
    ]));
    expect(await zip.file("mimetype")!.async("string")).toBe("application/hwp+zip");
    expect(await zip.file("META-INF/container.xml")!.async("string")).toContain("META-INF/container.rdf");
    expect(zip.file("META-INF/container.rdf")).not.toBeNull();

    const section = new DOMParser().parseFromString(await zip.file("Contents/section0.xml")!.async("string"), "application/xml");
    expect(section.querySelector("parsererror")).toBeNull();
    expect(section.documentElement.textContent).toContain(document.title);
    expect(section.documentElement.textContent).toContain(document.officialDocument);
    expect(section.documentElement.textContent).toContain(document.requester);
    expect(section.documentElement.textContent).toContain(document.total.toLocaleString());
    expect(section.documentElement.textContent).toContain(document.bodyLines.at(-1));
    expect(section.documentElement.textContent).not.toContain("예산(품의) 권한 부여 대상");
    expect(section.documentElement.textContent).toContain("라. 예산요구 총액: 800,000원");
    expect(section.documentElement.textContent).toContain("마. 성립전예산 요구내역");
    expect(section.getElementsByTagNameNS("*", "tbl")).toHaveLength(1);
    expect(Array.from(section.getElementsByTagNameNS("*", "tc")).every((cell) => cell.getAttribute("borderFillIDRef") === "3")).toBe(true);
    expect(section.documentElement.textContent).toContain("단위사업");
    expect(section.documentElement.textContent).toContain("Safety education");
    expect(section.documentElement.textContent).toContain("합계");
    expect(section.documentElement.textContent!.indexOf("라. 예산요구 총액: 800,000원"))
      .toBeLessThan(section.documentElement.textContent!.indexOf("마. 성립전예산 요구내역"));
    for (const paragraph of Array.from(section.getElementsByTagNameNS("*", "p"))) {
      expect(paragraph.getElementsByTagNameNS("*", "linesegarray")).toHaveLength(0);
    }
    expect(await zip.file("Preview/PrvText.txt")!.async("string")).toBe(document.copyText);
  });

  it("keeps approval-granter numbering in the canonical Korean order", async () => {
    const document = activeDocument("Related document 2026-1", "Approver");
    const zip = await JSZip.loadAsync(await readBlob(await exportPrebudgetHwpx(document)));
    const section = new DOMParser().parseFromString(await zip.file("Contents/section0.xml")!.async("string"), "application/xml");
    const text = section.documentElement.textContent!;

    expect(text).toContain("라. 예산(품의) 권한 부여 대상: Approver");
    expect(text).toContain("마. 예산요구 총액: 800,000원");
    expect(text).toContain("바. 성립전예산 요구내역");
    expect(text.indexOf("라. 예산(품의) 권한 부여 대상: Approver"))
      .toBeLessThan(text.indexOf("마. 예산요구 총액: 800,000원"));
    expect(text.indexOf("마. 예산요구 총액: 800,000원"))
      .toBeLessThan(text.indexOf("바. 성립전예산 요구내역"));
  });

  it("preserves XML-reserved characters from canonical document fields", async () => {
    const document = activeDocument("A & B <confirmed>");
    const zip = await JSZip.loadAsync(await readBlob(await exportPrebudgetHwpx(document)));
    const section = new DOMParser().parseFromString(await zip.file("Contents/section0.xml")!.async("string"), "application/xml");

    expect(section.querySelector("parsererror")).toBeNull();
    expect(section.documentElement.textContent).toContain("A & B <confirmed>");
  });
});
