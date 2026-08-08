import { FUNDING_GUIDE_OPTIONS } from "./searchExamples";
import type { ExampleFundingCategory } from "./types";

export function PrebudgetFundingGuide({ onSelect, onUnsure }: { onSelect(category: ExampleFundingCategory): void; onUnsure(): void }) {
  return <section className="prebudget-guide" aria-labelledby="funding-guide-title">
    <p className="eyebrow">처음부터 차근차근</p><h2 id="funding-guide-title">이 사업비는 어디에서 받았나요?</h2>
    <p>정확한 회계용어를 몰라도 괜찮습니다. 가장 가까운 설명을 선택하세요.</p>
    <div className="prebudget-guide-grid">{FUNDING_GUIDE_OPTIONS.map((option) => <button type="button" key={option.label} className="prebudget-guide-card" onClick={() => option.category ? onSelect(option.category) : onUnsure()} aria-label={option.label}><strong>{option.label}</strong><span>{option.description}</span></button>)}</div>
  </section>;
}
