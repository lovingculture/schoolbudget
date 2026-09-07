import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Download, FileSpreadsheet, Filter, FolderOpen, RefreshCcw, Save, Search, Trash2, UploadCloud, X } from "lucide-react";
import { aggregateByUnitBusiness, calculateExecutionRow } from "./calculations";
import { ExecutionParseError, parseExecutionWorkbook } from "./parser";
import { downloadSupplementaryWorkbook } from "./exportExcel";
import type { CalculatedExecutionRow, ExecutionWorkbook } from "./types";
import "./supplementary.css";
import "./supplementaryCharacter.css";

type ResultTab = "status" | "summary" | "review" | "proposal";
type QuickFilter = "all" | "balance" | "available" | "low-rate" | "discrepancy";
type EditValues = Record<string, { planned: number; proposal: number }>;
type TextColumn = "policy" | "unitBusiness" | "detailBusiness" | "detailItem" | "account" | "subAccount" | "costCategory" | "description";
type ColumnFilters = Partial<Record<TextColumn, string[]>>;
type SortState = { column: TextColumn; direction: "asc" | "desc" } | null;
type SupplementaryDraft = {
  version: 1;
  savedAt: string;
  source: ExecutionWorkbook;
  edits: EditValues;
  tab: ResultTab;
  query: string;
  quickFilter: QuickFilter;
  columnFilters: ColumnFilters;
  sort: SortState;
};

const DRAFT_STORAGE_KEY = "school-budget:supplementary-draft:v1";
const TEXT_COLUMNS: readonly [TextColumn, string][] = [
  ["policy", "정책사업"], ["unitBusiness", "단위사업"], ["detailBusiness", "세부사업"],
  ["detailItem", "세부항목"], ["account", "목명"], ["subAccount", "세목명"],
  ["costCategory", "원가통계비목"], ["description", "산출내역"],
];

const QUICK_FILTERS: readonly [QuickFilter, string][] = [
  ["all", "전체"],
  ["balance", "잔액 있음"],
  ["available", "추경 가능금액 있음"],
  ["low-rate", "집행률 50% 미만"],
  ["discrepancy", "원인행위·지출 불일치"],
];

const money = (value: number) => value.toLocaleString("ko-KR");
const rate = (value: number) => `${value.toFixed(2)}%`;
const displayDate = (value: string) => value.length === 8
  ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`
  : value;

const filterSummary = (selectedCount: number, totalCount: number) => {
  if (selectedCount === 0) return "전체 해제";
  const excludedCount = totalCount - selectedCount;
  return excludedCount < selectedCount ? `${excludedCount}개 제외됨` : `${selectedCount}개 선택`;
};

function MoneyInput({ label, value, allowNegative = false, onChange }: {
  label: string;
  value: number;
  allowNegative?: boolean;
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => money(value));

  useEffect(() => {
    if (!editing) setText(money(value));
  }, [editing, value]);

  return <input
    className={allowNegative && value < 0 ? "signed-money-input negative" : "signed-money-input"}
    aria-label={label}
    type="text"
    inputMode="decimal"
    value={editing ? text : money(value)}
    onFocus={event => {
      setEditing(true);
      setText(String(value));
      event.currentTarget.select();
    }}
    onChange={event => {
      const next = event.target.value.replaceAll(",", "").replaceAll(" ", "");
      if (!/^-?\d*$/.test(next) || (!allowNegative && next.startsWith("-"))) return;
      setText(next);
      if (next && next !== "-") onChange(Number(next));
    }}
    onBlur={() => {
      setEditing(false);
      setText(money(value));
    }}
  />;
}

const readDraft = (): SupplementaryDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SupplementaryDraft;
    return draft.version === 1 && draft.source?.rows ? draft : null;
  } catch {
    return null;
  }
};

export function SupplementaryPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<ExecutionWorkbook | null>(null);
  const [edits, setEdits] = useState<EditValues>({});
  const [tab, setTab] = useState<ResultTab>("status");
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [sort, setSort] = useState<SortState>(null);
  const [openFilter, setOpenFilter] = useState<TextColumn | null>(null);
  const [draft, setDraft] = useState<SupplementaryDraft | null>(() => readDraft());
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const calculated = useMemo(() => source?.rows.map(row => {
    const edit = edits[row.id] ?? { planned: 0, proposal: 0 };
    return calculateExecutionRow(row, edit.planned, edit.proposal);
  }) ?? [], [source, edits]);
  const columnOptions = useMemo(() => Object.fromEntries(TEXT_COLUMNS.map(([column]) => [
    column,
    [...new Set(calculated.map(row => row[column]))].sort((a, b) => a.localeCompare(b, "ko")),
  ])) as Record<TextColumn, string[]>, [calculated]);
  const filtered = useMemo(() => {
    const token = query.trim().toLowerCase();
    const searched = token ? calculated.filter(row => [
      row.policy, row.unitBusiness, row.detailBusiness, row.detailItem, row.account, row.subAccount,
      row.costCategory, row.description,
    ].some(value => value.toLowerCase().includes(token))) : calculated;
    const quickFiltered = searched.filter(row => {
      if (quickFilter === "balance") return row.balance > 0;
      if (quickFilter === "available") return row.availableSupplement > 0;
      if (quickFilter === "low-rate") return row.executionRate < 50;
      if (quickFilter === "discrepancy") return row.discrepancy !== 0;
      return true;
    });
    const columnFiltered = quickFiltered.filter(row => TEXT_COLUMNS.every(([column]) => {
      const selected = columnFilters[column];
      return !selected || selected.includes(row[column]);
    }));
    if (!sort) return columnFiltered;
    return [...columnFiltered].sort((a, b) => {
      const compared = a[sort.column].localeCompare(b[sort.column], "ko");
      return sort.direction === "asc" ? compared : -compared;
    });
  }, [calculated, query, quickFilter, columnFilters, sort]);
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
      setColumnFilters({});
      setSort(null);
      setSaveMessage("");
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
  const toggleColumnValue = (column: TextColumn, value: string) => {
    setColumnFilters(current => {
      const options = columnOptions[column];
      const selected = current[column] ?? options;
      const next = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value];
      const updated = { ...current };
      if (next.length === options.length) delete updated[column];
      else updated[column] = next;
      return updated;
    });
  };
  const toggleAllColumnValues = (column: TextColumn) => {
    setColumnFilters(current => {
      const options = columnOptions[column];
      const selected = current[column];
      if (!selected || selected.length === options.length) return { ...current, [column]: [] };
      const updated = { ...current };
      delete updated[column];
      return updated;
    });
  };
  const resetFilters = () => {
    setQuickFilter("all"); setQuery(""); setColumnFilters({}); setSort(null); setOpenFilter(null);
  };
  const saveDraft = () => {
    if (!source) return;
    const nextDraft: SupplementaryDraft = {
      version: 1, savedAt: new Date().toISOString(), source, edits, tab, query, quickFilter, columnFilters, sort,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
      setDraft(nextDraft);
      setSaveMessage("현재 브라우저에 임시저장했습니다. 브라우저를 닫아도 다음 접속에서 불러올 수 있습니다.");
    } catch {
      setError("임시저장 공간이 부족합니다. 기존 임시저장 자료를 삭제한 뒤 다시 시도해 주세요.");
    }
  };
  const restoreDraft = () => {
    if (!draft) return;
    setSource(draft.source); setEdits(draft.edits); setTab(draft.tab); setQuery(draft.query);
    setQuickFilter(draft.quickFilter); setColumnFilters(draft.columnFilters); setSort(draft.sort); setError("");
    setSaveMessage("임시저장 자료를 불러왔습니다.");
  };
  const deleteDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setDraft(null); setSaveMessage("");
  };
  const reset = () => {
    if (Object.keys(edits).length && !window.confirm("입력한 집행예정액과 추경(안)을 지우고 새로 시작할까요?")) return;
    setSource(null); setEdits({}); setQuery(""); setQuickFilter("all"); setColumnFilters({}); setSort(null); setError(""); setSaveMessage("");
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
    <section className="supplementary-guide" aria-labelledby="supplementary-download-guide-title">
      <div className="supplementary-guide-copy">
        <b id="supplementary-download-guide-title">에듀파인에서 파일 받는 경로</b>
        <ol className="edu-finance-steps">
          <li><span>1</span><strong style={{ fontSize: "16px", wordBreak: "keep-all" }}>학교회계</strong></li>
          <li><span>2</span><strong style={{ fontSize: "16px", wordBreak: "keep-all" }}>사업관리</strong></li>
          <li><span>3</span><strong style={{ fontSize: "16px", wordBreak: "keep-all" }}>사업관리 카드</strong></li>
          <li><span>4</span><strong style={{ fontSize: "16px", wordBreak: "keep-all" }}>집행실적 엑셀저장(실시간)</strong></li>
        </ol>
        <p className="edu-finance-highlight">자료코드 <strong>102-2</strong>를 선택한 후 엑셀로 내려받아 주세요.</p>
      </div>
      <figure className="edu-finance-guide-figure">
        <img src="/guides/edu-finance-execution-102-2.png" alt="에듀파인 집행실적 엑셀저장 화면에서 자료코드 102-2를 선택하는 위치" />
        <figcaption>자료코드 102-2를 선택하고 엑셀저장을 진행하세요.</figcaption>
      </figure>
    </section>
    {draft && <section className="supplementary-draft-card" aria-label="임시저장 자료">
      <span className="icon green"><FolderOpen/></span>
      <div><strong>{draft.source.schoolName} 임시저장 자료</strong><small>{draft.source.fiscalYear}회계연도 · {new Date(draft.savedAt).toLocaleString("ko-KR")} 저장</small></div>
      <div><button type="button" className="primary" onClick={restoreDraft}>임시저장 불러오기</button><button type="button" className="secondary" onClick={deleteDraft}><Trash2 size={16}/>삭제</button></div>
    </section>}
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
      <button type="button" className="supplementary-filter-reset" onClick={resetFilters}><X size={15}/>필터 초기화</button>
    </div>
    {Object.entries(columnFilters).length > 0 && <div className="supplementary-active-filters" aria-label="적용된 열 필터">
      {Object.entries(columnFilters).map(([column, selected]) => {
        const label = TEXT_COLUMNS.find(([key]) => key === column)?.[1] ?? column;
        return <button type="button" key={column} onClick={() => setColumnFilters(current => { const next = { ...current }; delete next[column as TextColumn]; return next; })}>{label}: {filterSummary(selected?.length ?? 0, columnOptions[column as TextColumn].length)} <X size={14}/></button>;
      })}
    </div>}
    <ExecutionResults tab={tab} rows={filtered} summaries={summaries} changeEdit={changeEdit}
      columnOptions={columnOptions} columnFilters={columnFilters} openFilter={openFilter} sort={sort}
      onOpenFilter={setOpenFilter} onToggleColumnValue={toggleColumnValue} onToggleAllColumnValues={toggleAllColumnValues} onSort={setSort}/>
    {error && <div className="closing-error" role="alert">{error}</div>}
    {saveMessage && <p className="supplementary-save-message" role="status">{saveMessage}</p>}
    <div className="supplementary-actions">
      <button className="secondary" onClick={reset}><RefreshCcw size={16}/> 초기화</button>
      <button className="secondary" onClick={saveDraft}><Save size={17}/> 임시저장</button>
      <button className="primary" disabled={downloading} onClick={() => void downloadExcel()}><Download size={17}/>{downloading ? "일반 Excel 생성 중" : "일반 Excel 다운로드"}</button>
    </div>
  </div>;
}

function ExcelFilterHeader({ column, label, options, selected, isOpen, sort, onOpen, onToggle, onToggleAll, onSort }: {
  column: TextColumn;
  label: string;
  options: string[];
  selected?: string[];
  isOpen: boolean;
  sort: SortState;
  onOpen: (column: TextColumn | null) => void;
  onToggle: (column: TextColumn, value: string) => void;
  onToggleAll: (column: TextColumn) => void;
  onSort: (sort: SortState) => void;
}) {
  const direction = sort?.column === column ? (sort.direction === "asc" ? "ascending" : "descending") : undefined;
  return <th className="excel-filter-column">
    <div className="excel-filter-heading"><span>{label}</span><button type="button" aria-label={`${label} 필터 열기`} aria-expanded={isOpen} data-sorted={direction} onClick={() => onOpen(isOpen ? null : column)}><ChevronDown size={15}/></button></div>
    {isOpen && <div className="excel-filter-menu" role="group" aria-label={`${label} 필터`}>
      <div className="excel-filter-sort"><button type="button" aria-label="오름차순 정렬" onClick={() => onSort({ column, direction: "asc" })}><ArrowUpAZ size={16}/>오름차순</button><button type="button" aria-label="내림차순 정렬" onClick={() => onSort({ column, direction: "desc" })}><ArrowDownAZ size={16}/>내림차순</button></div>
      <div className="excel-filter-values"><label className="excel-filter-select-all"><input type="checkbox" aria-label="전체 선택" checked={!selected || selected.length === options.length} ref={input => { if (input) input.indeterminate = Boolean(selected && selected.length > 0 && selected.length < options.length); }} onChange={() => onToggleAll(column)}/><span>전체 선택</span></label>{options.map(value => <label key={value}><input type="checkbox" checked={!selected || selected.includes(value)} onChange={() => onToggle(column, value)}/><span>{value || "(빈 셀)"}</span></label>)}</div>
    </div>}
  </th>;
}

function ExecutionResults({ tab, rows, summaries, changeEdit, columnOptions, columnFilters, openFilter, sort, onOpenFilter, onToggleColumnValue, onToggleAllColumnValues, onSort }: {
  tab: ResultTab;
  rows: CalculatedExecutionRow[];
  summaries: ReturnType<typeof aggregateByUnitBusiness>;
  changeEdit: (id: string, key: "planned" | "proposal", value: number) => void;
  columnOptions: Record<TextColumn, string[]>;
  columnFilters: ColumnFilters;
  openFilter: TextColumn | null;
  sort: SortState;
  onOpenFilter: (column: TextColumn | null) => void;
  onToggleColumnValue: (column: TextColumn, value: string) => void;
  onToggleAllColumnValues: (column: TextColumn) => void;
  onSort: (sort: SortState) => void;
}) {
  if (tab === "summary") return <div className="execution-table-wrap"><table className="execution-table"><thead><tr><th>정책사업</th><th>단위사업</th><th>예산액(4)</th><th>원인행위</th><th>지출</th><th>집행잔액</th><th>집행률</th></tr></thead><tbody>{summaries.map(row => <tr key={`${row.policy}-${row.unitBusiness}`}><td>{row.policy}</td><td>{row.unitBusiness}</td><td>{money(row.budgetAmount)}</td><td>{money(row.committedAmount)}</td><td>{money(row.paidAmount)}</td><td className={row.balance < 0 ? "negative" : ""}>{money(row.balance)}</td><td>{rate(row.executionRate)}</td></tr>)}</tbody></table></div>;
  const editable = tab === "review" || tab === "proposal";
  const headerProps = { columnOptions, columnFilters, openFilter, sort, onOpenFilter, onToggleColumnValue, onToggleAllColumnValues, onSort };
  return <div className="execution-table-wrap"><table className="execution-table"><thead><tr>
    {TEXT_COLUMNS.map(([column, label]) => <ExcelFilterHeader key={column} column={column} label={label} options={headerProps.columnOptions[column]} selected={headerProps.columnFilters[column]} isOpen={headerProps.openFilter === column} sort={headerProps.sort} onOpen={headerProps.onOpenFilter} onToggle={headerProps.onToggleColumnValue} onToggleAll={headerProps.onToggleAllColumnValues} onSort={headerProps.onSort}/>)}
    <th>{editable ? "예산액" : "예산액(4)"}</th><th>{editable ? "원인행위금액" : "원인행위"}</th><th>{editable ? "지출금액" : "지출"}</th><th>집행잔액</th>
    {tab === "status" && <><th>불일치</th><th>집행률</th></>}
    {editable && <><th>부서별집행예정액</th><th>추경감액가능금액</th><th>추경(안)</th></>}
  </tr></thead><tbody>{rows.map(row => <tr key={row.id}>
    <td>{row.policy}</td><td>{row.unitBusiness}</td><td>{row.detailBusiness}</td><td>{row.detailItem}</td><td>{row.account}</td><td>{row.subAccount}</td><td>{row.costCategory}</td><td>{row.description}</td>
    <td>{money(row.budgetAmount)}</td><td>{money(row.committedAmount)}</td><td>{money(row.paidAmount)}</td><td className={row.balance < 0 ? "negative" : ""}>{money(row.balance)}</td>
    {tab === "status" && <><td className={row.discrepancy !== 0 ? "warning-number" : ""}>{money(row.discrepancy)}</td><td>{rate(row.executionRate)}</td></>}
    {editable && <><td><MoneyInput label={`${row.description} 집행예정액`} value={row.plannedAmount} onChange={value => changeEdit(row.id, "planned", value)}/></td><td className={row.availableSupplement < 0 ? "negative" : ""}>{money(row.availableSupplement)}</td><td><MoneyInput label={`${row.description} 추경안`} value={row.supplementProposal} allowNegative onChange={value => changeEdit(row.id, "proposal", value)}/></td></>}
  </tr>)}</tbody></table></div>;
}
