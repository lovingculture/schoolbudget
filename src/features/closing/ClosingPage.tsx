import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { CheckCircle2, FileSpreadsheet, UploadCloud } from "lucide-react";
import { createClosingDraft } from "./createDraft";
import { formatWon } from "./format";
import { ClosingParseError, parseClosingWorkbook } from "./parser";
import type { ClosingAgendaDraft, ClosingSource, ValidationResult } from "./types";
import { validateClosing } from "./validation";
import { ClosingEditor } from "./ClosingEditor";
import { ClosingAgendaPreview } from "./ClosingAgendaPreview";
import { ClosingDownloads } from "./ClosingDownloads";

export function ClosingPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<ClosingSource | null>(null);
  const [draft, setDraft] = useState<ClosingAgendaDraft | null>(null);
  const [originalDraft, setOriginalDraft] = useState<ClosingAgendaDraft | null>(null);
  const [validations, setValidations] = useState<ValidationResult[]>([]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    if (!/\.xlsx?$/i.test(file.name)) {
      setError("에듀파인 세입세출결산총괄표 엑셀 파일만 사용할 수 있습니다.");
      return;
    }
    setError("");
    try {
      const parsed = parseClosingWorkbook(await file.arrayBuffer());
      setSource(parsed);
      const nextDraft = createClosingDraft(parsed);
      setDraft(nextDraft);
      setOriginalDraft(nextDraft);
      setValidations(validateClosing(parsed));
    } catch (reason) {
      setSource(null);
      setDraft(null);
      setOriginalDraft(null);
      setValidations([]);
      setError(
        reason instanceof ClosingParseError
          ? reason.message
          : "파일을 읽지 못했습니다. 에듀파인에서 새로 내려받아 다시 시도해 주세요.",
      );
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

  if (source && draft && originalDraft) {
    return <div className="content closing-page portal-workspace">
      <div className="page-title"><span>CLOSING AGENDA</span><h1>결산 안건설명서 자동작성</h1><p>에듀파인 자료를 확인했습니다. 자동검증 결과를 확인한 후 내용을 수정하세요.</p></div>
      <section className="closing-source-summary">
        <div className="closing-source-title"><span className="icon blue"><FileSpreadsheet/></span><div><strong>{source.schoolName}</strong><small>{source.fiscalYear}학년도 세입세출결산총괄표</small></div><button className="secondary" onClick={() => { setSource(null); setDraft(null); setOriginalDraft(null); }}>다른 파일 선택</button></div>
        <div className="closing-money-grid"><div><span>세입결산액</span><b>{formatWon(source.incomeTotal)}원</b></div><div><span>세출결산액</span><b>{formatWon(source.expenseTotal)}원</b></div><div><span>세계잉여금</span><b>{formatWon(source.surplus)}원</b></div></div>
      </section>
      <section className="closing-validation"><h2>자료 자동검증</h2>{validations.map(result => <div key={result.id} className={result.ok ? "ok" : "warning"}><CheckCircle2/><span>{result.label}</span><b>{result.ok ? "정상" : "확인 필요"}</b></div>)}</section>
      <ClosingEditor original={originalDraft} draft={draft} onChange={setDraft}/>
      <section className="closing-preview-section"><div className="section-title"><div><span>PREVIEW</span><h2>A4 2쪽 미리보기</h2></div><p>입력한 내용이 출력 문서에 바로 반영됩니다.</p></div><ClosingAgendaPreview draft={draft}/></section>
      <ClosingDownloads draft={draft}/>
    </div>;
  }

  return <div className="content closing-page portal-workspace">
    <div className="page-title"><span>CLOSING AGENDA</span><h1>결산 안건설명서 자동작성</h1><p>에듀파인 결산자료를 올리면 공식 안건설명서를 자동으로 만듭니다.</p></div>
    <div
      className={dragging ? "closing-dropzone dragging" : "closing-dropzone"}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={event => event.preventDefault()}
      onDrop={onDrop}
    >
      <UploadCloud size={48}/>
      <strong>에듀파인 「세입세출결산총괄표」를 여기에 끌어다 놓으세요</strong>
      <div className="closing-path"><b>다운로드 경로</b><span>학교회계 → 예산결산 → 결산서 → 결산서 일괄 출력 → 세입세출결산총괄표 → 엑셀 다운로드</span></div>
      <span className="closing-formats">지원 파일: .xls, .xlsx</span>
      <button className="primary" type="button" onClick={() => inputRef.current?.click()}>파일 선택</button>
      <input ref={inputRef} className="visually-hidden" aria-label="세입세출결산총괄표 파일" type="file" accept=".xls,.xlsx" onChange={onInput}/>
      <small>반드시 에듀파인에서 내려받은 세입세출결산총괄표를 사용해 주세요.</small>
    </div>
    {error && <div className="closing-error" role="alert">{error}<small>학교회계 → 예산결산 → 결산서 → 결산서 일괄 출력에서 다시 내려받아 주세요.</small></div>}
    <section className="closing-privacy"><b>학교 자료는 안전하게</b><p>선택한 파일은 이 브라우저에서만 처리되며 서버에 업로드하거나 저장하지 않습니다.</p></section>
  </div>;
}
