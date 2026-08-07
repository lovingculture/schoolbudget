import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { formatRatio, formatWon } from "./format";
import type { ClosingAgendaDraft } from "./types";

const MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold })] })] });
const row = (values: string[], bold = false) => new TableRow({ children: values.map(value => cell(value, bold)) });
const borders = { style: BorderStyle.SINGLE, size: 4 };
const table = (rows: TableRow[]) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, borders: { top: borders, bottom: borders, left: borders, right: borders, insideHorizontal: borders, insideVertical: borders } });

export async function exportClosingWord(draft: ClosingAgendaDraft): Promise<Blob> {
  const document = new Document({ sections: [{ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 700 }, children: [new TextRun({ text: draft.title, bold: true, size: 36 })] }),
    new Paragraph(`안건번호: ${draft.agendaNumber}`), new Paragraph(`제안년월일: ${draft.proposalDate}`),
    new Paragraph(`제안자: ${draft.proposer}`), new Paragraph({ spacing: { after: 500 }, text: `제안설명자: ${draft.presenter}` }),
    new Paragraph({ text: "1. 제안 근거", heading: HeadingLevel.HEADING_2 }), new Paragraph(draft.basis),
    new Paragraph({ text: "2. 제안 이유", heading: HeadingLevel.HEADING_2 }), new Paragraph(draft.reason),
    new Paragraph({ text: "3. 주요 내용", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ children: [new TextRun({ text: "세입·세출 결산 총괄표 (단위: 원)", bold: true })] }),
    table([row(["예산액", "예산현액", "세입결산액", "세출결산액", "세계잉여금"], true), row([draft.budget, draft.currentBudget, draft.incomeTotal, draft.expenseTotal, draft.surplus].map(formatWon))]),
    new Paragraph({ children: [new TextRun({ text: "세계잉여금 처리 현황 (단위: 원)", bold: true })], spacing: { before: 300 } }),
    table([row(["세계잉여금", "사고이월", "명시이월", "계속비이월", "순세계잉여금"], true), row([draft.surplus, draft.carryovers.accident, draft.carryovers.specified, draft.carryovers.continuing, draft.netSurplus].map(formatWon))]),
    new Paragraph({ children: [new TextRun({ text: "세입 결산내역", bold: true })], pageBreakBefore: true }),
    table([row(["장", "관", "결산액", "구성비"], true), ...draft.incomeRows.map(item => row([item.chapter, item.section, formatWon(item.amount), formatRatio(item.ratio)])), row(["합계", "", formatWon(draft.incomeTotal), "100"], true)]),
    new Paragraph({ children: [new TextRun({ text: "세출 결산내역", bold: true })], spacing: { before: 300 } }),
    table([row(["정책사업", "결산액", "구성비"], true), ...draft.expenseRows.map(item => row([item.policy, formatWon(item.amount), formatRatio(item.ratio)])), row(["합계", formatWon(draft.expenseTotal), "100"], true)]),
    new Paragraph({ text: draft.attachment, spacing: { before: 300 } }),
  ] }] });
  const blob = await Packer.toBlob(document);
  return new Blob([blob], { type: MIME });
}
