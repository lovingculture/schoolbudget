import { describe, expect, it } from "vitest";
import { createClosingDraft } from "./createDraft";
import { exportClosingExcel } from "./exportExcel";
import { exportClosingWord } from "./exportWord";
import type { ClosingSource } from "./types";

const source: ClosingSource = {
  fiscalYear: 2025, schoolName: "서울옥정초등학교", budget: 100, currentBudget: 110,
  incomeTotal: 105, expenseTotal: 90, surplus: 15,
  carryovers: { specified: 2, accident: 0, continuing: 0 }, subsidyReturn: 0,
  priorTransfer: 0, afterTransfer: 0, netSurplus: 13,
  incomeRows: [{ id: "i1", chapter: "이전수입", section: "지방교육행정기관이전수입", amount: 105, ratio: 100 }],
  expenseRows: [{ id: "e1", policy: "기본적 교육활동", amount: 90, ratio: 100 }],
};

describe("결산 안건설명서 파일 생성", () => {
  it("편집값을 포함한 Excel Blob을 만든다", () => {
    const blob = exportClosingExcel({ ...createClosingDraft(source), agendaNumber: "제3호" });
    expect(blob.type).toContain("spreadsheetml");
    expect(blob.size).toBeGreaterThan(1000);
  });

  it("편집값을 포함한 Word Blob을 만든다", async () => {
    const blob = await exportClosingWord({ ...createClosingDraft(source), proposer: "서울옥정초등학교장" });
    expect(blob.type).toContain("wordprocessingml");
    expect(blob.size).toBeGreaterThan(1000);
  });
});
