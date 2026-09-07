import { useState } from "react";
import { classifyRevenue, selectBusinessExpenses } from "./classifyFoundationRows";
import type { FoundationBudgetDocument, FoundationExpenseRow } from "./types";

type SheetView = "revenue" | "expense" | "adjusted" | "business";

const sheets: Array<{ id: SheetView; label: string }> = [
  { id: "revenue", label: "세입" },
  { id: "expense", label: "세출(원안)" },
  { id: "adjusted", label: "세출(조정안)" },
  { id: "business", label: "업무추진비" },
];

const money = (value: number | null) => value === null ? "-" : value.toLocaleString("ko-KR");

function ExpenseTable({ rows, adjusted = false, business = false }: { rows: FoundationExpenseRow[]; adjusted?: boolean; business?: boolean }) {
  const headers = adjusted
    ? ["제출부서", "세부사업", "세부항목", "원가통계비목", "산출내역", "산출식", "요구금액(A)", "조정금액(B)", "증감금액(B-A)", "전년도 대비 증감액"]
    : ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감", "비고"];
  return <table className={`foundation-excel-table ${business ? "business" : "expense"}`}><thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => adjusted ? <tr key={`${row.source.line}-${index}`}><td>{row.department}</td><td>{row.business}</td><td>{row.detail}</td><td>{row.costItem}</td><td className="wrap">{row.calculationBasis}</td><td>{money(row.calculationAmount)}</td><td className="number">{money(row.currentAmount)}</td><td className="number">{money(row.currentAmount)}</td><td className="number">0</td><td className="number">{money(row.currentAmount - row.priorAmount)}</td></tr> : <tr key={`${row.source.line}-${index}`}><td>{row.department}</td><td>{row.business}</td><td>{row.detail}</td><td>{row.costItem}</td><td className="wrap">{row.calculationBasis}</td><td>{money(row.calculationAmount)}</td><td className="number">{money(row.currentAmount)}</td><td>{row.manager}</td><td className="wrap">{row.calculationBasis}</td><td className="number">{money(row.priorAmount)}</td><td className="number">{money(row.changeAmount)}</td><td /></tr>)}</tbody></table>;
}

export function FoundationWorkbookPreview({ document }: { document: FoundationBudgetDocument }) {
  const [view, setView] = useState<SheetView>("revenue");
  const label = sheets.find((sheet) => sheet.id === view)?.label ?? "세입";
  const businessRows = selectBusinessExpenses(document.expenseRows);
  return <section className="foundation-workbook" aria-labelledby="foundation-preview-title">
    <div className="foundation-workbook-heading"><div><span>EXCEL PREVIEW</span><h2 id="foundation-preview-title">엑셀 미리보기</h2><p>실제 파일과 같은 열 구조로 확인하세요. 표 안에서 좌우로 이동할 수 있습니다.</p></div><b>{document.fiscalYear}학년도 · {document.budgetType}</b></div>
    <div className="foundation-sheet-tabs" role="tablist" aria-label="엑셀 시트 선택">{sheets.map((sheet) => <button key={sheet.id} id={`foundation-tab-${sheet.id}`} role="tab" type="button" aria-selected={view === sheet.id} aria-controls={`foundation-panel-${sheet.id}`} onClick={() => setView(sheet.id)}>{sheet.label}</button>)}</div>
    <div className="foundation-excel-viewport" id={`foundation-panel-${view}`} role="tabpanel" aria-labelledby={`foundation-tab-${view}`} aria-label={label}>
      <div className="foundation-excel-title">{document.fiscalYear}학년도 {label} 편성 기초자료</div>
      {view === "revenue" ? <table className="foundation-excel-table revenue"><thead><tr>{["장", "관", "항", "목", "원가통계목", "산출내역", "산출식", "예산액", "전년도 산출식", "전년도 예산", "예산성격", "비고"].map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{document.revenueRows.map((row, index) => <tr key={`${row.source.line}-${index}`}><td>{row.chapter}</td><td>{row.division}</td><td>{row.section}</td><td>{row.item}</td><td>{row.costItem}</td><td className="wrap">{row.calculationBasis}</td><td>{money(row.calculationAmount)}</td><td className="number">{money(row.currentAmount)}</td><td className="wrap">{row.calculationBasis}</td><td className="number">{money(row.priorAmount)}</td><td>{classifyRevenue(row)}</td><td /></tr>)}</tbody></table> : null}
      {view === "expense" ? <ExpenseTable rows={document.expenseRows} /> : null}
      {view === "adjusted" ? <ExpenseTable rows={document.expenseRows} adjusted /> : null}
      {view === "business" ? <ExpenseTable rows={businessRows} business /> : null}
    </div>
  </section>;
}
