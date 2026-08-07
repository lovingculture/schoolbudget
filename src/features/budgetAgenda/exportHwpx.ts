import JSZip from "jszip";
import { createBudgetAgendaSectionFromTemplate } from "./hwpxTemplate";
import containerXml from "./templates/budgetContainer.xml?raw";
import contentXml from "./templates/budgetContent.hpf?raw";
import headerXml from "./templates/budgetHeader.xml?raw";
import manifestXml from "./templates/budgetManifest.xml?raw";
import settingsXml from "./templates/budgetSettings.xml?raw";
import versionXml from "./templates/budgetVersion.xml?raw";
import type { BudgetAgendaDraft } from "./types";

const MIME = "application/hwp+zip";

export async function exportBudgetAgendaHwpx(draft: BudgetAgendaDraft): Promise<Blob> {
  const zip = new JSZip();
  const sanitizedContentXml = contentXml.replace(">user<", ">학교예산 업무포털<").replace(">User<", ">학교예산 업무포털<");
  zip.file("mimetype", MIME, { compression: "STORE" });
  zip.file("version.xml", versionXml);
  zip.file("settings.xml", settingsXml);
  zip.file("Contents/header.xml", headerXml);
  zip.file("Contents/section0.xml", createBudgetAgendaSectionFromTemplate(draft));
  zip.file("Contents/content.hpf", sanitizedContentXml);
  zip.file("META-INF/container.xml", containerXml);
  zip.file("META-INF/manifest.xml", manifestXml);
  zip.file("Preview/PrvText.txt", `${draft.title}\n${draft.schoolName}\n${draft.revisedBudget.toLocaleString("ko-KR")}천원`);
  return zip.generateAsync({ type: "blob", mimeType: MIME, compression: "DEFLATE" });
}
