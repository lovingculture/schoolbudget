import { formatRatio, formatWon } from "./format";
import type { ClosingAgendaDraft } from "./types";

export function ClosingAgendaPreview({ draft }: { draft: ClosingAgendaDraft }) {
  return <div className="closing-preview">
    <article className="closing-a4-page" data-testid="closing-a4-page">
      <h1>{draft.title}</h1>
      <div className="agenda-meta">
        <div className="agenda-number"><span>안건<br/>번호</span><b>{draft.agendaNumber}</b></div>
        <dl><div><dt>제안년월일</dt><dd>: {draft.proposalDate}</dd></div><div><dt>제 안 자</dt><dd>: {draft.proposer}</dd></div><div><dt>제안설명자</dt><dd>: {draft.presenter}</dd></div></dl>
      </div>
      <section><h2>1. 제안 근거</h2><p>{draft.basis}</p></section>
      <section><h2>2. 제안 이유</h2><p>{draft.reason}</p></section>
      <section><h2>3. 주요 내용</h2></section>
      <AgendaTableTitle>▣ 세입·세출 결산 총괄표</AgendaTableTitle>
      <table className="closing-summary-table"><thead><tr><th>예산액</th><th>예산현액</th><th>세입결산액(A)</th><th>세출결산액(B)</th><th>세계잉여금(A-B)</th></tr></thead><tbody><tr><td>{formatWon(draft.budget)}</td><td>{formatWon(draft.currentBudget)}</td><td>{formatWon(draft.incomeTotal)}</td><td>{formatWon(draft.expenseTotal)}</td><td>{formatWon(draft.surplus)}</td></tr></tbody></table>
      <AgendaTableTitle>▣ 세계잉여금 처리 현황</AgendaTableTitle>
      <table className="closing-surplus-table"><thead><tr><th>구분</th><th>종류</th><th>금액</th><th>비고</th></tr></thead><tbody>
        <tr><td colSpan={2}>세계잉여금</td><td>{formatWon(draft.surplus)}</td><td></td></tr>
        <tr><td rowSpan={3}>이월금</td><td>사고이월</td><td>{formatWon(draft.carryovers.accident)}</td><td></td></tr>
        <tr><td>명시이월</td><td>{formatWon(draft.carryovers.specified)}</td><td></td></tr>
        <tr><td>계속비이월</td><td>{formatWon(draft.carryovers.continuing)}</td><td></td></tr>
        <tr><td>불용액</td><td>순세계잉여금</td><td>{formatWon(draft.netSurplus)}</td><td></td></tr>
      </tbody></table>
      <AgendaTableTitle>▣ 세입·세출 결산내역</AgendaTableTitle>
    </article>

    <article className="closing-a4-page" data-testid="closing-a4-page">
      <table className="detail-table"><thead><tr><th colSpan={4}>세입</th></tr><tr><th>장</th><th>관</th><th>결산액</th><th>구성비</th></tr></thead><tbody>
        {draft.incomeRows.map(row => <tr key={row.id}><td>{row.chapter}</td><td>{row.section}</td><td>{formatWon(row.amount)}</td><td>{formatRatio(row.ratio)}</td></tr>)}
        <tr className="sum"><td colSpan={2}>합 계</td><td>{formatWon(draft.incomeTotal)}</td><td>100</td></tr>
      </tbody></table>
      <table className="detail-table expense"><thead><tr><th colSpan={3}>세출</th></tr><tr><th>정책사업</th><th>결산액</th><th>구성비</th></tr></thead><tbody>
        {draft.expenseRows.map(row => <tr key={row.id}><td>{row.policy}</td><td>{formatWon(row.amount)}</td><td>{formatRatio(row.ratio)}</td></tr>)}
        <tr className="sum"><td>합 계</td><td>{formatWon(draft.expenseTotal)}</td><td>100</td></tr>
      </tbody></table>
      <p className="attachment">{draft.attachment}</p>
    </article>
  </div>;
}

function AgendaTableTitle({ children }: { children: string }) {
  return <div className="agenda-table-title"><h3>{children}</h3><span>(단위:원)</span></div>;
}
