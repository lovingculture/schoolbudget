import JSZip from "jszip";
import type { PrebudgetDocument } from "./createDocument";
import { createPrebudgetHwpxSection } from "./hwpxSection";
import containerXml from "./templates/prebudgetContainer.xml?raw";
import contentXml from "./templates/prebudgetContent.hpf?raw";
import headerXml from "./templates/prebudgetHeader.xml?raw";
import manifestXml from "./templates/prebudgetManifest.xml?raw";
import settingsXml from "./templates/prebudgetSettings.xml?raw";
import versionXml from "./templates/prebudgetVersion.xml?raw";

const MIME = "application/hwp+zip";

export async function exportPrebudgetHwpx(document: PrebudgetDocument): Promise<Blob> {
  const zip = new JSZip();
  const sanitizedContentXml = contentXml
    .replace(">user<", ">School budget work portal<")
    .replace(">User<", ">School budget work portal<");

  zip.file("mimetype", MIME, { compression: "STORE" });
  zip.file("version.xml", versionXml);
  zip.file("settings.xml", settingsXml);
  zip.file("Contents/header.xml", headerXml);
  zip.file("Contents/section0.xml", createPrebudgetHwpxSection(document));
  zip.file("Contents/content.hpf", sanitizedContentXml);
  zip.file("META-INF/container.xml", containerXml);
  zip.file("META-INF/manifest.xml", manifestXml);
  zip.file("Preview/PrvText.txt", `${document.title}\n${document.bodyLines.join("\n")}`);

  return zip.generateAsync({ type: "blob", mimeType: MIME, compression: "DEFLATE" });
}
