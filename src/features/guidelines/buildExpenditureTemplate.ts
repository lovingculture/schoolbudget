import * as XLSX from "xlsx";

export type ExpenditureTemplateFormat = "xls" | "xlsx";
const HEADERS = ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감"];

export function buildExpenditureTemplate(format: ExpenditureTemplateFormat): Uint8Array {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS]);
  sheet["!cols"] = [14,22,22,20,30,24,14,14,24,16,14].map((wch) => ({ wch }));
  sheet["!autofilter"] = { ref: "A1:K1" };
  XLSX.utils.book_append_sheet(workbook, sheet, "세출예산서식");
  return XLSX.write(workbook, { type: "array", bookType: format }) as Uint8Array;
}

export function downloadExpenditureTemplate(format: ExpenditureTemplateFormat): void {
  const bytes = buildExpenditureTemplate(format);
  const mime = format === "xls" ? "application/vnd.ms-excel" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `부서별_본예산_세출요구자료_양식.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}
