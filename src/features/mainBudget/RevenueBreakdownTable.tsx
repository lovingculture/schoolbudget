import type { RevenueFactCollection } from "./analysisTypes";
import { formatThousandWon, formatWon } from "./MainBudgetSummary";

export function RevenueBreakdownTable({ revenue }: { revenue: RevenueFactCollection }) {
  return (
    <section className="main-budget-detail-card" aria-labelledby="revenue-breakdown-title">
      <div className="main-budget-section-heading">
        <div>
          <h2 id="revenue-breakdown-title">세입 검증 항목</h2>
          <p>세입 기준금액과 독립적으로 대조한 8개 항목입니다.</p>
        </div>
        <span className={`main-budget-completeness ${revenue.isComplete ? "complete" : "review"}`}>
          {revenue.isComplete ? "8개 항목 확인" : "원본 확인 필요"}
        </span>
      </div>
      <div className="main-budget-table-scroll">
        <table aria-label="세입 검증 항목">
          <thead><tr><th scope="col">항목</th><th scope="col">예산액(천원)</th><th scope="col">원 환산</th><th scope="col">출처</th></tr></thead>
          <tbody>
            {revenue.facts.map((fact) => (
              <tr key={fact.label}>
                <th scope="row">{fact.label}</th>
                <td className="main-budget-money">{formatThousandWon(fact.amount)}</td>
                <td className="main-budget-money secondary-value">{formatWon(fact.amount)}</td>
                <td>{fact.inferredAbsent ? "문서에 항목 없음(0원) · " : ""}{fact.row?.sourcePage !== undefined
                  ? `${fact.row.sourcePage}쪽${fact.row.sourceRow === undefined ? "" : ` · ${fact.row.sourceRow}행`}`
                  : fact.row?.sourceSheet !== undefined
                    ? `${fact.row.sourceSheet} 시트${fact.row.sourceRow === undefined ? "" : ` · ${fact.row.sourceRow}행`}`
                    : "확인 필요"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
