import type { FoundationBudgetDocument, FoundationValidation } from "./types";

const money = (value: number) => `${value.toLocaleString("ko-KR")}천원`;

export function FoundationSummary({ document, validation }: { document: FoundationBudgetDocument; validation: FoundationValidation }) {
  const matched = validation.balanceDifference === 0;
  return (
    <section className="foundation-summary" aria-labelledby="foundation-summary-title">
      <div className="foundation-section-heading">
        <div>
          <h2 id="foundation-summary-title">변환 결과</h2>
          <p>{document.fileName}</p>
        </div>
        <span className={`foundation-balance ${matched ? "matched" : "mismatch"}`}>{matched ? "세입·세출 일치" : "세입·세출 불일치"}</span>
      </div>
      <div className="foundation-summary-grid">
        <article><span>회계연도</span><b>{document.fiscalYear}학년도</b><small>{document.budgetType}</small></article>
        <article><span>세입합계</span><b>{money(document.sourceRevenueTotal)}</b><small>{document.revenueRows.length.toLocaleString("ko-KR")}개 항목</small></article>
        <article><span>세출합계</span><b>{money(document.sourceExpenseTotal)}</b><small>{document.expenseRows.length.toLocaleString("ko-KR")}개 항목</small></article>
      </div>
    </section>
  );
}
