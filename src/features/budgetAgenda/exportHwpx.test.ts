import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createBudgetAgendaDraft } from "./createDraft";
import { exportBudgetAgendaHwpx } from "./exportHwpx";
import type { BudgetAgendaSource } from "./types";

const source: BudgetAgendaSource = {
  fiscalYear: 2026,
  schoolName: "서울옥정초등학교",
  budgetType: "추경1차",
  revisedBudget: 1771057,
  previousBudget: 1010749,
  changeAmount: 760308,
  changeRate: 75.2,
  incomeRows: [
    ["이전수입", "지방자치단체이전수입", 173893, 173893, 9.8],
    ["이전수입", "지방교육행정기관이전수입", 530743, 1252316, 70.7],
    ["이전수입", "기타이전수입", 32342, 32342, 1.8],
    ["자체수입", "학부모부담수입", 1806, 208982, 11.8],
    ["자체수입", "행정활동수입", 14740, 81740, 4.6],
    ["기타수입", "전년도이월금", 6784, 21784, 1.3],
  ].map(([chapter, section, current, cumulative, ratio], index) => ({ id: `i${index}`, chapter: String(chapter), section: String(section), current: Number(current), cumulative: Number(cumulative), ratio: Number(ratio), note: "" })),
  expenseRows: [
    ["인적자원 운용", 47213, 66153, 3.7],
    ["학생복지/교육격차해소", 205534, 348455, 19.7],
    ["기본적 교육활동", 70101, 213864, 12.1],
    ["선택적 교육활동", 248879, 398158, 22.5],
    ["교육활동 지원", 39400, 154805, 8.7],
    ["학교 일반운영", 149181, 583622, 33],
    ["학교시설 확충", 0, 6000, 0.3],
  ].map(([policy, current, cumulative, ratio], index) => ({ id: `e${index}`, policy: String(policy), current: Number(current), cumulative: Number(cumulative), ratio: Number(ratio), note: "" })),
};

const readBlob = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});

describe("예산 안건설명서 HWPX 생성", () => {
  it("한글 원본 서식을 유지하면서 입력값을 반영한다", async () => {
    const draft = { ...createBudgetAgendaDraft(source), agendaNumber: "제4호", proposalDate: "2026. 6. 1", majorContents: ["목적사업비 반영", "전기요금 편성"] };
    const zip = await JSZip.loadAsync(await readBlob(await exportBudgetAgendaHwpx(draft)));
    const section = await zip.file("Contents/section0.xml")!.async("string");
    expect(await zip.file("mimetype")!.async("string")).toBe("application/hwp+zip");
    expect(section).toContain('paraPrIDRef="100"');
    expect(section).toContain('rowSpan="2"');
    expect(section).toContain("제4호");
    expect(section).toContain("2026. 6. 1");
    expect(section).toContain("1,771,057");
    expect(section).toContain("목적사업비 반영");
    expect(section).toContain("전기요금 편성");
  }, 15_000);
});
