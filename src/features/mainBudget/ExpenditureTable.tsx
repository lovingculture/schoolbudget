import { useMemo, useState } from "react";
import { summarizeExpenditures } from "./summarizeExpenditures";
import type { MainBudgetExpenditureRow, ReviewLevel } from "./types";

const money = (value?: number) => value === undefined ? "확인 필요" : `${value.toLocaleString()}원`;
export function ExpenditureTable({ rows }: { rows: MainBudgetExpenditureRow[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState<"" | ReviewLevel>("");
  const [sortKey, setSortKey] = useState<"department" | "requestedAmount">("department");
  const [descending, setDescending] = useState(false);
  const departments = useMemo(() => [...new Set(rows.map((row) => row.department).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = [row.department, row.business, row.detail, row.costCategory, row.description, row.manager].join(" ").toLocaleLowerCase();
    return (!query || haystack.includes(query.toLocaleLowerCase())) && (!department || row.department === department) && (!level || row.issues.some((issue) => issue.level === level));
  }).sort((a, b) => {
    const compared = sortKey === "department" ? a.department.localeCompare(b.department, "ko") : (a.requestedAmount ?? -Infinity) - (b.requestedAmount ?? -Infinity);
    return descending ? -compared : compared;
  }), [rows, query, department, level, sortKey, descending]);
  const summary = summarizeExpenditures(filtered);
  return <section className="main-budget-table-section">
    <div className="main-budget-filters">
      <label>통합검색<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="부서, 사업, 산출내역" /></label>
      <label>부서<select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">전체</option>{departments.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>검토상태<select value={level} onChange={(event) => setLevel(event.target.value as "" | ReviewLevel)}><option value="">전체</option><option value="error">오류</option><option value="warning">주의</option><option value="review">확인 필요</option></select></label>
      <label>정렬<select value={sortKey} onChange={(event) => setSortKey(event.target.value as "department" | "requestedAmount")}><option value="department">부서명</option><option value="requestedAmount">요구금액</option></select></label>
      <button type="button" onClick={() => setDescending((value) => !value)}>{descending ? "내림차순" : "오름차순"}</button>
      <button type="button" onClick={() => { setQuery(""); setDepartment(""); setLevel(""); }}>필터 초기화</button>
    </div>
    <p className="main-budget-result"><b>{filtered.length}건 조회</b><span>조회 요구액 {money(summary.requestedTotal)}</span></p>
    <div className="main-budget-table-wrap"><table><thead><tr><th>부서</th><th>세부사업</th><th>세부항목</th><th>원가통계비목</th><th>산출내역</th><th>산출식</th><th>요구금액</th><th>전년요구금액</th><th>증감</th><th>검토</th></tr></thead>
      <tbody>{filtered.map((row) => <tr key={row.id}><td>{row.department || "미입력"}</td><td>{row.business}</td><td>{row.detail}</td><td>{row.costCategory}</td><td>{row.description}</td><td>{row.expression}</td><td>{money(row.requestedAmount)}</td><td>{money(row.priorRequestedAmount)}</td><td>{money(row.variance)}</td><td>{row.issues.length ? row.issues.map((issue) => issue.message).join(" / ") : "정상"}</td></tr>)}</tbody></table></div>
    {!filtered.length && <p className="main-budget-empty">조건에 맞는 세출자료가 없습니다.</p>}
  </section>;
}
