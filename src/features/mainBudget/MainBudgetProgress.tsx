import type { AnalysisProgress } from "./analyzeBudgetFile";

const phaseLabels: Record<AnalysisProgress["phase"], string> = {
  reading: "파일을 읽는 중",
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
    </section>
  );
}
