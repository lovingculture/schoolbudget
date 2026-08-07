import { useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";
import { exportClosingPdf } from "./exportPdf";
import { exportClosingWord } from "./exportWord";
import type { ClosingAgendaDraft } from "./types";

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ClosingDownloads({ draft }: { draft: ClosingAgendaDraft }) {
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const base = `${draft.fiscalYear}학년도_${draft.schoolName}_결산_안건설명서`;
  const run = async (kind: string, label: string, action: () => Promise<void>) => {
    setWorking(kind); setError("");
    try { await action(); } catch { setError(`${label} 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.`); }
    finally { setWorking(""); }
  };
  return <section className="closing-downloads">
    <div><span>DOWNLOAD</span><h2>안건설명서 내려받기</h2><p>최종 수정한 내용으로 파일을 만듭니다.</p></div>
    <div className="closing-download-buttons">
      <button type="button" aria-label="PDF 내려받기" onClick={() => void run("pdf", "PDF", async () => save(await exportClosingPdf(Array.from(document.querySelectorAll<HTMLElement>(".closing-a4-page"))), `${base}.pdf`))}>{working === "pdf" ? <LoaderCircle className="spin"/> : <Download/>}PDF</button>
      <button type="button" aria-label="Word(DOCX) 내려받기" onClick={() => void run("word", "Word(DOCX)", async () => save(await exportClosingWord(draft), `${base}.docx`))}>{working === "word" ? <LoaderCircle className="spin"/> : <FileText/>}Word(DOCX)</button>
    </div>
    {error && <p className="closing-download-error" role="alert">{error}</p>}
  </section>;
}
