import { describe, expect, it } from "vitest";
import { mainBudgetWorkbookFile } from "./__fixtures__/mainBudgetWorkbook";
import { extractWorkbookRows } from "./extractWorkbookRows";

describe("본예산 엑셀 행 추출", () => {
  it.each(["xls", "xlsx"] as const)("%s 단일 시트의 병합 셀과 한 행 오프셋을 논리 행으로 읽는다", async (format) => {
    const result = await extractWorkbookRows(mainBudgetWorkbookFile(format));

    expect(result.source).toEqual({ fileName: `본예산.${format}`, format, sheetCount: 1 });
    expect(result.rows).toEqual([
      { cells: ["세입예산명세서", "세입예산명세서", "세입예산명세서", "세입예산명세서", "세입예산명세서"], sourceSheet: "표지", sourceRow: 2 },
      { cells: ["세입예산총액", 1_010_749, "", "", ""], sourceSheet: "표지", sourceRow: 3 },
      { cells: ["목적사업비전입금", 0, "", "", ""], sourceSheet: "표지", sourceRow: 4 },
      { cells: ["수익자부담수입", 207_176, "", "", ""], sourceSheet: "표지", sourceRow: 5 },
      { cells: ["세출예산명세서", "세출예산명세서", "세출예산명세서", "세출예산명세서", "세출예산명세서"], sourceSheet: "표지", sourceRow: 6 },
      { cells: ["정책사업", "단위사업", "세부사업", "원가통계비목", "예산액"], sourceSheet: "표지", sourceRow: 7 },
      { cells: ["학교일반운영", "행정지원", "일반행정", "일반업무추진비", 23_020], sourceSheet: "표지", sourceRow: 8 },
      { cells: ["학교일반운영", "행정지원", "일반행정", "목적사업업무추진비", 99_000], sourceSheet: "표지", sourceRow: 9 },
    ]);
  });

  it.each([
    ["본예산.XLS", "xls"],
    ["본예산.XlSx", "xlsx"],
  ] as const)("대소문자와 무관하게 %s 확장자를 원본 형식으로 보존한다", async (fileName, format) => {
    const file = mainBudgetWorkbookFile("xlsx");
    Object.defineProperty(file, "name", { value: fileName });

    await expect(extractWorkbookRows(file)).resolves.toMatchObject({ source: { fileName, format } });
  });

  it.each(["본예산.csv", "본예산.xlsm", "본예산"])("지원하지 않는 %s 파일명은 거절한다", async (fileName) => {
    const file = mainBudgetWorkbookFile("xlsx");
    Object.defineProperty(file, "name", { value: fileName });

    await expect(extractWorkbookRows(file)).rejects.toThrow("지원하지 않는 파일 형식");
  });
});
