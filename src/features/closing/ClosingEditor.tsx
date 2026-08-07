import type { ClosingAgendaDraft, ExpenseRow, IncomeRow } from "./types";
import { formatEditableMoney, parseEditableMoney } from "./moneyInput";

type Props = {
  original: ClosingAgendaDraft;
  draft: ClosingAgendaDraft;
  onChange: (draft: ClosingAgendaDraft) => void;
};

type TextKey = "title" | "agendaNumber" | "proposalDate" | "proposer" | "presenter" | "basis" | "reason" | "attachment";
type NumberKey = "fiscalYear" | "budget" | "currentBudget" | "incomeTotal" | "expenseTotal" | "surplus" | "subsidyReturn" | "priorTransfer" | "afterTransfer" | "netSurplus";

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <input
    aria-label={label}
    type="text"
    inputMode="numeric"
    value={formatEditableMoney(value)}
    onChange={event => onChange(parseEditableMoney(event.target.value))}
  />;
}

function NumberField({ label, value, original, onChange }: { label: string; value: number; original: number; onChange: (value: number) => void }) {
  const changed = value !== original;
  return <label className="closing-field">{label}<div className="closing-input-row"><MoneyInput label={label} value={value} onChange={onChange}/>{changed && <span>수정됨</span>}<button type="button" aria-label={`${label} 원본값으로 되돌리기`} disabled={!changed} onClick={() => onChange(original)}>원본값</button></div></label>;
}

export function ClosingEditor({ original, draft, onChange }: Props) {
  const text = (key: TextKey, value: string) => onChange({ ...draft, [key]: value });
  const number = (key: NumberKey, value: number) => onChange({ ...draft, [key]: value });
  const carryover = (key: keyof ClosingAgendaDraft["carryovers"], value: number) =>
    onChange({ ...draft, carryovers: { ...draft.carryovers, [key]: value } });
  const income = (index: number, key: keyof IncomeRow, value: string | number) =>
    onChange({ ...draft, incomeRows: draft.incomeRows.map((row, i) => i === index ? { ...row, [key]: value } : row) });
  const expense = (index: number, key: keyof ExpenseRow, value: string | number) =>
    onChange({ ...draft, expenseRows: draft.expenseRows.map((row, i) => i === index ? { ...row, [key]: value } : row) });

  return <div className="closing-editor">
    <section className="closing-edit-section"><h2>제안정보</h2><div className="closing-edit-grid">
      <label className="wide">문서 제목<input aria-label="문서 제목" value={draft.title} onChange={event => text("title", event.target.value)}/></label>
      <label>제안연월일<input aria-label="제안연월일" value={draft.proposalDate} placeholder="예: 2026. 05. 20." onChange={event => text("proposalDate", event.target.value)}/></label>
      <label>안건번호<input aria-label="안건번호" value={draft.agendaNumber} onChange={event => text("agendaNumber", event.target.value)}/></label>
      <label>제안자<input aria-label="제안자" value={draft.proposer} onChange={event => text("proposer", event.target.value)}/></label>
      <label>제안설명자<input aria-label="제안설명자" value={draft.presenter} onChange={event => text("presenter", event.target.value)}/></label>
      <label className="wide">제안 근거<textarea aria-label="제안 근거" value={draft.basis} onChange={event => text("basis", event.target.value)}/></label>
      <label className="wide">제안 이유<textarea aria-label="제안 이유" value={draft.reason} onChange={event => text("reason", event.target.value)}/></label>
    </div></section>

    <section className="closing-edit-section"><h2>세입·세출 결산 총괄표</h2><div className="closing-number-grid">
      <NumberField label="예산액" value={draft.budget} original={original.budget} onChange={value => number("budget", value)}/>
      <NumberField label="예산현액" value={draft.currentBudget} original={original.currentBudget} onChange={value => number("currentBudget", value)}/>
      <NumberField label="세입결산액" value={draft.incomeTotal} original={original.incomeTotal} onChange={value => number("incomeTotal", value)}/>
      <NumberField label="세출결산액" value={draft.expenseTotal} original={original.expenseTotal} onChange={value => number("expenseTotal", value)}/>
      <NumberField label="세계잉여금" value={draft.surplus} original={original.surplus} onChange={value => number("surplus", value)}/>
    </div></section>

    <section className="closing-edit-section"><h2>세계잉여금 처리 현황</h2><div className="closing-number-grid">
      <NumberField label="사고이월" value={draft.carryovers.accident} original={original.carryovers.accident} onChange={value => carryover("accident", value)}/>
      <NumberField label="명시이월" value={draft.carryovers.specified} original={original.carryovers.specified} onChange={value => carryover("specified", value)}/>
      <NumberField label="계속비이월" value={draft.carryovers.continuing} original={original.carryovers.continuing} onChange={value => carryover("continuing", value)}/>
      <NumberField label="보조금반환 확정액" value={draft.subsidyReturn} original={original.subsidyReturn} onChange={value => number("subsidyReturn", value)}/>
      <NumberField label="순세계잉여금" value={draft.netSurplus} original={original.netSurplus} onChange={value => number("netSurplus", value)}/>
    </div></section>

    <section className="closing-edit-section"><h2>세입 결산내역</h2><div className="closing-row-table closing-income-editor">
      <div className="closing-row-head"><span>장</span><span>관</span><span>결산액</span><span>구성비</span></div>
      {draft.incomeRows.map((row, index) => <div className="closing-row" key={row.id}>
        <input aria-label={`세입 ${index + 1} 장`} value={row.chapter} onChange={event => income(index, "chapter", event.target.value)}/>
        <input aria-label={`세입 ${index + 1} 관`} value={row.section} onChange={event => income(index, "section", event.target.value)}/>
        <MoneyInput label={`세입 ${index + 1} 결산액`} value={row.amount} onChange={value => income(index, "amount", value)}/>
        <input aria-label={`세입 ${index + 1} 구성비`} type="number" step="0.1" value={row.ratio} onChange={event => income(index, "ratio", Number(event.target.value))}/>
      </div>)}
    </div></section>

    <section className="closing-edit-section"><h2>세출 결산내역</h2><div className="closing-row-table closing-expense-editor">
      <div className="closing-row-head"><span>정책사업</span><span>결산액</span><span>구성비</span></div>
      {draft.expenseRows.map((row, index) => <div className="closing-row" key={row.id}>
        <input aria-label={`세출 ${index + 1} 정책사업`} value={row.policy} onChange={event => expense(index, "policy", event.target.value)}/>
        <MoneyInput label={`세출 ${index + 1} 결산액`} value={row.amount} onChange={value => expense(index, "amount", value)}/>
        <input aria-label={`세출 ${index + 1} 구성비`} type="number" step="0.1" value={row.ratio} onChange={event => expense(index, "ratio", Number(event.target.value))}/>
      </div>)}
    </div></section>

    <section className="closing-edit-section"><h2>별첨</h2><label className="closing-field">별첨 문구<textarea aria-label="별첨 문구" value={draft.attachment} onChange={event => text("attachment", event.target.value)}/></label></section>
  </div>;
}
