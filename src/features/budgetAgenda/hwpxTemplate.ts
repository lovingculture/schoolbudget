import sectionTemplate from "./templates/budgetSection.xml?raw";
import type { BudgetAgendaDraft } from "./types";

const money = (value: number) => value.toLocaleString("ko-KR");
const ratio = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
const textElements = (root: Document | Element) => Array.from(root.getElementsByTagNameNS("*", "t"));

function replaceText(root: Document, before: string, after: string) {
  for (const element of textElements(root)) {
    if (element.textContent?.includes(before)) element.textContent = element.textContent.replaceAll(before, after);
  }
}

function replaceLeafText(root: Document, before: string, after: string) {
  for (const element of Array.from(root.getElementsByTagName("*"))) {
    if (element.childElementCount === 0 && element.textContent?.includes(before)) element.textContent = element.textContent.replaceAll(before, after);
  }
}

function setCellText(cell: Element | undefined, value: string) {
  if (!cell) return;
  const texts = textElements(cell);
  if (!texts.length) {
    const run = cell.getElementsByTagNameNS("*", "run")[0];
    if (!run) return;
    const text = cell.ownerDocument.createElementNS("http://www.hancom.co.kr/hwpml/2011/paragraph", "hp:t");
    text.textContent = value;
    run.appendChild(text);
    return;
  }
  texts[0].textContent = value;
  for (const text of texts.slice(1)) text.textContent = "";
}

const rows = (table: Element) => Array.from(table.children).filter(element => element.localName === "tr");
const cells = (row: Element) => Array.from(row.children).filter(element => element.localName === "tc");

function updateSummary(table: Element, draft: BudgetAgendaDraft) {
  const header = cells(rows(table)[0]);
  setCellText(header[1], draft.revisedBudgetLabel);
  setCellText(header[2], draft.previousBudgetLabel);
  const values = cells(rows(table)[2]);
  ["예산액", money(draft.revisedBudget), money(draft.previousBudget), money(draft.changeAmount), ratio(draft.changeRate), ""]
    .forEach((value, index) => setCellText(values[index], value));
}

function updateIncome(table: Element, draft: BudgetAgendaDraft) {
  const tableRows = rows(table);
  tableRows.slice(1, -1).forEach((row, index) => {
    const item = draft.incomeRows[index];
    const values = item ? [item.section, money(item.current), money(item.cumulative), ratio(item.ratio), item.note] : ["", "", "", "", ""];
    cells(row).forEach((cell, cellIndex) => setCellText(cell, values[cellIndex]));
  });
  ["계", money(draft.changeAmount), money(draft.revisedBudget), "100", ""]
    .forEach((value, index) => setCellText(cells(tableRows.at(-1)!)[index], value));
}

function updateExpense(table: Element, draft: BudgetAgendaDraft) {
  const tableRows = rows(table);
  tableRows.slice(1, -1).forEach((row, index) => {
    const item = draft.expenseRows[index];
    const values = item ? [item.policy, money(item.current), money(item.cumulative), ratio(item.ratio), item.note] : ["", "", "", "", ""];
    cells(row).forEach((cell, cellIndex) => setCellText(cell, values[cellIndex]));
  });
  ["계", money(draft.changeAmount), money(draft.revisedBudget), "100", ""]
    .forEach((value, index) => setCellText(cells(tableRows.at(-1)!)[index], value));
}

export function createBudgetAgendaSectionFromTemplate(draft: BudgetAgendaDraft): string {
  const document = new DOMParser().parseFromString(sectionTemplate, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("예산 안건설명서 HWPX 템플릿을 읽지 못했습니다.");
  replaceText(document, "2026학년도 서울옥정초등학교 회계 1차 추경예산(안)", draft.title);
  replaceText(document, "2026. 5. 28", draft.proposalDate);
  replaceText(document, "학교장", draft.proposer);
  replaceText(document, "행정실장", draft.presenter);
  replaceText(document, "2026학년도 학교회계 1차 추경예산을 심의 받고자 함", draft.reason);
  const basis = draft.basis.split(/\r?\n/);
  replaceText(document, "가. 「초·중등교육법」 제30조의3(학교회계의 운영), 제32조(심의·자문사항)", basis[0] ?? "");
  replaceText(document, "나. 2026학년도 학교회계 예산편성 기본지침", basis.slice(1).join("\n"));
  replaceText(document, "라. 추경예산 편성 주요내용", `라. ${draft.contentTitle}`);
  replaceText(document, "본예산이후 편성된 성립전예산(목적사업비등) 내역 반영", draft.majorContents[0] ?? "");
  replaceText(document, "학교운영 안정지원 추가 지원금 전기요금으로 편성", draft.majorContents[1] ?? "");
  replaceLeafText(document, "1,771,057", money(draft.revisedBudget));
  replaceLeafText(document, "1,010,749", money(draft.previousBudget));
  replaceLeafText(document, "760,308", money(draft.changeAmount));
  const tables = Array.from(document.getElementsByTagNameNS("*", "tbl"));
  setCellText(cells(rows(tables[0])[0])[1], draft.agendaNumber);
  updateSummary(tables[1], draft);
  updateIncome(tables[2], draft);
  updateExpense(tables[3], draft);
  return new XMLSerializer().serializeToString(document);
}
