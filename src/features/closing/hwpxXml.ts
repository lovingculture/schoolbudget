import type { ClosingAgendaDraft } from "./types";

const NS = `xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"`;

export const escapeXml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const money = (value: number) => value.toLocaleString("ko-KR");
const ratio = (value: number) => `${value.toFixed(1)}%`;

function paragraph(text: string, options: { center?: boolean; bold?: boolean; pageBreak?: boolean } = {}) {
  const paraPr = options.center ? 17 : 16;
  const charPr = options.bold ? 5 : 1;
  return `<hp:p id="0" paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="${options.pageBreak ? 1 : 0}" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPr}"><hp:t>${escapeXml(text)}</hp:t></hp:run></hp:p>`;
}

function sectionStart(title: string) {
  return `<hp:p id="0" paraPrIDRef="17" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="5"><hp:secPr id="" textDirection="HORIZONTAL" spaceColumns="1134" tabStop="8000" tabStopVal="4000" tabStopUnit="HWPUNIT" outlineShapeIDRef="1" memoShapeIDRef="0" textVerticalWidthHead="0" masterPageCnt="0"><hp:grid lineGrid="0" charGrid="0" wonggojiFormat="0"/><hp:startNum pageStartsOn="BOTH" page="0" pic="0" tbl="0" equation="0"/><hp:visibility hideFirstHeader="0" hideFirstFooter="0" hideFirstMasterPage="0" border="SHOW_ALL" fill="SHOW_ALL" hideFirstPageNum="0" hideFirstEmptyLine="0" showLineNumber="0"/><hp:pagePr landscape="WIDELY" width="59528" height="84188" gutterType="LEFT_ONLY"><hp:margin header="850" footer="850" gutter="0" left="5668" right="5668" top="5668" bottom="5668"/></hp:pagePr><hp:pageBorderFill type="BOTH" borderFillIDRef="1" textBorder="PAPER" headerInside="0" footerInside="0" fillArea="PAPER"><hp:offset left="1417" right="1417" top="1417" bottom="1417"/></hp:pageBorderFill></hp:secPr><hp:ctrl><hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/></hp:ctrl><hp:t>${escapeXml(title)}</hp:t></hp:run></hp:p>`;
}

function tableCell(text: string, col: number, row: number, width: number, bold: boolean) {
  return `<hp:tc name="" header="${bold ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${bold ? 14 : 4}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${paragraph(text, { center: true, bold })}</hp:subList><hp:cellAddr colAddr="${col}" rowAddr="${row}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${width}" height="2200"/><hp:cellMargin left="140" right="140" top="140" bottom="140"/></hp:tc>`;
}

function dataTable(headers: string[], rows: string[][], widths: number[]) {
  const allRows = [headers, ...rows];
  const body = allRows.map((values, rowIndex) => `<hp:tr>${values.map((value, colIndex) => tableCell(value, colIndex, rowIndex, widths[colIndex], rowIndex === 0)).join("")}</hp:tr>`).join("");
  return `<hp:p id="0" paraPrIDRef="16" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="1"><hp:tbl id="${1000 + allRows.length}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${allRows.length}" colCnt="${headers.length}" cellSpacing="0" borderFillIDRef="3" noAdjust="0"><hp:sz width="48000" widthRelTo="ABSOLUTE" height="${allRows.length * 2200}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="140" right="140" top="140" bottom="140"/><hp:inMargin left="140" right="140" top="140" bottom="140"/>${body}</hp:tbl></hp:run></hp:p>`;
}

export function createClosingSectionXml(draft: ClosingAgendaDraft) {
  const summary = [[draft.budget, draft.currentBudget, draft.incomeTotal, draft.expenseTotal, draft.surplus].map(money)];
  const surplus = [[draft.surplus, draft.carryovers.accident, draft.carryovers.specified, draft.carryovers.continuing, draft.netSurplus].map(money)];
  const income = draft.incomeRows.map(item => [item.chapter, item.section, money(item.amount), ratio(item.ratio)]);
  income.push(["합계", "", money(draft.incomeTotal), "100.0%"]);
  const expense = draft.expenseRows.map(item => [item.policy, money(item.amount), ratio(item.ratio)]);
  expense.push(["합계", money(draft.expenseTotal), "100.0%"]);

  const content = [
    sectionStart(draft.title),
    paragraph(draft.schoolName, { center: true, bold: true }),
    paragraph(`안건번호: ${draft.agendaNumber}`),
    paragraph(`제안연월일: ${draft.proposalDate}`),
    paragraph(`제안자: ${draft.proposer}`),
    paragraph(`제안설명자: ${draft.presenter}`),
    paragraph("1. 제안 근거", { bold: true }), paragraph(draft.basis),
    paragraph("2. 제안 이유", { bold: true }), paragraph(draft.reason),
    paragraph("3. 주요 내용", { bold: true }),
    paragraph("세입·세출 결산 총괄표 (단위: 원)", { bold: true }),
    dataTable(["예산액", "예산현액", "세입결산액", "세출결산액", "세계잉여금"], summary, [9600, 9600, 9600, 9600, 9600]),
    paragraph("세계잉여금 처리 현황 (단위: 원)", { bold: true }),
    dataTable(["세계잉여금", "사고이월", "명시이월", "계속비이월", "순세계잉여금"], surplus, [9600, 9600, 9600, 9600, 9600]),
    paragraph("세입 결산내역", { bold: true, pageBreak: true }),
    dataTable(["장", "관", "결산액", "구성비"], income, [9500, 20500, 12000, 6000]),
    paragraph("세출 결산내역", { bold: true }),
    dataTable(["정책사업", "결산액", "구성비"], expense, [28000, 13000, 7000]),
    paragraph(draft.attachment),
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hs:sec ${NS}>${content}</hs:sec>`;
}

export const HWPX_CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf"><ocf:rootfiles><ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/></ocf:rootfiles></ocf:container>`;

export const HWPX_CONTENT_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><opf:package ${NS} version="" unique-identifier="" id=""><opf:metadata><opf:title xml:space="preserve">학교회계 결산 안건설명서</opf:title><opf:language>ko</opf:language><opf:meta name="creator" content="text">학교예산 업무포털</opf:meta><opf:meta name="subject" content="text"/><opf:meta name="description" content="text"/></opf:metadata><opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/><opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/><opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest><opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>`;

export const HWPX_VERSION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="School Budget Portal" appVersion="1.0"/>`;
export const HWPX_SETTINGS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>`;
export const HWPX_MANIFEST_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?><odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>`;
