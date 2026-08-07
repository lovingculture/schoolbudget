import JSZip from "jszip";
import headerXml from "./hwpxHeader.xml?raw";
import {
  createClosingSectionXml,
  HWPX_CONTAINER_XML,
  HWPX_CONTENT_XML,
  HWPX_MANIFEST_XML,
  HWPX_SETTINGS_XML,
  HWPX_VERSION_XML,
} from "./hwpxXml";
import type { ClosingAgendaDraft } from "./types";

const MIME = "application/hwp+zip";

export async function exportClosingHwpx(draft: ClosingAgendaDraft): Promise<Blob> {
  const zip = new JSZip();
  zip.file("mimetype", MIME, { compression: "STORE" });
  zip.file("version.xml", HWPX_VERSION_XML);
  zip.file("settings.xml", HWPX_SETTINGS_XML);
  zip.file("Contents/header.xml", headerXml);
  zip.file("Contents/section0.xml", createClosingSectionXml(draft));
  zip.file("Contents/content.hpf", HWPX_CONTENT_XML);
  zip.file("META-INF/container.xml", HWPX_CONTAINER_XML);
  zip.file("META-INF/manifest.xml", HWPX_MANIFEST_XML);
  zip.file("Preview/PrvText.txt", `${draft.title}\n${draft.schoolName}\n${draft.incomeTotal.toLocaleString("ko-KR")}원`);
  return zip.generateAsync({ type: "blob", mimeType: MIME, compression: "DEFLATE" });
}
