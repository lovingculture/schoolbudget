import { useMemo, useState } from "react";
import { downloadFoundationWorkbook } from "./downloadFoundationWorkbook";
import { FoundationCsvUpload } from "./FoundationCsvUpload";
import { FoundationDataGrid, type FoundationView } from "./FoundationDataGrid";
import { FoundationSummary } from "./FoundationSummary";
import { foundationStorage } from "./foundationStorage";
import { parseFoundationCsv } from "./parseFoundationCsv";
import type { FoundationBudgetDocument } from "./types";
import { validateFoundationBudget } from "./validateFoundationBudget";
import "./mainBudgetFoundation.css";

export function MainBudgetFoundationPage() {
  const [document, setDocument] = useState<FoundationBudgetDocument | null>(() => foundationStorage.load()?.document ?? null);
  const [view, setView] = useState<FoundationView>("revenue");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const validation = useMemo(() => document ? validateFoundationBudget(document) : null, [document]);

  const analyze = async (file: File) => {
    setBusy(true); setError("");
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("CSV 파일만 선택할 수 있습니다.");
      const parsed = parseFoundationCsv(file.name, await file.arrayBuffer());
      setDocument(parsed); setView("revenue");
      if (!foundationStorage.save({ document: parsed, edits: {} })) setError("결과는 표시되지만 이 기기에 임시저장하지 못했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "파일을 읽지 못했습니다.");
    } finally { setBusy(false); }
  };
  const reset = () => { foundationStorage.clear(); setDocument(null); setError(""); };

  return (
    <div className="content foundation-page portal-workspace">
      <div className="page-title"><span>MAIN BUDGET FOUNDATION</span><h1>본예산 편성 기초자료 만들기</h1><p>세입·세출 통합 CSV를 불러오면 편성 기초자료를 자동 정리하고 Excel 파일로 내려받을 수 있습니다.</p></div>
      {!document ? <FoundationCsvUpload disabled={busy} onFile={(file) => void analyze(file)} /> : validation ? <>
        <div className="foundation-top-actions"><button type="button" className="foundation-secondary" onClick={reset}>새 파일 분석</button><button type="button" className="foundation-primary" disabled={!validation.canExport || busy} onClick={() => void downloadFoundationWorkbook(document)}>Excel 내려받기</button></div>
        <FoundationSummary document={document} validation={validation} />
        {validation.warnings.length ? <section className="foundation-warnings" aria-label="검증 안내">{validation.warnings.map((warning, index) => <p className={warning.severity} key={`${warning.code}-${index}`}>{warning.message}</p>)}</section> : null}
        <nav className="foundation-tabs" aria-label="기초자료 보기"><button className={view === "revenue" ? "active" : ""} type="button" onClick={() => setView("revenue")}>세입 보기</button><button className={view === "expense" ? "active" : ""} type="button" onClick={() => setView("expense")}>세출 보기</button><button className={view === "business" ? "active" : ""} type="button" onClick={() => setView("business")}>업무추진비 보기</button></nav>
        <FoundationDataGrid key={view} document={document} view={view} />
      </> : null}
      {error ? <div className="foundation-error" role="alert">{error}</div> : null}
    </div>
  );
}
