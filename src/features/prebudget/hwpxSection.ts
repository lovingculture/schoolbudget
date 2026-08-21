import sectionTemplate from "./templates/prebudgetSection.xml?raw";
import type { PrebudgetDocument } from "./createDocument";

const HP = "http://www.hancom.co.kr/hwpml/2011/paragraph";

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
  for (const lineSegArray of Array.from(paragraph.getElementsByTagNameNS("*", "linesegarray"))) {
    lineSegArray.remove();
  }
}

function createBudgetTable(section: Document, document: PrebudgetDocument): Element {
  const element = (name: string, attrs: Record<string, string> = {}) => {
    const node = section.createElementNS(HP, `hp:${name}`);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  const paragraph = element("p", { id: "0", paraPrIDRef: "0", styleIDRef: "0", pageBreak: "0", columnBreak: "0", merged: "0" });
  const run = element("run", { charPrIDRef: "0" });
  const allRows = [document.budgetTable.headers, ...document.budgetTable.rows, ["합계", "", "", "", "", "", document.budgetTable.total]];
  const table = element("tbl", { id: "900001", zOrder: "1", numberingType: "TABLE", textWrap: "TOP_AND_BOTTOM", textFlow: "BOTH_SIDES", lock: "0", pageBreak: "CELL", repeatHeader: "1", rowCnt: String(allRows.length), colCnt: "7", cellSpacing: "0", borderFillIDRef: "1", noAdjust: "0" });
  table.append(element("sz", { width: "48188", widthRelTo: "ABSOLUTE", height: String(allRows.length * 2400), heightRelTo: "ABSOLUTE", protect: "0" }));
  table.append(element("pos", { treatAsChar: "1", affectLSpacing: "0", flowWithText: "1", allowOverlap: "0", holdAnchorAndSO: "0", vertRelTo: "PARA", horzRelTo: "PARA", vertAlign: "TOP", horzAlign: "LEFT", vertOffset: "0", horzOffset: "0" }));
  table.append(element("outMargin", { left: "0", right: "0", top: "0", bottom: "0" }));
  table.append(element("inMargin", { left: "120", right: "120", top: "120", bottom: "120" }));
  allRows.forEach((values, rowIndex) => {
    const tr = element("tr");
    values.forEach((value, colIndex) => {
      const tc = element("tc", { name: "", header: rowIndex === 0 ? "1" : "0", hasMargin: "0", protect: "0", editable: "0", dirty: "0", borderFillIDRef: "1" });
      const subList = element("subList", { id: "", textDirection: "HORIZONTAL", lineWrap: "BREAK", vertAlign: "CENTER", linkListIDRef: "0", linkListNextIDRef: "0", textWidth: "0", textHeight: "0", hasTextRef: "0", hasNumRef: "0" });
      const p = element("p", { id: "0", paraPrIDRef: "0", styleIDRef: "0", pageBreak: "0", columnBreak: "0", merged: "0" });
      const r = element("run", { charPrIDRef: "0" });
      const t = element("t"); t.textContent = value; r.append(t); p.append(r); subList.append(p); tc.append(subList);
      tc.append(element("cellAddr", { colAddr: String(colIndex), rowAddr: String(rowIndex) }));
      tc.append(element("cellSpan", { colSpan: "1", rowSpan: "1" }));
      tc.append(element("cellSz", { width: "6884", height: "2400" }));
      tc.append(element("cellMargin", { left: "120", right: "120", top: "120", bottom: "120" }));
      tr.append(tc);
    });
    table.append(tr);
  });
  run.append(table); paragraph.append(run); return paragraph;
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
  parent.insertBefore(createBudgetTable(section, document), bodyPlaceholder);
  parent.removeChild(bodyPlaceholder);

  return new XMLSerializer().serializeToString(section);
}
