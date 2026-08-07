import type { BudgetAgendaDraft, BudgetExpenseRow } from "./types";

const money = (value: number) => value.toLocaleString("ko-KR");
const ratio = (value: number) => value.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const chunks = <T,>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
};

export function BudgetAgendaPreview({ draft }: { draft: BudgetAgendaDraft }) {
  const firstExpenses = draft.expenseRows.slice(0, 4);
  const remainingPages = chunks(draft.expenseRows.slice(4), 11);
  if (!remainingPages.length) remainingPages.push([]);
  return <div className="budget-agenda-preview">
    <article className="budget-agenda-a4-page" data-testid="budget-agenda-a4-page">
      <h1>{draft.title}</h1>
      <div className="budget-agenda-meta">
        <div className="budget-agenda-number"><span>안건<br/>번호</span><b>{draft.agendaNumber}</b></div>
        <dl><div><dt>제안년월일</dt><dd>: {draft.proposalDate}</dd></div><div><dt>제 안 자</dt><dd>: {draft.proposer}</dd></div><div><dt>제안설명자</dt><dd>: {draft.presenter}</dd></div></dl>
      </div>
      <TextSection title="1. 제안이유" text={draft.reason}/>
      <TextSection title="2. 근거" text={draft.basis}/>
      <section><h2>3. 주요내용</h2></section>
      <BudgetTableTitle label="가. 총 규모"/>
      <table className="budget-agenda-total"><thead><tr><th rowSpan={2}>구분</th><th rowSpan={2}>{draft.revisedBudgetLabel}</th><th rowSpan={2}>{draft.previousBudgetLabel}</th><th colSpan={2}>증감(B-A)</th></tr><tr><th>금액</th><th>증감률(%)</th></tr></thead>
        <tbody><tr><td>예산액</td><td>{money(draft.revisedBudget)}</td><td>{money(draft.previousBudget)}</td><td>{money(draft.changeAmount)}</td><td>{ratio(draft.changeRate)}</td></tr></tbody></table>
      <BudgetTableTitle label="나. 세입예산"/>
      <table><thead><tr><th>구분</th><th>금회</th><th>누계(B)</th><th>구성비(%)</th><th>비고</th></tr></thead><tbody>
        {draft.incomeRows.map(row => <tr key={row.id}><td className={row.section === "지방교육행정기관이전수입" ? "budget-agenda-long-income-label" : undefined}>{row.section}</td><td>{money(row.current)}</td><td>{money(row.cumulative)}</td><td>{ratio(row.ratio)}</td><td>{row.note}</td></tr>)}
        <tr className="sum"><td>계</td><td>{money(draft.changeAmount)}</td><td>{money(draft.revisedBudget)}</td><td>100.0</td><td></td></tr>
      </tbody></table>
      <BudgetTableTitle label="다. 세출예산"/>
      <ExpenseTable rows={firstExpenses} showHeader/>
    </article>
    {remainingPages.map((rows, pageIndex) => <article className="budget-agenda-a4-page budget-agenda-continuation" data-testid="budget-agenda-a4-page" key={pageIndex}>
      <ExpenseTable rows={rows} showHeader={pageIndex > 0}/>
      {pageIndex === remainingPages.length - 1 && <>
        <table className="budget-agenda-expense-total"><tbody><tr className="sum"><td>계</td><td>{money(draft.changeAmount)}</td><td>{money(draft.revisedBudget)}</td><td>100.0</td><td></td></tr></tbody></table>
        <BudgetTableTitle label={`라. ${draft.contentTitle}`} unit={false}/>
        <ol className="budget-agenda-major" style={{ fontSize: "12pt" }}>{draft.majorContents.map((content, index) => <li key={index}>{content}</li>)}</ol>
      </>}
    </article>)}
  </div>;
}

function ExpenseTable({ rows, showHeader }: { rows: BudgetExpenseRow[]; showHeader: boolean }) {
  return <table className="budget-agenda-expense"><thead className={showHeader ? "" : "continuation-head"}><tr><th>정책사업</th><th>금회</th><th>누계</th><th>구성비(%)</th><th>비고</th></tr></thead><tbody>
    {rows.map(row => <tr key={row.id}><td>{row.policy}</td><td>{money(row.current)}</td><td>{money(row.cumulative)}</td><td>{ratio(row.ratio)}</td><td>{row.note}</td></tr>)}
  </tbody></table>;
}

function TextSection({ title, text }: { title: string; text: string }) {
  return <section><h2>{title}</h2><p className="budget-agenda-text budget-agenda-body-text" style={{ fontSize: "12pt" }}>{text}</p></section>;
}

function BudgetTableTitle({ label, unit = true }: { label: string; unit?: boolean }) {
  return <div className="budget-agenda-table-title"><h3 style={unit ? undefined : { fontSize: "12pt" }}>{label}</h3>{unit && <span>(단위 : 천원)</span>}</div>;
}
