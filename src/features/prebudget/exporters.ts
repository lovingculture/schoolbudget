import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type { PrebudgetDocument } from "./createDocument";
export { exportPrebudgetHwpx } from "./exportHwpx";

const safeName = (title: string) => `${title.replace(/\s*성립전예산\s*$/, "").replace(/[\\/:*?"<>|]/g, "_").trim() || "성립전예산"}_성립전예산`;
export const prebudgetFilename = (title: string, extension: string) => `${safeName(title)}.${extension}`;
export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
export async function exportPrebudgetWord(data: PrebudgetDocument) { const doc = new Document({ sections: [{ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.title, bold: true, size: 34 })], spacing: { after: 500 } }), ...data.bodyLines.map((text) => new Paragraph(text))] }] }); return { blob: await Packer.toBlob(doc), filename: prebudgetFilename(data.title, "docx") }; }
export async function exportPrebudgetPdf(element: HTMLElement, title: string) { const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#fff", useCORS: true }); const pdf = new jsPDF({ unit: "mm", format: "a4" }); const pageHeight = 277; const imageHeight = canvas.height * 190 / canvas.width; const image = canvas.toDataURL("image/jpeg", .94); let remainingHeight = imageHeight; let position = 10; pdf.addImage(image, "JPEG", 10, position, 190, imageHeight); remainingHeight -= pageHeight; while (remainingHeight > 0) { position -= pageHeight; pdf.addPage(); pdf.addImage(image, "JPEG", 10, position, 190, imageHeight); remainingHeight -= pageHeight; } return { blob: pdf.output("blob"), filename: prebudgetFilename(title, "pdf") }; }
