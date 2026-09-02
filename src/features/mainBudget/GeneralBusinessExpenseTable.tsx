import type { GeneralBusinessExpense } from "./analysisTypes";
import { formatThousandWon, formatWon } from "./MainBudgetSummary";

function provenance(expense: GeneralBusinessExpense): string {
  const row = expense.row;
  if (!row) return "위치 확인 필요";
  if (row.sourceSheet !== undefined) return `${row.sourceSheet} 시트${row.sourceRow === undefined ? "" : ` · ${row.sourceRow}행`}`;
  if (row.sourcePage !== undefined) return `${row.sourcePage}쪽${row.sourceRow === undefined ? "" : ` · ${row.sourceRow}행`}`;
  return "위치 확인 필요";
}

export function GeneralBusinessExpenseTable({ expenses }: { expenses: GeneralBusinessExpense[] }) {
  return (
    <section className="main-budget-detail-card" aria-labelledby="general-expense-title">
      <div className="main-budget-section-heading">
        <div>
          <h2 id="general-expense-title">일반업무추진비 세부 내역</h2>
          <p>원가통계비목이 정확히 일반업무추진비인 항목만 표시합니다.</p>
        </div>
        <span className="main-budget-row-count">{expenses.length.toLocaleString()}건</span>
      </div>
      <div className="main-budget-table-scroll expense-table-scroll">
        <table aria-label="일반업무추진비 세부 내역">
          <thead><tr><th scope="col">정책사업</th><th scope="col">단위사업</th><th scope="col">세부사업</th><th scope="col">세부항목</th><th scope="col">예산액</th><th scope="col">출처</th><th scope="col">신뢰도</th></tr></thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan={7} className="main-budget-empty-row">확인 가능한 내역이 없습니다.</td></tr>
            ) : expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.policy || "-"}</td><td>{expense.unit || "-"}</td><td>{expense.business || "-"}</td><td>{expense.detail || "-"}</td>
                <td className="main-budget-money">{expense.amount === null ? "확인 필요" : `${formatThousandWon(expense.amount)} / ${formatWon(expense.amount)}`}</td>
                <td>{provenance(expense)}</td>
                <td>{expense.row?.confidence === undefined ? "확인 필요" : `${Math.round(expense.row.confidence * 100)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
