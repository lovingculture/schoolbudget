import { buildFoundationWorkbook } from "./buildFoundationWorkbook";
import type { FoundationBudgetDocument } from "./types";

export async function downloadFoundationWorkbook(document: FoundationBudgetDocument): Promise<void> {
  const bytes = await buildFoundationWorkbook(document);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${document.fiscalYear}학년도_본예산_편성_기초자료.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
