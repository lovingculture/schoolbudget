import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { BudgetAgendaParseError, parseBudgetAgendaWorkbook } from "./parser";

function workbookBuffer(rows: unknown[][], name = "세입세출예산총괄") {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function validWorkbook() {
  const rows: unknown[][] = Array.from({ length: 19 }, () => Array(20).fill(""));
  rows[1][6] = "세입 세출 예산 총괄";
  rows[3][0] = "회계연도 : 2026\n예산구분 : 추경1회\n학 교 명 : 서울옥정초등학교";
  rows[4][0] = "예산구분"; rows[4][2] = "경정예산액"; rows[4][5] = "기정예산액"; rows[4][13] = "비교증감";
  rows[5][13] = "예산액"; rows[5][17] = "증감률(%)";
  rows[6][0] = "추경1회"; rows[6][2] = "1,771,057"; rows[6][5] = "1,010,749"; rows[6][13] = "760,308"; rows[6][17] = "75.2";
  rows[7][0] = "세입"; rows[7][10] = "세출";
  rows[8][0] = "장"; rows[8][1] = "관"; rows[8][3] = "금회"; rows[8][4] = "누계"; rows[8][9] = "구성비(%)";
  rows[8][10] = "정책사업"; rows[8][14] = "금회"; rows[8][16] = "누계"; rows[8][18] = "구성비(%)";
  const income = [
    ["이전수입", "지방자치단체이전수입", 173893, 173893, 9.8],
    ["이전수입", "지방교육행정기관이전수입", 530743, 1252316, 70.7],
    ["이전수입", "기타이전수입", 32342, 32342, 1.8],
    ["자체수입", "학부모부담수입", 1806, 208982, 11.8],
    ["자체수입", "행정활동수입", 14740, 81740, 4.6],
    ["기타수입", "전년도이월금", 6784, 21784, 1.2],
  ];
  const expense = [
    ["인적자원 운용", 47213, 66153, 3.7],
    ["학생복지/교육격차 해소", 205534, 348455, 19.7],
    ["기본적 교육활동", 70101, 213864, 12.1],
    ["선택적 교육활동", 248879, 398158, 22.5],
    ["교육활동 지원", 39400, 154805, 8.7],
    ["학교 일반운영", 149181, 583622, 33],
    ["학교시설 확충", 0, 6000, 0.3],
  ];
  income.forEach((row, index) => {
    const target = rows[9 + index];
    target[0] = row[0]; target[1] = row[1]; target[3] = row[2]; target[4] = row[3]; target[9] = row[4];
  });
  expense.forEach((row, index) => {
    const target = rows[9 + index];
    target[10] = row[0]; target[14] = row[1]; target[16] = row[2]; target[18] = row[3];
  });
  return workbookBuffer(rows);
}

describe("에듀파인 세입세출예산총괄 분석", () => {
  it("총액과 세입·세출 항목을 추출한다", () => {
    const source = parseBudgetAgendaWorkbook(validWorkbook());
    expect(source).toMatchObject({
      fiscalYear: 2026,
      schoolName: "서울옥정초등학교",
      budgetType: "추경1회",
      revisedBudget: 1771057,
      previousBudget: 1010749,
      changeAmount: 760308,
      changeRate: 75.2,
    });
    expect(source.incomeRows).toHaveLength(6);
    expect(source.expenseRows).toHaveLength(7);
    expect(source.expenseRows.at(-1)).toMatchObject({ policy: "학교시설 확충", current: 0, cumulative: 6000 });
  });

  it("다른 보고서를 명확한 안내로 거절한다", () => {
    expect(() => parseBudgetAgendaWorkbook(workbookBuffer([["다른 보고서"]], "Sheet1")))
      .toThrow(new BudgetAgendaParseError("에듀파인 예산현황의 세입세출예산총괄 파일인지 확인해 주세요."));
  });
});
