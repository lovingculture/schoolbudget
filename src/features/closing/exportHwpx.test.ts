import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createClosingDraft } from "./createDraft";
import { exportClosingHwpx } from "./exportHwpx";
import type { ClosingSource } from "./types";

const source: ClosingSource = {
  fiscalYear: 2025, schoolName: "서울옥정초등학교", budget: 2727447000, currentBudget: 2730444440,
  incomeTotal: 2724818217, expenseTotal: 2698568069, surplus: 26250148,
  carryovers: { specified: 4466880, accident: 0, continuing: 0 }, subsidyReturn: 0,
  priorTransfer: 15000000, afterTransfer: 6783268, netSurplus: 21783268,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방자치단체이전수입", amount: 2724818217, ratio: 100 }],
  expenseRows: [{ id: "e1", policy: "인적자원 운용", amount: 2698568069, ratio: 100 }],
};

const readBlob = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

describe("결산 안건설명서 HWPX 생성", () => {
  it("표준 패키지와 편집값을 포함한다", async () => {
    const draft = { ...createClosingDraft(source), agendaNumber: "제3호" };
    const blob = await exportClosingHwpx(draft);
    expect(blob.type).toBe("application/hwp+zip");

    const zip = await JSZip.loadAsync(await readBlob(blob));
    expect(await zip.file("mimetype")!.async("string")).toBe("application/hwp+zip");
    expect(zip.file("META-INF/container.xml")).not.toBeNull();
    expect(zip.file("Contents/content.hpf")).not.toBeNull();
    expect(await zip.file("Contents/content.hpf")!.async("string")).not.toMatch(/>user<|>User</);
    expect(zip.file("Contents/header.xml")).not.toBeNull();
    const sectionXml = await zip.file("Contents/section0.xml")!.async("string");
    const versionXml = await zip.file("version.xml")!.async("string");
    expect(versionXml).toContain('application="Hancom Office Hangul"');
    expect(sectionXml).toContain('paraPrIDRef="40"');
    expect(sectionXml).toContain('rowSpan="3"');
    expect(await zip.file("Preview/PrvText.txt")!.async("string")).toContain("서울옥정초등학교");
    expect(sectionXml).toContain("제3호");
    expect(sectionXml).toContain("2,724,818,217");
    expect(sectionXml).toContain("2,698,568,069");
    expect(sectionXml).toContain("26,250,148");
    expect(sectionXml).toContain("지방자치단체이전수입");
    expect(sectionXml).toContain("인적자원 운용");
    expect(sectionXml).toContain("<hp:tbl");
    expect(sectionXml).not.toContain("순수한 불용액");
  });

  it("XML 예약문자가 있는 수정값을 안전하게 저장한다", async () => {
    const blob = await exportClosingHwpx({ ...createClosingDraft(source), reason: "A & B <확인>" });
    const zip = await JSZip.loadAsync(await readBlob(blob));
    const sectionXml = await zip.file("Contents/section0.xml")!.async("string");
    expect(sectionXml).toContain("A &amp; B &lt;확인&gt;");
    expect(sectionXml).not.toContain("A & B <확인>");
  });

  it("수정한 결산 합계가 한글 수식의 이전 결과에도 남지 않는다", async () => {
    const draft = {
      ...createClosingDraft(source),
      incomeTotal: 1111111111,
      expenseTotal: 999999999,
      incomeRows: [{ ...source.incomeRows[0], amount: 1111111111 }],
      expenseRows: [{ ...source.expenseRows[0], amount: 999999999 }],
    };
    const blob = await exportClosingHwpx(draft);
    const zip = await JSZip.loadAsync(await readBlob(blob));
    const sectionXml = await zip.file("Contents/section0.xml")!.async("string");
    expect(sectionXml).toContain("1,111,111,111");
    expect(sectionXml).toContain("999,999,999");
    expect(sectionXml).not.toContain("2,724,818,217");
    expect(sectionXml).not.toContain("2,698,568,069");
  });
});
