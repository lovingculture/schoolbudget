import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseExpenditureWorkbook } from "../mainBudget/parseExpenditureWorkbook";
import { buildExpenditureTemplate } from "./buildExpenditureTemplate";

const headers = ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감"];

describe.each(["xls", "xlsx"] as const)("본예산 세출 %s 양식", (format) => {
  it("동일한 11개 열을 만들고 포털에서 다시 읽는다", async () => {
    const bytes = buildExpenditureTemplate(format);
    const workbook = XLSX.read(bytes, { type: "array" });
    expect(workbook.SheetNames).toEqual(["세출예산서식"]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets["세출예산서식"], { header: 1 })[0]).toEqual(headers);
    const parsed = await parseExpenditureWorkbook(new File([bytes], `본예산_세출요구서.${format}`));
    expect(parsed.rows).toEqual([]);
    expect(parsed.warnings).toContain("입력 자료 없음");
  });
});
