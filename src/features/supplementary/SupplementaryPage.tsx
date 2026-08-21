import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Filter, RefreshCcw, Search, UploadCloud, X } from "lucide-react";
import { aggregateByUnitBusiness, calculateExecutionRow } from "./calculations";
import { ExecutionParseError, parseExecutionWorkbook } from "./parser";
import { downloadSupplementaryWorkbook } from "./exportExcel";
import type { CalculatedExecutionRow, ExecutionWorkbook } from "./types";
import "./supplementary.css";
import "./supplementaryCharacter.css";

type ResultTab = "status" | "summary" | "review" | "proposal";
type QuickFilter = "all" | "balance" | "available" | "low-rate" | "discrepancy";
type EditValues = Record<string, { planned: number; proposal: number }>;

const QUICK_FILTERS: readonly [QuickFilter, string][] = [
  ["all", "전체"],
  ["balance", "잔액 있음"],
  ["available", "추경 가능금액 있음"],
  ["low-rate", "집행률 50% 미만"],
  ["discrepancy", "불일치 있음"],
];

const money = (value: number) => value.toLocaleString("ko-KR");
const rate = (value: number) => `${value.toFixed(2)}%`;
const displayDate = (value: string) => value.length === 8
  ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`
  : value;

export function SupplementaryPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<ExecutionWorkbook | null>(null);
  const [edits, setEdits] = useState<EditValues>({});
  const [tab, setTab] = useState<ResultTab>("status");
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const calculated = useMemo(() => source?.rows.map(row => {
    const edit = edits[row.id] ?? { planned: 0, proposal: 0 };
    return calculateExecutionRow(row, edit.planned, edit.proposal);
  }) ?? [], [source, edits]);
  const filtered = useMemo(() => {
    const token = query.trim().toLowerCase();
    const searched = token ? calculated.filter(row => [
      row.policy, row.unitBusiness, row.detailBusiness, row.detailItem,
      row.costCategory, row.description,
    ].some(value => value.toLowerCase().includes(token))) : calculated;
    return searched.filter(row => {
      if (quickFilter === "balance") return row.balance > 0;
      if (quickFilter === "available") return row.availableSupplement > 0;
      if (quickFilter === "low-rate") return row.executionRate < 50;
      if (quickFilter === "discrepancy") return row.discrepancy !== 0;
      return true;
    });
  }, [calculated, query, quickFilter]);
  const summaries = useMemo(() => aggregateByUnitBusiness(filtered), [filtered]);
  const totals = useMemo(() => filtered.reduce((sum, row) => ({
    budget: sum.budget + row.budgetAmount,
    committed: sum.committed + row.committedAmount,
    paid: sum.paid + row.paidAmount,
    balance: sum.balance + row.balance,
    available: sum.available + row.availableSupplement,
    proposal: sum.proposal + row.supplementProposal,
  }), { budget: 0, committed: 0, paid: 0, balance: 0, available: 0, proposal: 0 }), [filtered]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls|xlsm)$/i.test(file.name)) {
      setError("엑셀 파일(.xls, .xlsx, .xlsm)만 사용할 수 있습니다.");
      return;
    }
    setError("");
    try {
      const parsed = parseExecutionWorkbook(await file.arrayBuffer());
      setSource(parsed);
      setEdits({});
      setTab("status");
      setQuery("");
      setQuickFilter("all");
    } catch (reason) {
      setSource(null);
      setError(reason instanceof ExecutionParseError ? reason.message : "파일을 읽지 못했습니다. 에듀파인에서 다시 내려받아 주세요.");
    }
  };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    void loadFile(event.target.files?.[0]);
    event.target.value = "";
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void loadFile(event.dataTransfer.files?.[0]);
  };
  const changeEdit = (id: string, key: "planned" | "proposal", value: number) => {
    setEdits(current => ({ ...current, [id]: { planned: current[id]?.planned ?? 0, proposal: current[id]?.proposal ?? 0, [key]: value } }));
  };
  const reset = () => {
    if (Object.keys(edits).length && !window.confirm("입력한 집행예정액과 추경(안)을 지우고 새로 시작할까요?")) return;
    setSource(null); setEdits({}); setQuery(""); setQuickFilter("all"); setError("");
  };
  const downloadExcel = async () => {
    setDownloading(true);
    setError("");
    try {
      await downloadSupplementaryWorkbook(source!, filtered);
    } catch {
      setError("일반 Excel 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDownloading(false);
    }
  };

  if (!source) return <div className="content supplementary-page portal-workspace">
    <div className="page-title supplementary-title">
      <div><span>SUPPLEMENTARY BUDGET</span><h1>집행실적으로 추경자료 만들기</h1><p>에듀파인 102-2 자료를 올리면 추경 검토자료를 자동으로 정리합니다.</p></div>
      <img src="/characters/cards/main-budget-good.png" alt="추경예산 자료 정리를 돕는 서울시교육청 캐릭터" />
    </div>
    <section className="supplementary-guide"><b>에듀파인에서 파일 받는 경로</b><p>학교회계 → 사업관리 → 사업관리카드 → 집행실적 엑셀저장(실시간)</p><span>자료코드 <strong>102-2</strong>를 선택한 후 엑셀로 내려받아 주세요.</span></section>
    <div className={dragging ? "supplementary-dropzone dragging" : "supplementary-dropzone"}
      onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)}
      onDragOver={event => event.preventDefault()} onDrop={onDrop}>
      <UploadCloud size={50}/><strong>에듀파인 집행실적 엑셀(실시간) 102-2 파일을 여기에 끌어다 놓으세요</strong>
      <span>지원 파일: .xls, .xlsx, .xlsm</span>
      <button className="primary" type="button" onClick={() => inputRef.current?.click()}>파일 선택</button>
      <input ref={inputRef} className="visually-hidden" aria-label="집행실적 102-2 파일" type="file" accept=".xls,.xlsx,.xlsm" onChange={onInput}/>
      <small>파일명뿐 아니라 102-2 필수 항목을 확인해 정확한 자료인지 검사합니다.</small>
    </div>
    {error && <div className="closing-error" role="alert">{error}<small>학교회계 → 사업관리 → 사업관리카드 → 집행실적 엑셀저장(실시간)에서 자료코드 102-2를 다시 내려받아 주세요.</small></div>}
  </div>;

  return <div className="content supplementary-page portal-workspace">
    <div className="page-title"><span>SUPPLEMENTARY BUDGET</span><h1>집행실적으로 추경자료 만들기</h1><p>예산액(4)을 기준으로 계산했습니다. 집행예정액과 추경(안)을 입력해 검토하세요.</p></div>
    <section className="supplementary-source">
      <div><span className="icon blue"><FileSpreadsheet/></span><div><strong>{source.schoolName}</strong><small>{source.fiscalYear}회계연도 · 집행기준일 {displayDate(source.executionDate)} · {source.rows.length.toLocaleString()}건</small></div></div>
      <button className="secondary" onClick={reset}><RefreshCcw size={16}/> 다른 파일 선택</button>
    </section>
    <section className="supplementary-kpis">
      <div><span>예산액(4)</span><b>{money(totals.budget)}원</b></div>
      <div><span>원인행위금액</span><b>{money(totals.committed)}원</b></div>
      <div><span>집행잔액</span><b className={totals.balance < 0 ? "negative" : ""}>{money(totals.balance)}원</b></div>
      <div><span>추경 가능금액</span><b className={totals.available < 0 ? "negative" : ""}>{money(totals.available)}원</b></div>
    </section>
    <div className="supplementary-toolbar">
      <div className="supplementary-tabs">
        {([["status","예산집행현황"],["summary","단위사업 집계"],["review","추경검토자료"],["proposal","추경검토안"]] as const)
          .map(([id,label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <label className="supplementary-search"><Search size={17}/><input aria-label="추경자료 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="사업명·산출내역 검색"/></label>
    </div>
    <div className="supplementary-quick-filter" role="group" aria-label="추경자료 빠른 필터">
      <span><Filter size={17}/>빠른 필터</span>
      <div>{QUICK_FILTERS.map(([id, label]) => <button type="button" key={id} aria-pressed={quickFilter === id} onClick={() => setQuickFilter(id)}>{label}</button>)}</div>
      <button type="button" className="supplementary-filter-reset" onClick={() => { setQuickFilter("all"); setQuery(""); }}><X size={15}/>필터 초기화</button>
    </div>
    <ExecutionResults tab={tab} rows={filtered} summaries={summaries} changeEdit={changeEdit}/>
    {error && <div className="closing-error" role="alert">{error}</div>}
    <div className="supplementary-actions">
      <button className="secondary" onClick={reset}><RefreshCcw size={16}/> 초기화</button>
      <button className="primary" disabled={downloading} onClick={() => void downloadExcel()}><Download size={17}/>{downloading ? "일반 Excel 생성 중" : "일반 Excel 다운로드"}</button>
    </div>
  </div>;
}

function ExecutionResults({ tab, rows, summaries, changeEdit }: {
  tab: ResultTab;
  rows: CalculatedExecutionRow[];
  summaries: ReturnType<typeof aggregateByUnitBusiness>;
  changeEdit: (id: string, key: "planned" | "proposal", value: number) => void;
}) {
  if (tab === "summary") return <div className="execution-table-wrap"><table className="execution-table"><thead><tr><th>정책사업</th><th>단위사업</th><th>예산액(4)</th><th>원인행위</th><th>지출</th><th>집행잔액</th><th>집행률</th></tr></thead><tbody>{summaries.map(row => <tr key={`${row.policy}-${row.unitBusiness}`}><td>{row.policy}</td><td>{row.unitBusiness}</td><td>{money(row.budgetAmount)}</td><td>{money(row.committedAmount)}</td><td>{money(row.paidAmount)}</td><td className={row.balance < 0 ? "negative" : ""}>{money(row.balance)}</td><td>{rate(row.executionRate)}</td></tr>)}</tbody></table></div>;
  const editable = tab === "review" || tab === "proposal";
  return <div className="execution-table-wrap"><table className="execution-table"><thead><tr>
    <th>정책사업</th><th>단위사업</th><th>세부사업</th><th>세부항목</th><th>원가통계비목</th><th>산출내역</th>
    <th>예산액(4)</th><th>원인행위</th><th>지출</th><th>집행잔액</th>
    {tab === "status" && <><th>불일치</th><th>집행률</th></>}
    {editable && <><th>부서별 집행예정액</th><th>추경 가능금액</th><th>추경(안)</th></>}
  </tr></thead><tbody>{rows.map(row => <tr key={row.id}>
    <td>{row.policy}</td><td>{row.unitBusiness}</td><td>{row.detailBusiness}</td><td>{row.detailItem}</td><td>{row.costCategory}</td><td>{row.description}</td>
    <td>{money(row.budgetAmount)}</td><td>{money(row.committedAmount)}</td><td>{money(row.paidAmount)}</td><td className={row.balance < 0 ? "negative" : ""}>{money(row.balance)}</td>
    {tab === "status" && <><td className={row.discrepancy !== 0 ? "warning-number" : ""}>{money(row.discrepancy)}</td><td>{rate(row.executionRate)}</td></>}
    {editable && <><td><input aria-label={`${row.description} 집행예정액`} type="number" value={row.plannedAmount} onChange={e => changeEdit(row.id, "planned", Number(e.target.value))}/></td><td className={row.availableSupplement < 0 ? "negative" : ""}>{money(row.availableSupplement)}</td><td><input aria-label={`${row.description} 추경안`} type="number" value={row.supplementProposal} onChange={e => changeEdit(row.id, "proposal", Number(e.target.value))}/></td></>}
  </tr>)}</tbody></table></div>;
}
