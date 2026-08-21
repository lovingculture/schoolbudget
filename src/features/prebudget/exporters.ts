import { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ExcelJS from "exceljs";
import type { PrebudgetDocument } from "./createDocument";
export { exportPrebudgetHwpx } from "./exportHwpx";

const safeName = (title: string) => `${title.replace(/\s*성립전예산\s*$/, "").replace(/[\\/:*?"<>|]/g, "_").trim() || "성립전예산"}_성립전예산`;
export const prebudgetFilename = (title: string, extension: string) => `${safeName(title)}.${extension}`;
export function downloadBlob(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
export async function exportPrebudgetExcel(data: PrebudgetDocument) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "학교예산 한눈에보기";
  const sheet = workbook.addWorksheet("성립전예산 요구내역", { views: [{ state: "frozen", ySplit: 3 }] });
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = data.title;
  sheet.getCell("A1").font = { name: "맑은 고딕", size: 16, bold: true, color: { argb: "FF173B3A" } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;
  sheet.addRow([]);
  sheet.addRow(data.budgetTable.headers);
  data.budgetTable.rows.forEach((row) => sheet.addRow([...row.slice(0, 6), Number(row[6].replace(/[^0-9-]/g, "")) || 0]));
  const totalRow = sheet.addRow(["합계", "", "", "", "", "", data.total]);
  sheet.mergeCells(`A${totalRow.number}:F${totalRow.number}`);
  const border: Partial<ExcelJS.Borders> = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  for (let rowNumber = 3; rowNumber <= totalRow.number; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= 7; columnNumber += 1) {
      const cell = sheet.getCell(rowNumber, columnNumber);
      cell.font = { name: "맑은 고딕", size: 10, bold: rowNumber === 3 || rowNumber === totalRow.number };
      cell.border = border;
      cell.alignment = { horizontal: columnNumber === 7 ? "right" : "center", vertical: "middle", wrapText: true };
      if (rowNumber === 3) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7F4F5" } };
      if (rowNumber === totalRow.number) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F8F8" } };
    }
  }
  sheet.getColumn(1).width = 20; sheet.getColumn(2).width = 20; sheet.getColumn(3).width = 24;
  sheet.getColumn(4).width = 20; sheet.getColumn(5).width = 30; sheet.getColumn(6).width = 22; sheet.getColumn(7).width = 16;
  sheet.getColumn(7).numFmt = "#,##0\"원\"";
  sheet.autoFilter = { from: "A3", to: "G3" };
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
  return { blob: new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename: prebudgetFilename(data.title, "xlsx") };
}
const wordCell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold, size: 16 })] })] });
const wordRow = (values: string[], bold = false) => new TableRow({ children: values.map((value) => wordCell(value, bold)) });
export async function exportPrebudgetWord(data: PrebudgetDocument) { const border = { style: BorderStyle.SINGLE, size: 4 }; const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [wordRow(data.budgetTable.headers, true), ...data.budgetTable.rows.map((values) => wordRow(values)), wordRow(["합계", "", "", "", "", "", data.budgetTable.total], true)], borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border } }); const doc = new Document({ sections: [{ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.title, bold: true, size: 34 })], spacing: { after: 500 } }), ...data.bodyLines.map((text) => new Paragraph(text)), table] }] }); return { blob: await Packer.toBlob(doc), filename: prebudgetFilename(data.title, "docx") }; }
export async function exportPrebudgetPdf(element: HTMLElement, title: string) { const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#fff", useCORS: true }); const pdf = new jsPDF({ unit: "mm", format: "a4" }); const pageHeight = 277; const imageHeight = canvas.height * 190 / canvas.width; const image = canvas.toDataURL("image/jpeg", .94); let remainingHeight = imageHeight; let position = 10; pdf.addImage(image, "JPEG", 10, position, 190, imageHeight); remainingHeight -= pageHeight; while (remainingHeight > 0) { position -= pageHeight; pdf.addPage(); pdf.addImage(image, "JPEG", 10, position, 190, imageHeight); remainingHeight -= pageHeight; } return { blob: pdf.output("blob"), filename: prebudgetFilename(title, "pdf") }; }
