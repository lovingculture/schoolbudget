import { useMemo, useState } from "react";
import { classifyRevenue, selectBusinessExpenses } from "./classifyFoundationRows";
import type { FoundationBudgetDocument } from "./types";

export type FoundationView = "revenue" | "expense" | "business";

const money = (value: number | null) => value === null ? "-" : value.toLocaleString("ko-KR");

export function FoundationDataGrid({ document, view }: { document: FoundationBudgetDocument; view: FoundationView }) {
  const [query, setQuery] = useState("");
  const revenueSource = view === "revenue" ? document.revenueRows : [];
  const expenseSource = view === "expense" ? document.expenseRows : view === "business" ? selectBusinessExpenses(document.expenseRows) : [];
  const sourceCount = view === "revenue" ? revenueSource.length : expenseSource.length;
  const [selected, setSelected] = useState<Set<number>>(() => new Set(Array.from({ length: sourceCount }, (_, index) => index)));
  const revenueRows = useMemo(() => revenueSource.map((row, index) => ({ row, index })).filter(({ row }) => Object.values(row).some((value) => typeof value === "string" && value.toLowerCase().includes(query.toLowerCase()))), [revenueSource, query]);
  const expenseRows = useMemo(() => expenseSource.map((row, index) => ({ row, index })).filter(({ row }) => Object.values(row).some((value) => typeof value === "string" && value.toLowerCase().includes(query.toLowerCase()))), [expenseSource, query]);
  const title = view === "revenue" ? "세입 기초자료" : view === "expense" ? "세출 기초자료" : "업무추진비 기초자료";

  return (
    <section className="foundation-grid-card">
      <div className="foundation-grid-tools">
        <div><h2>{title}</h2><p>표시할 행을 선택하고 검색하여 변환 내용을 확인하세요.</p></div>
        <div className="foundation-grid-actions">
          <label>항목 검색<input aria-label="항목 검색" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="사업명·비목 검색" /></label>
          <button type="button" onClick={() => setSelected(new Set(Array.from({ length: sourceCount }, (_, index) => index)))}>전체 선택</button>
          <button type="button" onClick={() => setSelected(new Set())}>전체 선택 해제</button>
        </div>
      </div>
      <div className="foundation-table-scroll">
        {view === "revenue" ? (
          <table aria-label={title}><thead><tr><th>선택</th><th>장</th><th>관</th><th>항</th><th>목</th><th>원가통계비목</th><th>산출내역</th><th>예산액</th><th>성격</th></tr></thead>
            <tbody>{revenueRows.map(({ row, index }) => <tr key={`${row.source.line}-${index}`}><td><input aria-label={`${row.costItem} 선택`} type="checkbox" checked={selected.has(index)} onChange={() => setSelected((previous) => { const next = new Set(previous); next.has(index) ? next.delete(index) : next.add(index); return next; })} /></td><td>{row.chapter}</td><td>{row.division}</td><td>{row.section}</td><td>{row.item}</td><td>{row.costItem}</td><td>{row.calculationBasis}</td><td className="foundation-money">{money(row.currentAmount)}</td><td>{classifyRevenue(row)}</td></tr>)}</tbody>
          </table>
        ) : (
          <table aria-label={title}><thead><tr><th>선택</th><th>정책사업</th><th>단위사업</th><th>세부사업</th><th>세부항목</th><th>원가통계비목</th><th>산출내역</th><th>예산액</th><th>전년도</th></tr></thead>
            <tbody>{expenseRows.map(({ row, index }) => <tr key={`${row.source.line}-${index}`}><td><input aria-label={`${row.costItem} 선택`} type="checkbox" checked={selected.has(index)} onChange={() => setSelected((previous) => { const next = new Set(previous); next.has(index) ? next.delete(index) : next.add(index); return next; })} /></td><td>{row.policy}</td><td>{row.unit}</td><td>{row.business}</td><td>{row.detail}</td><td>{row.costItem}</td><td>{row.calculationBasis}</td><td className="foundation-money">{money(row.currentAmount)}</td><td className="foundation-money">{money(row.priorAmount)}</td></tr>)}</tbody>
          </table>
        )}
        {(view === "revenue" ? revenueRows.length : expenseRows.length) === 0 ? <p className="foundation-empty">검색 결과가 없습니다.</p> : null}
      </div>
    </section>
  );
}
