import type { BudgetAgendaDraft, BudgetExpenseRow, BudgetIncomeRow } from "./types";
import { formatEditableMoney, parseEditableMoney } from "./moneyInput";

type Props = {
  original: BudgetAgendaDraft;
  draft: BudgetAgendaDraft;
  onChange: (draft: BudgetAgendaDraft) => void;
};

type TextKey = "title" | "agendaNumber" | "proposalDate" | "proposer" | "presenter" | "revisedBudgetLabel" | "previousBudgetLabel" | "reason" | "basis";
type NumberKey = "revisedBudget" | "previousBudget" | "changeAmount" | "changeRate";

function MoneyField({ label, value, original, onChange }: { label: string; value: number; original: number; onChange: (value: number) => void }) {
  const changed = value !== original;
  return <label className="budget-agenda-field">{label}<div className="budget-agenda-input-row">
    <input aria-label={label} inputMode="numeric" value={formatEditableMoney(value)} onChange={event => onChange(parseEditableMoney(event.target.value))}/>
    {changed && <span>수정됨</span>}
    <button type="button" disabled={!changed} onClick={() => onChange(original)}>원본값</button>
  </div></label>;
}

export function BudgetAgendaEditor({ original, draft, onChange }: Props) {
  const setText = (key: TextKey, value: string) => onChange({ ...draft, [key]: value });
  const setNumber = (key: NumberKey, value: number) => onChange({ ...draft, [key]: value });
  const setIncome = (index: number, key: keyof BudgetIncomeRow, value: string | number) =>
    onChange({ ...draft, incomeRows: draft.incomeRows.map((row, i) => i === index ? { ...row, [key]: value } : row) });
  const setExpense = (index: number, key: keyof BudgetExpenseRow, value: string | number) =>
    onChange({ ...draft, expenseRows: draft.expenseRows.map((row, i) => i === index ? { ...row, [key]: value } : row) });
  const setMajor = (index: number, value: string) =>
    onChange({ ...draft, majorContents: draft.majorContents.map((row, i) => i === index ? value : row) });

  return <div className="budget-agenda-editor">
    <section className="budget-agenda-edit-section"><h2>제안정보</h2><div className="budget-agenda-edit-grid">
      <label className="wide">문서 제목<input aria-label="문서 제목" value={draft.title} onChange={event => setText("title", event.target.value)}/></label>
      <label>안건번호<input aria-label="안건번호" value={draft.agendaNumber} onChange={event => setText("agendaNumber", event.target.value)}/></label>
      <label>제안연월일<input aria-label="제안연월일" placeholder="예: 2026. 7. 30." value={draft.proposalDate} onChange={event => setText("proposalDate", event.target.value)}/></label>
      <label>제안자<input aria-label="제안자" value={draft.proposer} onChange={event => setText("proposer", event.target.value)}/></label>
      <label>제안설명자<input aria-label="제안설명자" value={draft.presenter} onChange={event => setText("presenter", event.target.value)}/></label>
      <label className="wide">제안이유<textarea aria-label="제안이유" value={draft.reason} onChange={event => setText("reason", event.target.value)}/></label>
      <label className="wide">근거<textarea aria-label="근거" value={draft.basis} onChange={event => setText("basis", event.target.value)}/></label>
    </div></section>

    <section className="budget-agenda-edit-section"><h2>총 규모</h2><div className="budget-agenda-number-grid">
      <label className="budget-agenda-field">경정예산 제목<input aria-label="경정예산 제목" value={draft.revisedBudgetLabel} onChange={event => setText("revisedBudgetLabel", event.target.value)}/></label>
      <label className="budget-agenda-field">기정예산 제목<input aria-label="기정예산 제목" value={draft.previousBudgetLabel} onChange={event => setText("previousBudgetLabel", event.target.value)}/></label>
      <MoneyField label="경정예산액" value={draft.revisedBudget} original={original.revisedBudget} onChange={value => setNumber("revisedBudget", value)}/>
      <MoneyField label="기정예산액" value={draft.previousBudget} original={original.previousBudget} onChange={value => setNumber("previousBudget", value)}/>
      <MoneyField label="비교증감액" value={draft.changeAmount} original={original.changeAmount} onChange={value => setNumber("changeAmount", value)}/>
      <label className="budget-agenda-field">증감률(%)<input aria-label="증감률" type="number" step="0.1" value={draft.changeRate} onChange={event => setNumber("changeRate", Number(event.target.value))}/></label>
    </div></section>

    <EditableRows title="세입예산" className="income" headers={["장", "관", "금회", "누계", "구성비", "비고"]}>
      {draft.incomeRows.map((row, index) => <div className="budget-agenda-row" key={row.id}>
        <input aria-label={`세입 ${index + 1} 장`} value={row.chapter} onChange={event => setIncome(index, "chapter", event.target.value)}/>
        <input aria-label={`세입 ${index + 1} 관`} value={row.section} onChange={event => setIncome(index, "section", event.target.value)}/>
        <input aria-label={`세입 ${index + 1} 금회`} inputMode="numeric" value={formatEditableMoney(row.current)} onChange={event => setIncome(index, "current", parseEditableMoney(event.target.value))}/>
        <input aria-label={`세입 ${index + 1} 누계`} inputMode="numeric" value={formatEditableMoney(row.cumulative)} onChange={event => setIncome(index, "cumulative", parseEditableMoney(event.target.value))}/>
        <input aria-label={`세입 ${index + 1} 구성비`} type="number" step="0.1" value={row.ratio} onChange={event => setIncome(index, "ratio", Number(event.target.value))}/>
        <input aria-label={`세입 ${index + 1} 비고`} value={row.note} onChange={event => setIncome(index, "note", event.target.value)}/>
      </div>)}
    </EditableRows>

    <EditableRows title="세출예산" className="expense" headers={["정책사업", "금회", "누계", "구성비", "비고"]}>
      {draft.expenseRows.map((row, index) => <div className="budget-agenda-row" key={row.id}>
        <input aria-label={`세출 ${index + 1} 정책사업`} value={row.policy} onChange={event => setExpense(index, "policy", event.target.value)}/>
        <input aria-label={`세출 ${index + 1} 금회`} inputMode="numeric" value={formatEditableMoney(row.current)} onChange={event => setExpense(index, "current", parseEditableMoney(event.target.value))}/>
        <input aria-label={`세출 ${index + 1} 누계`} inputMode="numeric" value={formatEditableMoney(row.cumulative)} onChange={event => setExpense(index, "cumulative", parseEditableMoney(event.target.value))}/>
        <input aria-label={`세출 ${index + 1} 구성비`} type="number" step="0.1" value={row.ratio} onChange={event => setExpense(index, "ratio", Number(event.target.value))}/>
        <input aria-label={`세출 ${index + 1} 비고`} value={row.note} onChange={event => setExpense(index, "note", event.target.value)}/>
      </div>)}
    </EditableRows>

    <section className="budget-agenda-edit-section"><h2>{draft.contentTitle}</h2>
      {draft.majorContents.map((content, index) => <label className="budget-agenda-field" key={index}>{index + 1}) 주요내용
        <textarea aria-label={`주요내용 ${index + 1}`} value={content} placeholder="예산 편성 주요내용을 입력하세요." onChange={event => setMajor(index, event.target.value)}/>
      </label>)}
    </section>
  </div>;
}

function EditableRows({ title, className, headers, children }: { title: string; className: string; headers: string[]; children: React.ReactNode }) {
  return <section className="budget-agenda-edit-section"><h2>{title}</h2><div className={`budget-agenda-edit-table ${className}`}>
    <div className="budget-agenda-row head">{headers.map(header => <span key={header}>{header}</span>)}</div>
    {children}
  </div></section>;
}
