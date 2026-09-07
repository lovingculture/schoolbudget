import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, FileSpreadsheet, UploadCloud } from "lucide-react";
import { BudgetAgendaEditor } from "./BudgetAgendaEditor";
import { BudgetAgendaPreview } from "./BudgetAgendaPreview";
import { BudgetAgendaDownloads } from "./BudgetAgendaDownloads";
import { createBudgetAgendaDraft } from "./createDraft";
import { BudgetAgendaParseError, parseBudgetAgendaWorkbook } from "./parser";
import type { BudgetAgendaDraft } from "./types";
import { validateBudgetAgenda } from "./validation";
import "./budgetAgenda.css";

export function BudgetAgendaPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<BudgetAgendaDraft | null>(null);
  const [original, setOriginal] = useState<BudgetAgendaDraft | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const load = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      const next = createBudgetAgendaDraft(parseBudgetAgendaWorkbook(await file.arrayBuffer()));
      setOriginal(next);
      setDraft(next);
    } catch (caught) {
      setOriginal(null);
      setDraft(null);
      setError(caught instanceof BudgetAgendaParseError ? caught.message : "파일을 불러오지 못했습니다. 다시 시도해 주세요.");
    }
  };
  const choose = (event: ChangeEvent<HTMLInputElement>) => void load(event.target.files?.[0]);
  const drop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    void load(event.dataTransfer.files?.[0]);
  };
  const validation = draft ? validateBudgetAgenda(draft) : [];
  return <div className="content budget-agenda-page portal-workspace">
    <div className="page-title">
      <span>예산안건 설명서</span>
      <h1>예산 안건설명서 자동작성</h1>
      <p>에듀파인 예산총괄표를 불러오면 안건설명서가 자동으로 작성됩니다.</p>
    </div>
    <section className="budget-agenda-guide">
      <div className="budget-agenda-guide-icon"><FileSpreadsheet /></div>
      <div className="budget-agenda-guide-content">
        <h2>사용 방법</h2>
        <div className="budget-agenda-download-guide">
          <ol className="edu-finance-steps">
            <li><span>1</span><strong>학교회계</strong></li>
            <li><span>2</span><strong>예산관리</strong></li>
            <li><span>3</span><strong>예산현황(학교)</strong></li>
            <li><span>4</span><strong>예산서현황</strong></li>
          </ol>
          <p className="edu-finance-highlight"><strong>세입세출예산 총괄표</strong>를 선택하여 <strong>.xls(엑셀)</strong> 문서로 내려받아 주세요.</p>
          <figure className="edu-finance-guide-figure">
            <img src="/guides/edu-finance-budget-summary.png" alt="에듀파인 예산서현황에서 세입세출예산 총괄표를 선택하는 위치" />
            <figcaption>세입세출예산 총괄표를 선택한 뒤 .xls 형식으로 저장하세요.</figcaption>
          </figure>
        </div>
        <ol>
          <li>에듀파인 예산현황의 세입세출총괄표를 다운로드한 후 <b>세입세출총괄표 불러오기</b> 버튼을 눌러 원본 파일을 선택하세요.</li>
          <li>자동으로 만들어지는 입력 화면에서 안건번호, 제안이유, 근거, 주요내용 등을 수정하세요.</li>
        </ol>
      </div>
    </section>
    <section
      className={`budget-agenda-upload ${dragging ? "dragging" : ""}`}
      onDragEnter={() => setDragging(true)}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <UploadCloud size={42}/>
      <h2>세입세출예산총괄표를 불러오세요</h2>
      <p>지원 형식: Excel .xlsx, .xls</p>
      <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={choose}/>
      <button type="button" className="primary" onClick={() => inputRef.current?.click()}>세입세출총괄표 불러오기</button>
      <span className="budget-agenda-drop">Excel 파일을 이곳에 끌어다 놓아도 됩니다.</span>
    </section>
    {error && <p className="budget-agenda-error" role="alert"><CircleAlert/>{error}</p>}
    {draft && original && <>
      <section className="budget-agenda-validation"><h2>자동 검증</h2><div>{validation.map(item => <span className={item.ok ? "ok" : "warning"} key={item.id}>
        {item.ok ? <CheckCircle2/> : <CircleAlert/>}{item.label}
      </span>)}</div></section>
      <div className="budget-agenda-workspace budget-agenda-workspace-vertical">
        <BudgetAgendaEditor original={original} draft={draft} onChange={setDraft}/>
        <BudgetAgendaPreview draft={draft}/>
      </div>
      <BudgetAgendaDownloads draft={draft} hasWarnings={validation.some(item => !item.ok)}/>
    </>}
  </div>;
}
