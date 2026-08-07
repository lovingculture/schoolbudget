import { describe, expect, it } from "vitest";
import { calculateExecutionRow } from "./calculations";
import { createSupplementaryExcelModel } from "./excelRows";
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
  id: "1",
  policy: "정책",
  unitBusiness: "단위",
  detailBusiness: "세부",
  detailItem: "항목",
  account: "목",
  subAccount: "세목",
  costCategory: "일반업무추진비",
  description: "협의회",
  budgetAmount: 1000,
  committedAmount: 400,
  paidAmount: 350,
  original: {},
}, 100, -200)];

describe("추경자료 Excel 행 모델", () => {
  it("기준 파일과 같은 네 시트 이름과 정리본 열을 만든다", () => {
    const model = createSupplementaryExcelModel(source, rows);

    expect(model.sheetNames).toEqual(["불러온원본", "추경검토", "정리본", "단위사업별집계"]);
    expect(model.status.headers).toEqual([
      "정책사업", "단위사업", "세부사업", "세부항목", "목명", "세목명",
      "원가통계비목", "산출내역", "예산액", "원인행위금액", "지출금액",
      "집행잔액", "원인행위·지출 불일치", "예산액 대비\r\n원인행위\r\n집행률", "추경(안)",
    ]);
  });

  it("정리본과 추경검토의 계산값 및 합계를 숫자로 만든다", () => {
    const model = createSupplementaryExcelModel(source, rows);

    expect(model.status.rows[0].slice(8, 15)).toEqual([1000, 400, 350, 600, 50, 0.4, -200]);
    expect(model.status.total.slice(8, 15)).toEqual([1000, 400, 350, 600, 50, 0.4, -200]);
    expect(model.review.rows[0].slice(8, 15)).toEqual([1000, 400, 350, 600, 100, 500, -200]);
    expect(model.review.overview).toEqual([
      ["전체", 1000, 400, 350, 600, -200],
      ["일반업무추진비", 1000, 400, 350, 600, -200],
    ]);
  });

  it("단위사업별집계와 총합계를 만든다", () => {
    const model = createSupplementaryExcelModel(source, rows);

    expect(model.summary.headers).toEqual(["정책사업", "단위사업", "세부사업", "예산액", "원인행위금액", "집행률"]);
    expect(model.summary.rows).toEqual([["정책", "단위", "세부", 1000, 400, 0.4]]);
    expect(model.summary.total).toEqual(["총합계", null, null, 1000, 400, 0.4]);
  });
});
