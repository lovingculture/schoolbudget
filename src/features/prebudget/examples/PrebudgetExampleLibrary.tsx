import { useMemo, useState } from "react";
import { calculateRequestedAmount } from "../../../domain/prebudget";
import { searchPrebudgetExamples, type ExampleSearchScope } from "./searchExamples";
import type { PrebudgetExample } from "./types";

const won = new Intl.NumberFormat("ko-KR");
export function PrebudgetExampleLibrary({ examples, initialScope, onUseExample, onBack }: { examples: readonly PrebudgetExample[]; initialScope: ExampleSearchScope; onUseExample(example: PrebudgetExample): void; onBack(): void }) {
  const [scope, setScope] = useState<ExampleSearchScope>(initialScope); const [query, setQuery] = useState(""); const [selected, setSelected] = useState<PrebudgetExample>();
  const filtered = useMemo(() => searchPrebudgetExamples(examples, query, scope), [examples, query, scope]);
  if (selected) return <section className="prebudget-example-detail"><button type="button" onClick={() => setSelected(undefined)}>← 예시 목록</button><h2>{selected.title}</h2><p>{selected.summary}</p>
    <h3>이런 경우에 사용해요</h3><ul>{selected.useWhen.map((v) => <li key={v}>{v}</li>)}</ul><h3>작성 전에 준비하세요</h3><ul>{selected.prepareBeforeWriting.map((v) => <li key={v}>{v}</li>)}</ul>
    <h3>대표 편성항목</h3><div className="table-wrap"><table><thead><tr><th>세부사업</th><th>원가통계비목</th><th>산출내역</th><th>금액</th></tr></thead><tbody>{selected.items.map((item, i) => <tr key={`${selected.id}-${i}`}><td>{item.business}</td><td>{item.category}</td><td>{item.description}</td><td>{won.format(calculateRequestedAmount(item))}원</td></tr>)}</tbody></table></div>
    <h3>기안문 미리보기</h3><p>{selected.draftPreview}</p><h3>복사한 뒤 꼭 확인하세요</h3><ul>{selected.autoCheckNotes.map((v) => <li key={v}>{v}</li>)}</ul><button type="button" className="primary" onClick={() => onUseExample(selected)}>이 예시로 작성하기</button></section>;
  return <section className="prebudget-example-library"><button type="button" onClick={onBack}>← 재원 다시 선택</button><h2>성립전예산 예시 찾기</h2><p className="notice">이 자료는 참고 예시입니다. 실제 교부공문, 산출내역과 금액을 확인해 수정해 주세요.</p>
    <div className="prebudget-example-filters"><label>재원구분<select value={scope} onChange={(e) => setScope(e.target.value as ExampleSearchScope)}><option>목적사업비</option><option>구청보조금</option><option>수익자부담금</option><option>전체</option></select></label><label>예시 검색<input type="search" aria-label="예시 검색" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="돌봄, 책, 학부모 부담" /></label><button type="button" onClick={() => { setQuery(""); setScope(initialScope); }}>초기화</button></div>
    <p><strong>{filtered.length}건</strong></p><div className="prebudget-example-grid">{filtered.map((example) => <article key={example.id} className="prebudget-example-card"><span>{example.fundingCategory}</span><h3>{example.title}</h3><p>{example.summary}</p><button type="button" onClick={() => setSelected(example)}>자세히 보기</button></article>)}</div>{!filtered.length && <p>조건에 맞는 예시가 없습니다. 검색어를 바꾸거나 초기화해 주세요.</p>}</section>;
}
