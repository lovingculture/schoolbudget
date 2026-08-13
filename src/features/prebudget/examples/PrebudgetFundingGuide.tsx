import { FUNDING_GUIDE_OPTIONS } from "./searchExamples";
import type { ExampleFundingCategory } from "./types";

export function PrebudgetFundingGuide({ onSelect, onUnsure }: { onSelect(category: ExampleFundingCategory): void; onUnsure(): void }) {
  return <section className="prebudget-page prebudget-guide" aria-labelledby="funding-guide-title">
    <p className="eyebrow">처음부터 차근차근</p>
    <h2 id="funding-guide-title">이 사업비는 어디에서 받았나요?</h2>
    <p>정확한 회계용어를 몰라도 괜찮습니다. 가장 가까운 설명을 선택하세요.</p>
    <div className="prebudget-guide-grid" role="list">
      {FUNDING_GUIDE_OPTIONS.map((option) => <div role="listitem" key={option.label}>
        <button type="button" className="prebudget-guide-card" onClick={() => option.category ? onSelect(option.category) : onUnsure()} aria-label={option.label}>
          <span className="prebudget-guide-card-title">{option.title}</span>
          {option.category && <span className="prebudget-guide-card-kicker">재원 안내</span>}
          <strong>{option.label}</strong>
          {option.description && <span className={option.category ? "prebudget-guide-card-description" : "prebudget-guide-card-examples"}>{option.description}</span>}
          {option.examples && <span className="prebudget-guide-card-examples">{option.examples}</span>}
        </button>
      </div>)}
    </div>
  </section>;
}
