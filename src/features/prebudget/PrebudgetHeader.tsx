import { Lightbulb } from "lucide-react";
import { PREBUDGET_COPY } from "./prebudgetCopy";

export function PrebudgetHeader({ documentReady, onOpenExamples }: { documentReady: boolean; onOpenExamples(): void }) {
  return <>
    <section className="prebudget-hero" aria-label="성립전예산 작성 안내">
      <div className="prebudget-hero-copy"><span>{PREBUDGET_COPY.eyebrow}</span><h1>{PREBUDGET_COPY.title}</h1><p>{PREBUDGET_COPY.description}</p></div>
      <img src="/characters/cards/prebudget-writing.png" alt="문서를 작성하는 서울시교육청 캐릭터 자라나" />
    </section>
    <ol className="prebudget-steps" aria-label="성립전예산 작성 단계">
      {PREBUDGET_COPY.steps.map((step, index) => <li key={step} data-status={index < 2 || documentReady ? "complete" : "pending"}><b>{index + 1}</b><span>{step}</span></li>)}
    </ol>
    <section className="prebudget-example-start prebudget-example-start-highlighted" aria-label="예시 작성 안내">
      <span className="prebudget-example-start-icon" aria-hidden="true"><Lightbulb /></span>
      <div><strong>{PREBUDGET_COPY.exampleTitle}</strong><p>{PREBUDGET_COPY.exampleDescription}</p></div>
      <button type="button" className="prebudget-example-start-button" onClick={onOpenExamples}>예시에서 시작하기</button>
    </section>
  </>;
}
