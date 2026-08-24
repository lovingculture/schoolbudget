import sectionTemplate from "./templates/closingSection.xml?raw";
import type { ClosingAgendaDraft } from "./types";

const money = (value: number) => value === 0 ? "-" : value.toLocaleString("ko-KR");
const ratio = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);

function textElements(root: Document | Element): Element[] {
  return Array.from(root.getElementsByTagNameNS("*", "t"));
}

function replaceText(root: Document | Element, before: string, after: string) {
  for (const element of textElements(root)) {
    if (element.textContent?.includes(before)) {
      element.textContent = element.textContent.replaceAll(before, after);
    }
  }
}

function replaceLeafText(root: Document, before: string, after: string) {
  for (const element of Array.from(root.getElementsByTagName("*"))) {
    if (element.childElementCount === 0 && element.textContent?.includes(before)) {
      element.textContent = element.textContent.replaceAll(before, after);
    }
  }
}

function setCellText(cell: Element | undefined, value: string) {
  if (!cell) return;
  const texts = textElements(cell);
  if (texts.length === 0) return;
  texts[0].textContent = value;
  for (const text of texts.slice(1)) text.textContent = "";
}

function rows(table: Element): Element[] {
  return Array.from(table.children).filter(element => element.localName === "tr");
}

function cells(row: Element): Element[] {
  return Array.from(row.children).filter(element => element.localName === "tc");
}

function updateSummary(table: Element, draft: ClosingAgendaDraft) {
  const data = cells(rows(table)[1]);
  [draft.budget, draft.currentBudget, draft.incomeTotal, draft.expenseTotal, draft.surplus]
    .forEach((value, index) => setCellText(data[index], money(value)));
}

function updateSurplus(table: Element, draft: ClosingAgendaDraft) {
  const tableRows = rows(table);
  setCellText(cells(tableRows[1])[1], money(draft.surplus));
  setCellText(cells(tableRows[2])[2], money(draft.carryovers.accident));
  setCellText(cells(tableRows[3])[1], money(draft.carryovers.specified));
  setCellText(cells(tableRows[4])[1], money(draft.carryovers.continuing));
  setCellText(cells(tableRows[5])[2], money(draft.netSurplus));
}

function updateIncome(table: Element, draft: ClosingAgendaDraft) {
  const tableRows = rows(table);
  const dataRows = tableRows.slice(2, -1);
  dataRows.forEach((row, index) => {
    const rowCells = cells(row);
    const item = draft.incomeRows[index];
    if (!item) {
      rowCells.forEach(cell => setCellText(cell, ""));
      return;
    }
    setCellText(rowCells.at(-1), ratio(item.ratio));
    setCellText(rowCells.at(-2), money(item.amount));
    setCellText(rowCells.at(-3), item.section);
    if (rowCells.length === 4) setCellText(rowCells[0], item.chapter);
  });
  const total = cells(tableRows.at(-1)!);
  setCellText(total.at(-2), money(draft.incomeTotal));
  setCellText(total.at(-1), "100");
}

function updateExpense(table: Element, draft: ClosingAgendaDraft) {
  const tableRows = rows(table);
  const dataRows = tableRows.slice(2, -1);
  dataRows.forEach((row, index) => {
    const rowCells = cells(row);
    const item = draft.expenseRows[index];
    setCellText(rowCells[0], item?.policy ?? "");
    setCellText(rowCells[1], item ? money(item.amount) : "");
    setCellText(rowCells[2], item ? ratio(item.ratio) : "");
  });
  const total = cells(tableRows.at(-1)!);
  setCellText(total[1], money(draft.expenseTotal));
  setCellText(total[2], "100");
}

export function createClosingSectionFromTemplate(draft: ClosingAgendaDraft): string {
  const document = new DOMParser().parseFromString(sectionTemplate, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("결산 HWPX 템플릿을 읽지 못했습니다.");

  replaceText(document, "2025학년도 학교회계 세입·세출 결산(안)", draft.title);
  replaceText(document, "2026. 05. .", draft.proposalDate);
  replaceText(document, "학교장", draft.proposer);
  replaceText(document, "행정실장", draft.presenter);
  replaceText(document, "초·중등교육법 제32조(기능) 심의 - 학교의 예산안 및 결산에 관한 사항", draft.basis);
  replaceText(document, "2025학년도 학교회계 세입·세출 결산에 관한 사항에 대해 심의 및 공개", draft.reason);
  replaceText(document, "별첨 1. 2025학년도 결산서 및 부속자료 각 1부.  끝.", draft.attachment);
  replaceText(document, "순수한 불용액", "");
  replaceLeafText(document, "2,724,818,217", money(draft.incomeTotal));
  replaceLeafText(document, "2,698,568,069", money(draft.expenseTotal));

  const tables = Array.from(document.getElementsByTagNameNS("*", "tbl"));
  setCellText(cells(rows(tables[0])[0])[1], draft.agendaNumber);
  updateSummary(tables[1], draft);
  updateSurplus(tables[2], draft);
  updateIncome(tables[3], draft);
  updateExpense(tables[4], draft);

  return new XMLSerializer().serializeToString(document);
}
