import { useMemo, useState } from "react";
import { downloadFoundationWorkbook } from "./downloadFoundationWorkbook";
import { FoundationCsvUpload } from "./FoundationCsvUpload";
import { FoundationWorkbookPreview } from "./FoundationWorkbookPreview";
import { FoundationSummary } from "./FoundationSummary";
import { foundationStorage } from "./foundationStorage";
import { parseFoundationCsv } from "./parseFoundationCsv";
import { parseFoundationExcel } from "./parseFoundationExcel";
import type { FoundationBudgetDocument } from "./types";
import { validateFoundationBudget } from "./validateFoundationBudget";
import "./mainBudgetFoundation.css";

export function MainBudgetFoundationPage() {
  const [document, setDocument] = useState<FoundationBudgetDocument | null>(() => foundationStorage.load()?.document ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const validation = useMemo(() => document ? validateFoundationBudget(document) : null, [document]);

  const analyze = async (file: File) => {
    setBusy(true); setError("");
    try {
      const extension = file.name.toLowerCase().split(".").pop();
      if (!extension || !["xls", "xlsx", "csv"].includes(extension)) throw new Error(".xls, .xlsx 또는 .csv 파일을 선택해 주세요.");
      const bytes = await file.arrayBuffer();
      const parsed = extension === "csv" ? parseFoundationCsv(file.name, bytes) : parseFoundationExcel(bytes, file.name);
      setDocument(parsed);
      if (!foundationStorage.save({ document: parsed, edits: {} })) setError("결과는 표시되지만 이 기기에 임시저장하지 못했습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "파일을 읽지 못했습니다.");
    } finally { setBusy(false); }
  };
  const reset = () => { foundationStorage.clear(); setDocument(null); setError(""); };

  return (
    <div className="content foundation-page portal-workspace">
      <div className="page-title"><span>MAIN BUDGET FOUNDATION</span><h1>본예산 편성 기초자료 만들기</h1><p>세입·세출예산서 Excel을 불러오면 편성 기초자료를 자동 정리하고 결과 파일로 내려받을 수 있습니다.</p></div>
      {!document ? <>
        <section className="foundation-download-guide" aria-labelledby="foundation-download-guide-title">
          <div>
            <span>에듀파인 자료 준비</span>
            <h2 id="foundation-download-guide-title">세입세출예산서 엑셀로 다운 받기</h2>
            <ol aria-label="에듀파인 예산서 메뉴 이동 경로">
              <li><span>1</span><b>학교회계</b></li>
              <li><span>2</span><b>예산관리</b></li>
              <li><span>3</span><b>예산현황(학교)</b></li>
              <li><span>4</span><b>예산서현황</b></li>
            </ol>
            <p>예산서현황에서 세입예산명세서와 세출예산명세서를 각각 클릭한 뒤 Excel(.xls 또는 .xlsx)로 저장합니다.</p>
          </div>
          <figure><img src="/guides/edu-finance-foundation-csv.png" alt="학교명이 가려진 에듀파인 예산서현황 Excel 선택 화면" /><figcaption>세입예산명세서와 세출예산명세서를 각각 클릭한 뒤 Excel로 저장합니다.</figcaption></figure>
        </section>
        <FoundationCsvUpload disabled={busy} onFile={(file) => void analyze(file)} />
      </> : validation ? <>
        <div className="foundation-top-actions"><button type="button" className="foundation-secondary" onClick={reset}>새 파일 분석</button><button type="button" className="foundation-primary" disabled={!validation.canExport || busy} onClick={() => void downloadFoundationWorkbook(document)}>Excel 내려받기</button></div>
        <FoundationSummary document={document} validation={validation} />
        {validation.warnings.length ? <section className="foundation-warnings" aria-label="검증 안내">{validation.warnings.map((warning, index) => <p className={warning.severity} key={`${warning.code}-${index}`}>{warning.message}</p>)}</section> : null}
        <FoundationWorkbookPreview document={document} />
      </> : null}
      {error ? <div className="foundation-error" role="alert">{error}</div> : null}
    </div>
  );
}
