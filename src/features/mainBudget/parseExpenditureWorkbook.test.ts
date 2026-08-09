import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { ExpenditureParseError, parseExpenditureWorkbook } from "./parseExpenditureWorkbook";

const headers = ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감"];

function workbookFile(rows: unknown[][], name = "부서자료.xlsx", sheetName = "다른시트"): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName);
  const bytes = XLSX.write(workbook, { type: "array", bookType: name.endsWith(".xls") ? "xls" : "xlsx" });
  return new File([bytes], name);
}

describe("본예산 세출 요구서 파서", () => {
  it("시트명이 달라도 11개 제목 열을 찾아 자료를 계산한다", async () => {
    const file = workbookFile([
      ["안내 문구"], headers,
      ["교육부", "교육과정운영", "교재구입", "교육운영비", "교재", "100,000원×3권", "#NAME?", "김담당", "50,000원×2권", 100000, "#NAME?"],
    ]);

    const parsed = await parseExpenditureWorkbook(file);
    expect(parsed.sheetName).toBe("다른시트");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({ sourceRow: 3, requestedAmount: 300000, priorRequestedAmount: 100000, variance: 200000 });
  });

  it("구형 xls 파일도 읽는다", async () => {
    const parsed = await parseExpenditureWorkbook(workbookFile([headers, ["행정실", "시설", "환경개선", "시설비", "도색", "200000", 200000, "이담당", "", 0, 200000]], "budget.xls", "세출예산서식"));
    expect(parsed.rows[0].sourceFile).toBe("budget.xls");
    expect(parsed.originalTotal).toBe(200000);
  });

  it("빈 양식은 경고와 빈 행을 반환한다", async () => {
    const parsed = await parseExpenditureWorkbook(workbookFile([headers, [null, null, null, null, null, null, 0, null, null, null, 0]]));
    expect(parsed.rows).toEqual([]);
    expect(parsed.warnings).toContain("입력 자료 없음");
  });

  it("필수 제목이 없는 파일은 누락 제목을 안내한다", async () => {
    await expect(parseExpenditureWorkbook(workbookFile([["부서", "금액"]]))).rejects.toEqual(expect.objectContaining<Partial<ExpenditureParseError>>({
      name: "ExpenditureParseError",
      message: expect.stringContaining("필수 열"),
    }));
  });
});
