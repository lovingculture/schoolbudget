import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { PrebudgetDocument } from "./createDocument";

const safeName = (title: string) => `${title.replace(/\s*성립전예산\s*$/, "").replace(/[\\/:*?"<>|]/g, "_").trim() || "성립전예산"}_성립전예산`;
export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
export async function exportPrebudgetWord(data: PrebudgetDocument) { const doc = new Document({ sections: [{ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.title, bold: true, size: 34 })], spacing: { after: 500 } }), ...data.copyText.split("\n").slice(2).map((text) => new Paragraph(text))] }] }); return { blob: await Packer.toBlob(doc), filename: `${safeName(data.title)}.docx` }; }
export async function exportPrebudgetPdf(element: HTMLElement, title: string) { const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#fff", useCORS: true }); const pdf = new jsPDF({ unit: "mm", format: "a4" }); const height = Math.min(277, canvas.height * 190 / canvas.width); pdf.addImage(canvas.toDataURL("image/jpeg", .94), "JPEG", 10, 10, 190, height); return { blob: pdf.output("blob"), filename: `${safeName(title)}.pdf` }; }
