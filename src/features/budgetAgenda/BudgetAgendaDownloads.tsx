import { useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { exportBudgetAgendaHwpx } from "./exportHwpx";
import { exportBudgetAgendaPdf } from "./exportPdf";
import { exportBudgetAgendaWord } from "./exportWord";
import type { BudgetAgendaDraft } from "./types";

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const safe = (value: string) => value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");

export function BudgetAgendaDownloads({ draft, hasWarnings }: { draft: BudgetAgendaDraft; hasWarnings: boolean }) {
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const base = safe(`${draft.fiscalYear}학년도_${draft.schoolName}_${draft.budgetType}_예산안건설명서`);
  const run = async (kind: string, action: () => Promise<void>) => {
    setWorking(kind);
    setError("");
    try { await action(); }
    catch { setError("파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setWorking(""); }
  };
  return <section className="budget-agenda-downloads">
    <div><span>DOWNLOAD</span><h2>안건설명서 내려받기</h2><p>최종 수정한 내용으로 한글(HWPX)·PDF·Word 문서를 만듭니다.</p></div>
    {hasWarnings && <p className="budget-agenda-download-warning">합계가 일치하지 않는 항목이 있습니다. 내려받기 전에 자동 검증 결과를 확인해 주세요.</p>}
    <div>
      <button type="button" aria-label="한글(HWPX) 내려받기" onClick={() => void run("hwpx", async () => save(await exportBudgetAgendaHwpx(draft), `${base}.hwpx`))}>{working === "hwpx" ? <LoaderCircle className="spin"/> : <FileText/>}한글(HWPX)</button>
      <button type="button" aria-label="PDF 내려받기" onClick={() => void run("pdf", async () => save(await exportBudgetAgendaPdf(Array.from(document.querySelectorAll<HTMLElement>(".budget-agenda-a4-page"))), `${base}.pdf`))}>{working === "pdf" ? <LoaderCircle className="spin"/> : <Download/>}PDF</button>
      <button type="button" aria-label="Word 내려받기" onClick={() => void run("word", async () => save(await exportBudgetAgendaWord(draft), `${base}.docx`))}>{working === "word" ? <LoaderCircle className="spin"/> : <FileText/>}Word</button>
    </div>
    {error && <p className="budget-agenda-error" role="alert">{error}</p>}
  </section>;
}

