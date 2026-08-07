import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { parseExecutionWorkbook } from "./parser";

describe("에듀파인 집행실적 102-2 분석", () => {
  it("실제 102-2 파일의 학교정보와 집행자료를 읽는다", () => {
    const fixture = readFileSync(resolve("../upload/2026집행실적_102-2_20260801180031440.xlsx"));
    const result = parseExecutionWorkbook(Uint8Array.from(fixture).buffer);

    expect(result.schoolName).toBe("서울옥정초등학교");
    expect(result.fiscalYear).toBe(2026);
    expect(result.executionDate).toBe("20260801");
    expect(result.rows).toHaveLength(524);
    expect(result.rows[0]).toMatchObject({
      policy: "인적자원 운용",
      unitBusiness: "교직원 복지 및 역량강화",
      description: "워크숍운영비",
      budgetAmount: 3_000_000,
      committedAmount: 0,
      paidAmount: 0,
    });
  });

  it("필수 열이 없는 파일을 102-2 안내와 함께 거절한다", () => {
    const sheet = XLSX.utils.aoa_to_sheet([["회계연도", "학교명"], [2026, "서울한빛초등학교"]]);
    const data = XLSX.write({ SheetNames: ["다른자료"], Sheets: { 다른자료: sheet } }, { type: "array", bookType: "xlsx" });
    expect(() => parseExecutionWorkbook(data)).toThrow("에듀파인 실시간 집행실적 102-2 파일을 넣어주세요");
  });
});
