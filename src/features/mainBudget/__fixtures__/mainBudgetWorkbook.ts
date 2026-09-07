import * as XLSX from "xlsx";

export type MainBudgetWorkbookFormat = "xls" | "xlsx";

export function mainBudgetWorkbookFile(format: MainBudgetWorkbookFormat): File {
  const rows: unknown[][] = [
    [],
    ["  세입 예산 명세서  "],
    ["세입예산총액", "1,010,749"],
    ["목적사업비전입금", 0],
    ["수익자부담수입", "207,176"],
    ["  세출 예산 명세서  "],
    ["정책사업", "단위사업", "세부사업", "원가통계비목", "예산액"],
    ["학교 일반운영", "행정지원", "일반행정", "일반업무추진비", 23_020],
    ["", "", "", "목적사업업무추진비", "99,000"],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["E8"].z = "#,##0";
  sheet["!merges"] = [
    XLSX.utils.decode_range("A2:E2"),
    XLSX.utils.decode_range("A6:E6"),
    XLSX.utils.decode_range("A8:A9"),
    XLSX.utils.decode_range("B8:B9"),
    XLSX.utils.decode_range("C8:C9"),
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "표지");
  const bytes = XLSX.write(workbook, { type: "array", bookType: format }) as ArrayBuffer;
  const file = new File([bytes], `본예산.${format}`);
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes });
  return file;
}
