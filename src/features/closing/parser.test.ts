import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseClosingWorkbook } from "./parser";

type MoneyEncoding = "number" | "comma-string";

const encodeMoney = (value: number, encoding: MoneyEncoding) =>
  encoding === "number" ? value : value.toLocaleString("en-US");

function createClosingWorkbook(
  encoding: MoneyEncoding,
  bookType: "xls" | "xlsx" = "xlsx",
  sheetName = "세입세출결산총괄표",
) {
  const rows: unknown[][] = Array.from({ length: 41 }, () => Array(24).fill(""));
  const money = (value: number) => encodeMoney(value, encoding);
  rows[0][8] = "2025년도 학교회계 결산총괄표";
  rows[3][0] = "예산액"; rows[3][3] = "예산현액"; rows[3][6] = "세입결산액(A)"; rows[3][10] = "세출결산액(B)"; rows[3][14] = "세계잉여금(A-B)";
  rows[4][0] = money(2727447000); rows[4][3] = money(2730444440); rows[4][6] = money(2724818217); rows[4][10] = money(2698568069); rows[4][14] = money(26250148);
  rows[6][15] = "보조금반환\n확정액"; rows[6][20] = "순세계잉여금";
  rows[7][4] = "명시"; rows[7][8] = "사고"; rows[7][11] = "계속비";
  rows[8][4] = money(4466880); rows[8][8] = money(0); rows[8][11] = money(0); rows[8][15] = money(0); rows[8][20] = money(15000000); rows[8][21] = money(6783268); rows[8][23] = money(21783268);
  rows[11][0] = "장"; rows[11][6] = "관"; rows[11][16] = "결산액";
  const incomes: Array<[string, string, number]> = [
    ["이전수입", "지방자치단체이전수입", 361675980],
    ["", "지방교육행정기관이전수입", 1713791920],
    ["", "기타이전수입", 35229540],
    ["자체수입", "학부모부담수입", 492433285],
    ["", "행정활동수입", 84076826],
    ["기타수입", "전년도이월금", 37610666],
  ];
  incomes.forEach(([chapter, section, amount], index) => {
    rows[12 + index][0] = chapter;
    rows[12 + index][6] = section;
    rows[12 + index][16] = money(amount);
  });
  rows[18][0] = "합계";
  rows[21][0] = "정책사업"; rows[21][16] = "결산액";
  const expenses: Array<[string, number]> = [
    ["인적자원 운용", 135260610], ["학생복지/교육격차 해소", 717036580],
    ["기본적 교육활동", 251845210], ["선택적 교육활동", 714770804],
    ["교육활동 지원", 354453355], ["학교 일반운영", 517378510],
    ["학교시설 확충", 7823000],
  ];
  expenses.forEach(([policy, amount], index) => {
    rows[29 + index][0] = policy;
    rows[29 + index][16] = money(amount);
  });
  rows[36][0] = "합계";
  rows[24][19] = "서울특별시교육청 서울옥정초등학교";
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  return XLSX.write(
    { SheetNames: [sheetName], Sheets: { [sheetName]: sheet } },
    { type: "array", bookType },
  ) as ArrayBuffer;
}

function createWorkbookWithTwoValidClosingSheets() {
  const source = XLSX.read(createClosingWorkbook("number"), { type: "array" });
  const sheet = source.Sheets["세입세출결산총괄표"];
  return XLSX.write(
    { SheetNames: ["결산자료 A", "결산자료 B"], Sheets: { "결산자료 A": sheet, "결산자료 B": sheet } },
    { type: "array", bookType: "xlsx" },
  ) as ArrayBuffer;
}

describe("에듀파인 세입세출결산총괄표 분석", () => {
  it("실제 에듀파인 파일에서 결산 항목을 추출한다", () => {
    const source = parseClosingWorkbook(createClosingWorkbook("number"));

    expect(source.fiscalYear).toBe(2025);
    expect(source.schoolName).toBe("서울옥정초등학교");
    expect(source.budget).toBe(2727447000);
    expect(source.currentBudget).toBe(2730444440);
    expect(source.incomeTotal).toBe(2724818217);
    expect(source.expenseTotal).toBe(2698568069);
    expect(source.surplus).toBe(26250148);
    expect(source.carryovers).toEqual({ specified: 4466880, accident: 0, continuing: 0 });
    expect(source.netSurplus).toBe(21783268);
    expect(source.incomeRows).toHaveLength(6);
    expect(source.expenseRows).toHaveLength(7);
    expect(source.incomeRows.map(row => row.ratio)).toEqual([13.3, 62.9, 1.3, 18.1, 3.1, 1.4]);
    expect(source.expenseRows.at(-1)).toMatchObject({ policy: "학교시설 확충", ratio: 0.3 });
  });

  it("쉼표 문자열 금액의 xlsx를 숫자형 xls와 동일하게 읽는다", () => {
    const xls = parseClosingWorkbook(createClosingWorkbook("number", "xls"));
    const xlsx = parseClosingWorkbook(createClosingWorkbook("comma-string", "xlsx"));

    expect(xlsx).toEqual(xls);
    expect(xlsx.incomeRows).toHaveLength(6);
    expect(xlsx.expenseRows).toHaveLength(7);
    expect(xlsx.incomeTotal).toBe(2_724_818_217);
    expect(xlsx.expenseTotal).toBe(2_698_568_069);
  });

  it("숫자가 아닌 상세 금액을 행 번호와 함께 거절한다", () => {
    const workbook = XLSX.read(createClosingWorkbook("comma-string"), { type: "array" });
    workbook.Sheets["세입세출결산총괄표"]["Q14"].v = "361,675,98O";
    const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    expect(() => parseClosingWorkbook(data)).toThrow(
      "세입 결산내역 14행 금액 '361,675,98O'을 숫자로 읽을 수 없습니다.",
    );
  });

  it("정책사업 열에 있는 페이지 푸터는 금액 행으로 오인하지 않는다", () => {
    const workbook = XLSX.read(createClosingWorkbook("comma-string"), { type: "array" });
    workbook.Sheets["세입세출결산총괄표"]["A26"] = { t: "s", v: "담당자 2026년 08월 07일 17시 47분 39초" };
    const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    expect(parseClosingWorkbook(data).expenseRows).toHaveLength(7);
  });

  it("엑셀 확장자로 위장한 바이트를 구체적으로 거절한다", () => {
    const fake = new TextEncoder().encode("not an excel workbook").buffer;
    expect(() => parseClosingWorkbook(fake)).toThrow(
      "실제 파일 형식이 올바르지 않습니다",
    );
  });

  it("시트명이 달라도 결산 제목과 필수 헤더가 있으면 찾는다", () => {
    const data = createClosingWorkbook("comma-string", "xlsx", "결산자료 출력");
    expect(parseClosingWorkbook(data).incomeRows).toHaveLength(6);
  });

  it("결산표 후보가 둘이면 자동 확정하지 않는다", () => {
    expect(() => parseClosingWorkbook(createWorkbookWithTwoValidClosingSheets())).toThrow(
      "결산총괄표 후보 시트가 여러 개입니다",
    );
  });

  it("다른 보고서를 명확한 메시지로 거절한다", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["집행현황"]]);
    const data = XLSX.write(
      { SheetNames: ["다른보고서"], Sheets: { 다른보고서: sheet } },
      { type: "array", bookType: "xlsx" },
    );

    expect(() => parseClosingWorkbook(data)).toThrow(
      "에듀파인 세입세출결산총괄표 시트를 찾을 수 없습니다",
    );
  });
});
