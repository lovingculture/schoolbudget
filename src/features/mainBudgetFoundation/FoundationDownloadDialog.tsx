import { useEffect, useState } from "react";

interface Props {
  canDownloadResult: boolean;
  onDownloadResult: () => void;
}

export function FoundationDownloadDialog({ canDownloadResult, onDownloadResult }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return <>
    <button type="button" className="foundation-primary" onClick={() => setOpen(true)}>엑셀 자료 내려받기</button>
    {open ? <div className="foundation-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="foundation-download-dialog" role="dialog" aria-modal="true" aria-labelledby="foundation-dialog-title">
        <div className="foundation-dialog-heading"><div><span>DOWNLOAD</span><h2 id="foundation-dialog-title">엑셀 자료 내려받기</h2></div><button type="button" aria-label="닫기" onClick={() => setOpen(false)}>×</button></div>
        <div className="foundation-download-options">
          <article><span className="foundation-download-icon" aria-hidden="true">XLSX</span><div><h3>분석 결과 Excel</h3><p>미리보기와 같은 네 개 시트를 일반 Excel 파일로 저장합니다.</p></div><button type="button" aria-label="분석 결과 Excel 내려받기" disabled={!canDownloadResult} onClick={() => { onDownloadResult(); setOpen(false); }}>내려받기</button></article>
          <article><span className="foundation-download-icon macro" aria-hidden="true">XLSM</span><div><h3>작업용 매크로 양식</h3><p>제공된 자동화 양식을 내려받아 Excel에서 사용할 수 있습니다.</p></div><a aria-label="작업용 매크로 양식 내려받기" href="/download/school-main-budget-foundation-template.xlsm" download>내려받기</a></article>
        </div>
        <button type="button" className="foundation-dialog-close" onClick={() => setOpen(false)}>닫기</button>
      </section>
    </div> : null}
  </>;
}
