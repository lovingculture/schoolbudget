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
  const recognized = row.cells
    .filter((cell): cell is string | number => typeof cell === "string" || typeof cell === "number")
    .map(String)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const characters = Array.from(recognized);
  const truncated = characters.length > 72 ? `${characters.slice(0, 71).join("")}…` : recognized;
  const recognizedNote = truncated ? `인식 문자열: “${truncated}”` : null;
  return [source, recognizedNote, confidence].filter(Boolean).join(" · ") || null;
}

const repeatedOcrRowCodes = new Set([
  "LOW_CONFIDENCE_REVENUE_ROW",
  "LOW_CONFIDENCE_EXPENDITURE_ROW",
]);
const warningGroupThreshold = 10;
const representativeWarningCount = 3;

type WarningDisplayItem =
  | { kind: "single"; warning: AnalysisWarning; key: string }
  | { kind: "group"; warnings: AnalysisWarning[]; key: string };

function warningDisplayItems(warnings: AnalysisWarning[]): WarningDisplayItem[] {
  const repeatedCounts = new Map<string, number>();
  for (const warning of warnings) {
    if (repeatedOcrRowCodes.has(warning.code)) {
      repeatedCounts.set(warning.code, (repeatedCounts.get(warning.code) ?? 0) + 1);
    }
  }

  const emittedGroups = new Set<string>();
  return warnings.flatMap((warning, index): WarningDisplayItem[] => {
    const count = repeatedCounts.get(warning.code) ?? 0;
    if (count <= warningGroupThreshold) {
      return [{ kind: "single", warning, key: `${warning.code}-${index}` }];
    }
    if (emittedGroups.has(warning.code)) return [];
    emittedGroups.add(warning.code);
    return [{
      kind: "group",
      warnings: warnings.filter((candidate) => candidate.code === warning.code),
      key: `group-${warning.code}`,
    }];
  });
}

function AnalysisWarnings({ warnings }: { warnings: AnalysisWarning[] }) {
  if (warnings.length === 0) return null;
  const displayItems = warningDisplayItems(warnings);
  return (
    <section className="main-budget-warnings" aria-labelledby="main-budget-warnings-title">
      <h2 id="main-budget-warnings-title">분석 경고</h2>
      <ul>
        {displayItems.map((item) => {
          if (item.kind === "group") {
            const representativeWarnings = item.warnings.slice(0, representativeWarningCount);
            const hiddenCount = item.warnings.length - representativeWarnings.length;
            const severity = item.warnings.some(({ severity }) => severity === "error") ? "error" : "warning";
            return (
              <li className={`${severity} grouped`} key={item.key}>
                <span aria-hidden="true">!</span>
                <div>
                  <b>동일한 OCR 행 경고 {item.warnings.length}건을 묶어서 표시합니다.</b>
                  <p>{item.warnings[0].message}</p>
                  <small>대표 출처 {representativeWarnings.length}건 표시 · 나머지 {hiddenCount}건은 목록에서 접었습니다.</small>
                  <div className="main-budget-warning-evidence" aria-label="대표 경고 출처">
                    {representativeWarnings.map((warning, index) => {
                      const note = sourceNote(warning.row);
                      return note ? <small key={`${warning.code}-evidence-${index}`} aria-label={`경고 출처: ${note}`}>{note}</small> : null;
                    })}
                  </div>
                </div>
              </li>
            );
          }
          const warning = item.warning;
          const note = sourceNote(warning.row);
          return (
            <li className={warning.severity} key={item.key}>
              <span aria-hidden="true">!</span>
              <div><b>{warning.message}</b>{note ? <small aria-label={`경고 출처: ${note}`}>{note}</small> : null}</div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function MainBudgetPage() {
  const [result, setResult] = useState<MainBudgetAnalysisResult | null>(() => {
    try {
      mainBudgetAnalysisStorage.migrateLegacy();
      return mainBudgetAnalysisStorage.load();
    } catch {
      return null;
    }
  });
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageWarning, setStorageWarning] = useState("");
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
    setStorageWarning("");
    setResult(null);

    try {
      const analyzed = await analyzeBudgetFile(file, {
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (activeRun.current === run && !controller.signal.aborted) setProgress(nextProgress);
        },
      });
      if (activeRun.current !== run || controller.signal.aborted) return;
      let saved = false;
      try {
        saved = mainBudgetAnalysisStorage.save(analyzed);
      } catch {
        saved = false;
      }
      setResult(analyzed);
      if (!saved) setStorageWarning("분석 결과는 표시되지만 브라우저에 저장하지 못해 다음 방문 때 복원할 수 없습니다.");
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
    try {
      mainBudgetAnalysisStorage.clear();
    } catch {
      // A blocked browser store must not prevent starting a new analysis.
    }
    setResult(null);
    setBusy(false);
    setProgress(null);
    setError("");
    setStorageWarning("");
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
          {storageWarning ? <div className="main-budget-storage-warning" role="status">{storageWarning}</div> : null}
          <AnalysisWarnings warnings={result.warnings} />
          <RevenueBreakdownTable revenue={result.verificationRevenue} />
          <GeneralBusinessExpenseTable expenses={result.generalBusinessExpenses} />
        </>
      ) : (
        <>
          <MainBudgetUpload
            disabled={busy}
            onFile={(file) => { void analyze(file); }}
            onSelectionError={(message) => setError(message)}
          />
          {progress ? <MainBudgetProgress progress={progress} onCancel={cancel} /> : null}
          {error ? <div className="main-budget-error" role="alert"><b>분석을 완료하지 못했습니다.</b><p>{error}</p></div> : null}
        </>
      )}
    </div>
  );
}
