import { describe, expect, it } from "vitest";
import { calculateExecutionRow } from "./calculations";
import { buildSupplementaryWorkbook } from "./exportExcel";
import type { ExecutionWorkbook } from "./types";

const source: ExecutionWorkbook = {
  fiscalYear: 2026,
  executionDate: "20260801",
  schoolName: "서울옥정초등학교",
  sourceSheetName: "102-2",
  headers: ["학교명", "예산액(4)(1+2+3)"],
  originalRows: [["학교명", "예산액(4)(1+2+3)"], ["서울옥정초등학교", 1000]],
  rows: [],
};

const rows = [calculateExecutionRow({
  id: "1", policy: "정책", unitBusiness: "단위", detailBusiness: "세부", detailItem: "항목",
  account: "목", subAccount: "세목", costCategory: "일반업무추진비", description: "협의회",
  budgetAmount: 1000, committedAmount: 400, paidAmount: 350, original: {},
}, 100, -200)];

describe("추경자료 Excel 생성", () => {
  it("기준 파일의 네 시트를 정해진 순서로 만든다", async () => {
    const workbook = await buildSupplementaryWorkbook(source, rows);
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual([
      "불러온원본", "추경검토", "정리본", "단위사업별집계",
    ]);
  });

  it("정리본의 제목, 표, 필터, 틀 고정과 인쇄 설정을 만든다", async () => {
    const workbook = await buildSupplementaryWorkbook(source, rows);
    const status = workbook.getWorksheet("정리본")!;

    expect(status.getCell("A1").value).toBe("예산집행현황");
    expect(status.getCell("A3").value).toBe("정책사업");
    expect(status.getCell("I4").value).toBe(1000);
    expect(status.getCell("N4").result).toBe(0.4);
    expect(status.getCell("A5").value).toBe("총합계");
    expect(status.autoFilter).toEqual({ from: "A3", to: "O3" });
    expect(status.views[0]).toMatchObject({ state: "frozen", ySplit: 3 });
    expect(status.pageSetup.orientation).toBe("landscape");
    expect(status.pageSetup.fitToWidth).toBe(1);
  });

  it("추경검토 요약과 단위사업별 합계를 기준 위치에 만든다", async () => {
    const workbook = await buildSupplementaryWorkbook(source, rows);
    const review = workbook.getWorksheet("추경검토")!;
    const summary = workbook.getWorksheet("단위사업별집계")!;

    expect(review.getCell("A1").value).toBe("추경검토 자료");
    expect(review.getCell("A3").value).toBe("구분");
    expect(review.getCell("A4").value).toBe("전체");
    expect(review.getCell("F4").value).toBe(-200);
    expect(review.getCell("A7").value).toBe("정책사업");
    expect(review.getCell("A9").value).toBe("총합계");
    expect(summary.getCell("A1").value).toBe("단위사업별 집행현황");
    expect(summary.getCell("A5").value).toBe("총합계");
  });

  it("숫자, 백분율, 음수 집행잔액과 합계 행 서식을 적용한다", async () => {
    const negativeRows = [calculateExecutionRow({
      ...rows[0], budgetAmount: 100, committedAmount: 200, paidAmount: 150,
    }, 0, 0)];
    const workbook = await buildSupplementaryWorkbook(source, negativeRows);
    const status = workbook.getWorksheet("정리본")!;

    expect(status.getCell("I4").numFmt).toBe("#,##0");
    expect(status.getCell("N4").numFmt).toBe("0.00%");
    expect(status.getCell("L4").font.color).toEqual({ argb: "FFFF0000" });
    expect(status.getCell("A5").font.bold).toBe(true);
    expect(status.getColumn(1).width).toBeGreaterThan(10);
  });

  it("기준 파일처럼 잔액, 불일치, 집행률과 합계를 Excel 수식으로 만든다", async () => {
    const workbook = await buildSupplementaryWorkbook(source, rows);
    const status = workbook.getWorksheet("정리본")!;
    const review = workbook.getWorksheet("추경검토")!;
    const summary = workbook.getWorksheet("단위사업별집계")!;

    expect(status.getCell("L4").value).toEqual({ formula: "I4-J4", result: 600 });
    expect(status.getCell("M4").value).toEqual({ formula: "J4-K4", result: 50 });
    expect(status.getCell("N4").value).toEqual({ formula: "IFERROR(J4/I4,0)", result: 0.4 });
    expect(review.getCell("N8").value).toEqual({ formula: "L8-M8", result: 500 });
    expect(summary.getCell("D5").value).toEqual({ formula: "SUM(D4:D4)", result: 1000 });
    expect(summary.getCell("F5").value).toEqual({ formula: "IFERROR(E5/D5,0)", result: 0.4 });
  });

});
