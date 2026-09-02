import type { AnalysisProgress } from "./analyzeBudgetFile";

const phaseLabels: Record<AnalysisProgress["phase"], string> = {
  reading: "파일을 읽는 중",
  "pdf-text": "PDF 문자를 분석하는 중",
  "ocr-initializing": "OCR을 준비하는 중",
  "ocr-rendering": "OCR 페이지를 준비하는 중",
  "ocr-recognizing": "OCR로 문자를 인식하는 중",
  parsing: "예산 항목을 계산하는 중",
  complete: "분석을 마무리하는 중",
};

export function MainBudgetProgress({ progress, onCancel }: { progress: AnalysisProgress; onCancel: () => void }) {
  const total = Math.max(progress.total, 1);
  const completed = Math.min(Math.max(progress.completed, 0), total);

  return (
    <section className="main-budget-progress" role="status" aria-live="polite" aria-label="본예산 파일 분석 진행">
      <div className="main-budget-progress-heading">
        <div>
          <h2>{phaseLabels[progress.phase]}</h2>
          <p>{progress.completed.toLocaleString()} / {progress.total.toLocaleString()}</p>
        </div>
        <button type="button" className="main-budget-cancel" onClick={onCancel}>분석 취소</button>
      </div>
      <progress value={completed} max={total} aria-label={`${phaseLabels[progress.phase]} 진행률`} />
      {progress.phase.startsWith("ocr-") ? <small>스캔 문서는 페이지 수에 따라 시간이 걸릴 수 있습니다.</small> : null}
    </section>
  );
}
