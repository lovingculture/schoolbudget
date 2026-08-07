import JSZip from "jszip";
import headerXml from "./templates/closingHeader.xml?raw";
import contentXml from "./templates/closingContent.hpf?raw";
import containerXml from "./templates/closingContainer.xml?raw";
import manifestXml from "./templates/closingManifest.xml?raw";
import settingsXml from "./templates/closingSettings.xml?raw";
import versionXml from "./templates/closingVersion.xml?raw";
import { createClosingSectionFromTemplate } from "./hwpxTemplate";
import type { ClosingAgendaDraft } from "./types";

const MIME = "application/hwp+zip";

export async function exportClosingHwpx(draft: ClosingAgendaDraft): Promise<Blob> {
  const zip = new JSZip();
  const sanitizedContentXml = contentXml
    .replace(">user<", ">학교예산 업무포털<")
    .replace(">User<", ">학교예산 업무포털<");
  zip.file("mimetype", MIME, { compression: "STORE" });
  zip.file("version.xml", versionXml);
  zip.file("settings.xml", settingsXml);
  zip.file("Contents/header.xml", headerXml);
  zip.file("Contents/section0.xml", createClosingSectionFromTemplate(draft));
  zip.file("Contents/content.hpf", sanitizedContentXml);
  zip.file("META-INF/container.xml", containerXml);
  zip.file("META-INF/manifest.xml", manifestXml);
  zip.file("Preview/PrvText.txt", `${draft.title}\n${draft.schoolName}\n${draft.incomeTotal.toLocaleString("ko-KR")}원`);
  return zip.generateAsync({ type: "blob", mimeType: MIME, compression: "DEFLATE" });
}
