import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function exportClosingPdf(pages: HTMLElement[]): Promise<Blob> {
  if (pages.length === 0) throw new Error("PDF로 만들 미리보기가 없습니다.");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  for (let index = 0; index < pages.length; index += 1) {
    const canvas = await html2canvas(pages[index], { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    if (index > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297, undefined, "FAST");
  }
  return pdf.output("blob");
}
