import sectionTemplate from "./templates/prebudgetSection.xml?raw";
import type { PrebudgetDocument } from "./createDocument";

function paragraphWithPlaceholder(document: Document, placeholder: string): Element {
  const paragraph = Array.from(document.getElementsByTagNameNS("*", "p"))
    .find(element => element.textContent?.includes(placeholder));
  if (!paragraph) throw new Error(`Prebudget HWPX template is missing ${placeholder}.`);
  return paragraph;
}

function setParagraphText(paragraph: Element, value: string) {
  const texts = Array.from(paragraph.getElementsByTagNameNS("*", "t"));
  if (texts.length === 0) throw new Error("Prebudget HWPX template paragraph has no text node.");
  texts[0].textContent = value;
  for (const text of texts.slice(1)) text.textContent = "";
}

export function createPrebudgetHwpxSection(document: PrebudgetDocument): string {
  const section = new DOMParser().parseFromString(sectionTemplate, "application/xml");
  if (section.querySelector("parsererror")) throw new Error("Prebudget HWPX template could not be parsed.");

  const titleParagraph = paragraphWithPlaceholder(section, "{{TITLE}}");
  const bodyPlaceholder = paragraphWithPlaceholder(section, "{{BODY_LINE}}");
  const parent = bodyPlaceholder.parentNode;
  if (!parent) throw new Error("Prebudget HWPX template body paragraph has no parent.");

  setParagraphText(titleParagraph, document.title);
  for (const bodyLine of document.bodyLines) {
    const paragraph = bodyPlaceholder.cloneNode(true) as Element;
    setParagraphText(paragraph, bodyLine);
    parent.insertBefore(paragraph, bodyPlaceholder);
  }
  parent.removeChild(bodyPlaceholder);

  return new XMLSerializer().serializeToString(section);
}
