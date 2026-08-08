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

const activeDocument = (officialDocument = "Related document 2026-1") => {
  const draft = createPrebudgetDraft("Test School");
  Object.assign(draft, {
    title: "Student safety program budget request",
    requester: "Business manager",
    approvalGranter: "",
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
      "META-INF/manifest.xml",
      "Preview/PrvText.txt",
    ]));
    expect(await zip.file("mimetype")!.async("string")).toBe("application/hwp+zip");

    const section = new DOMParser().parseFromString(await zip.file("Contents/section0.xml")!.async("string"), "application/xml");
    expect(section.querySelector("parsererror")).toBeNull();
    expect(section.documentElement.textContent).toContain(document.title);
    expect(section.documentElement.textContent).toContain(document.officialDocument);
    expect(section.documentElement.textContent).toContain(document.requester);
    expect(section.documentElement.textContent).toContain(document.total.toLocaleString());
    expect(section.documentElement.textContent).toContain(document.bodyLines.at(-1));
    expect(section.documentElement.textContent).not.toContain("Approval granter");
    expect(section.documentElement.textContent).toContain(document.bodyLines.at(-3));
    expect(section.documentElement.textContent).toContain(document.bodyLines.at(-2));
    expect(await zip.file("Preview/PrvText.txt")!.async("string")).toBe(`${document.title}\n${document.bodyLines.join("\n")}`);
  });

  it("preserves XML-reserved characters from canonical document fields", async () => {
    const document = activeDocument("A & B <confirmed>");
    const zip = await JSZip.loadAsync(await readBlob(await exportPrebudgetHwpx(document)));
    const section = new DOMParser().parseFromString(await zip.file("Contents/section0.xml")!.async("string"), "application/xml");

    expect(section.querySelector("parsererror")).toBeNull();
    expect(section.documentElement.textContent).toContain("A & B <confirmed>");
  });
});
