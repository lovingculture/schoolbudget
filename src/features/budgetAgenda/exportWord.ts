import { AlignmentType, BorderStyle, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { BudgetAgendaDraft } from "./types";

const MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const money = (value: number) => value.toLocaleString("ko-KR");
const ratio = (value: number) => value.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const cell = (value: string, bold = false) => new TableCell({
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: value, bold, size: 20 })] })],
});
const row = (values: string[], bold = false) => new TableRow({ children: values.map(value => cell(value, bold)) });
const table = (rows: TableRow[]) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows,
  borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
});
const bodyParagraph = (value: string, bold = false, spacing?: { before?: number }) => new Paragraph({
  spacing,
  children: [new TextRun({ text: value, bold, size: 24 })],
});

export async function exportBudgetAgendaWord(draft: BudgetAgendaDraft): Promise<Blob> {
  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: draft.title, bold: true, size: 38, font: "휴먼명조" })] }),
    table([
      row(["안건번호", draft.agendaNumber, "제안년월일", draft.proposalDate]),
      row(["제안자", draft.proposer, "제안설명자", draft.presenter]),
    ]),
    new Paragraph({ text: "1. 제안이유", heading: HeadingLevel.HEADING_2, spacing: { before: 360 } }),
    bodyParagraph(draft.reason),
    new Paragraph({ text: "2. 근거", heading: HeadingLevel.HEADING_2, spacing: { before: 280 } }),
    ...draft.basis.split("\n").map(line => bodyParagraph(line)),
    new Paragraph({ text: "3. 주요내용", heading: HeadingLevel.HEADING_2, spacing: { before: 280 } }),
    new Paragraph({ children: [new TextRun({ text: "가. 총 규모 (단위 : 천원)", bold: true })] }),
    table([
      row(["구분", draft.revisedBudgetLabel, draft.previousBudgetLabel, "증감액(B-A)", "증감률(%)"], true),
      row(["예산액", money(draft.revisedBudget), money(draft.previousBudget), money(draft.changeAmount), ratio(draft.changeRate)]),
    ]),
    new Paragraph({ children: [new TextRun({ text: "나. 세입예산 (단위 : 천원)", bold: true })], spacing: { before: 280 } }),
    table([
      row(["구분", "금회", "누계(B)", "구성비(%)", "비고"], true),
      ...draft.incomeRows.map(item => row([item.section, money(item.current), money(item.cumulative), ratio(item.ratio), item.note])),
      row(["계", money(draft.changeAmount), money(draft.revisedBudget), "100.0", ""], true),
    ]),
    new Paragraph({ children: [new TextRun({ text: "다. 세출예산 (단위 : 천원)", bold: true })], pageBreakBefore: true }),
    table([
      row(["정책사업", "금회", "누계", "구성비(%)", "비고"], true),
      ...draft.expenseRows.map(item => row([item.policy, money(item.current), money(item.cumulative), ratio(item.ratio), item.note])),
      row(["계", money(draft.changeAmount), money(draft.revisedBudget), "100.0", ""], true),
    ]),
    bodyParagraph(`라. ${draft.contentTitle}`, true, { before: 320 }),
    ...draft.majorContents.map((content, index) => bodyParagraph(`${index + 1}) ${content}`)),
  ];
  const document = new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 850, bottom: 850, left: 850 } } }, children }] });
  const blob = await Packer.toBlob(document);
  return new Blob([blob], { type: MIME });
}
