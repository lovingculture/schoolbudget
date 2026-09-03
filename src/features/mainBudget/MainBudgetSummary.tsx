import type { MainBudgetAnalysisResult } from "./analysisTypes";

export function formatThousandWon(value: number | null): string {
  return value === null ? "확인 필요" : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 3 })}천원`;
}

export function formatWon(value: number | null): string {
  return value === null ? "확인 필요" : `${(value * 1_000).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`;
}

function comparisonLabel(status: MainBudgetAnalysisResult["comparison"]["status"]): string {
  if (status === "match") return "일치";
  if (status === "mismatch") return "불일치";
  return "확인 필요";
}

export function MainBudgetSummary({ result }: { result: MainBudgetAnalysisResult }) {
  const sourceCount = result.source.pageCount !== undefined
    ? `${result.source.pageCount.toLocaleString("ko-KR")}쪽`
    : result.source.sheetCount !== undefined
      ? `${result.source.sheetCount.toLocaleString("ko-KR")}개 시트`
      : "분량 확인 필요";
  return (
    <section className="main-budget-summary-section" aria-labelledby="main-budget-summary-title">
      <div className="main-budget-section-heading">
        <div>
          <h2 id="main-budget-summary-title">분석 결과</h2>
          <p><b>{result.source.fileName}</b> · {result.source.format.toUpperCase()}</p>
          <div className="main-budget-document-identity" aria-label="문서 정보">
            <span>{result.identity.schoolName}</span>
            <span>{result.identity.accountingYear}학년도</span>
            <span>{result.identity.budgetType}</span>
            <span>{sourceCount}</span>
          </div>
        </div>
      </div>
      <div className="main-budget-summary">
        <article>
          <span>세입 기준금액</span>
          <b>{formatThousandWon(result.revenueBaseline)}</b>
          <small>{formatWon(result.revenueBaseline)}</small>
        </article>
        <article>
          <span>일반업무추진비</span>
          <b>{formatThousandWon(result.generalBusinessExpenseTotal)}</b>
          <small>{formatWon(result.generalBusinessExpenseTotal)}</small>
        </article>
        <article>
          <span>편성 비율</span>
          <b>{result.ratio === null ? "확인 필요" : `${result.ratio.toFixed(2)}%`}</b>
          <small>일반업무추진비 ÷ 세입 기준금액</small>
        </article>
      </div>
      <div className={`main-budget-comparison ${result.comparison.status}`}>
        <div>
          <span>원본 세입합계 대조</span>
          <b>{comparisonLabel(result.comparison.status)}</b>
        </div>
        <p>
          원본 계산값 {formatThousandWon(result.comparison.revenueBaseline)} · 8개 항목 합계 {formatThousandWon(result.comparison.verificationRevenueTotal)}
          {result.comparison.status === "mismatch" && result.comparison.difference !== null
            ? <strong>차이 {formatThousandWon(result.comparison.difference)}</strong>
            : null}
        </p>
      </div>
    </section>
  );
}
