import { useEffect, useRef, useState } from "react";
import { analyzeBudgetFile, type AnalysisProgress } from "./analyzeBudgetFile";
import { mainBudgetAnalysisStorage } from "./analysisStorage";
import type { AnalysisWarning, BudgetLogicalRow, MainBudgetAnalysisResult } from "./analysisTypes";
import { GeneralBusinessExpenseTable } from "./GeneralBusinessExpenseTable";
import { MainBudgetProgress } from "./MainBudgetProgress";
import { MainBudgetSummary } from "./MainBudgetSummary";
import { MainBudgetUpload } from "./MainBudgetUpload";
import { RevenueBreakdownTable } from "./RevenueBreakdownTable";
import "./mainBudget.css";

const initialProgress: AnalysisProgress = { phase: "reading", completed: 0, total: 1 };

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "파일을 분석하지 못했습니다. 파일 형식과 내용을 확인한 뒤 다시 시도해 주세요.";
}

function sourceNote(row: BudgetLogicalRow | undefined): string | null {
  if (!row) return null;
  const source = row.sourcePage !== undefined
    ? `${row.sourcePage}쪽${row.sourceRow === undefined ? "" : ` ${row.sourceRow}행`}`
    : row.sourceSheet !== undefined
      ? `${row.sourceSheet} 시트${row.sourceRow === undefined ? "" : ` ${row.sourceRow}행`}`
      : null;
  const confidence = row.confidence === undefined ? null : `신뢰도 ${Math.round(row.confidence * 100)}%`;
  return [source, confidence].filter(Boolean).join(" · ") || null;
}

function AnalysisWarnings({ warnings }: { warnings: AnalysisWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <section className="main-budget-warnings" aria-labelledby="main-budget-warnings-title">
      <h2 id="main-budget-warnings-title">분석 경고</h2>
      <ul>
        {warnings.map((warning, index) => {
          const note = sourceNote(warning.row);
          return (
            <li className={warning.severity} key={`${warning.code}-${index}`}>
              <span aria-hidden="true">!</span>
              <div><b>{warning.message}</b>{note ? <small>{note}</small> : null}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MainBudgetPage() {
  const [result, setResult] = useState<MainBudgetAnalysisResult | null>(() => {
    mainBudgetAnalysisStorage.migrateLegacy();
    return mainBudgetAnalysisStorage.load();
  });
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const activeController = useRef<AbortController | null>(null);
  const activeRun = useRef(0);

  useEffect(() => () => {
    activeRun.current += 1;
    activeController.current?.abort();
    activeController.current = null;
  }, []);

  const analyze = async (file: File) => {
    activeController.current?.abort();
    const controller = new AbortController();
    const run = activeRun.current + 1;
    activeRun.current = run;
    activeController.current = controller;
    setBusy(true);
    setProgress(initialProgress);
    setError("");
    setResult(null);

    try {
      const analyzed = await analyzeBudgetFile(file, {
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (activeRun.current === run && !controller.signal.aborted) setProgress(nextProgress);
        },
      });
      if (activeRun.current !== run || controller.signal.aborted) return;
      mainBudgetAnalysisStorage.save(analyzed);
      setResult(analyzed);
    } catch (analysisError) {
      if (activeRun.current === run && !controller.signal.aborted && !isAbortError(analysisError)) {
        setError(errorMessage(analysisError));
      }
    } finally {
      if (activeRun.current === run) {
        activeController.current = null;
        setBusy(false);
        setProgress(null);
      }
    }
  };

  const cancel = () => {
    activeRun.current += 1;
    activeController.current?.abort();
    activeController.current = null;
    setBusy(false);
    setProgress(null);
    setError("");
  };

  const reset = () => {
    activeRun.current += 1;
    activeController.current?.abort();
    activeController.current = null;
    mainBudgetAnalysisStorage.clear();
    setResult(null);
    setBusy(false);
    setProgress(null);
    setError("");
  };

  return (
    <div className="content main-budget-page portal-workspace">
      <div className="page-title">
        <span>MAIN BUDGET ANALYSIS</span>
        <h1>본예산 PDF·Excel 자동 계산</h1>
        <p>본예산서를 불러오면 세입 기준금액과 일반업무추진비 편성 비율을 자동으로 계산합니다.</p>
      </div>

      {result ? (
        <>
          <div className="main-budget-result-actions">
            <button type="button" className="main-budget-reset" onClick={reset}>다른 파일 분석</button>
          </div>
          <MainBudgetSummary result={result} />
          <AnalysisWarnings warnings={result.warnings} />
          <RevenueBreakdownTable revenue={result.verificationRevenue} />
          <GeneralBusinessExpenseTable expenses={result.generalBusinessExpenses} />
        </>
      ) : (
        <>
          <MainBudgetUpload disabled={busy} onFile={(file) => { void analyze(file); }} />
          {progress ? <MainBudgetProgress progress={progress} onCancel={cancel} /> : null}
          {error ? <div className="main-budget-error" role="alert"><b>분석을 완료하지 못했습니다.</b><p>{error}</p></div> : null}
        </>
      )}
    </div>
  );
}
