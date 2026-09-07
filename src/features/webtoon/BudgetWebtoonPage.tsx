import { ArrowLeft, ArrowRight, BookOpen, List } from "lucide-react";
import { useState } from "react";
import { budgetWebtoons } from "./budgetWebtoons";
import "./budgetWebtoon.css";

export function BudgetWebtoonPage() {
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const selectedIndex = budgetWebtoons.findIndex(({ episode }) => episode === selectedEpisode);
  const selected = selectedIndex >= 0 ? budgetWebtoons[selectedIndex] : null;

  if (!selected) {
    return (
      <div className="content budget-webtoon-page portal-workspace">
        <div className="page-title">
          <span>BUDGET WEBTOON</span>
          <h1>예산 웹툰</h1>
          <p>자라나와 열리미가 알려주는 학교예산 이야기를 회차별로 만나보세요.</p>
        </div>
        <section className="budget-webtoon-grid" aria-label="예산 웹툰 회차 목록">
          {budgetWebtoons.map((webtoon) => (
            <article className="budget-webtoon-card" key={webtoon.episode}>
              <button
                type="button"
                aria-label={`${webtoon.episode}화 ${webtoon.title} 읽어보기`}
                onClick={() => setSelectedEpisode(webtoon.episode)}
              >
                <span className="budget-webtoon-thumbnail">
                  <img src={webtoon.imageSrc} alt="" loading="lazy" />
                </span>
                <span className="budget-webtoon-card-copy">
                  <small>{webtoon.episode}화</small>
                  <strong>{webtoon.title}</strong>
                  <span>읽어보기 <ArrowRight aria-hidden="true" /></span>
                </span>
              </button>
            </article>
          ))}
        </section>
      </div>
    );
  }

  const previous = budgetWebtoons[selectedIndex - 1];
  const next = budgetWebtoons[selectedIndex + 1];

  return (
    <div className="content budget-webtoon-page budget-webtoon-reader portal-workspace">
      <div className="budget-webtoon-reader-heading">
        <button type="button" aria-label="상단 웹툰 목록으로" onClick={() => setSelectedEpisode(null)}>
          <ArrowLeft aria-hidden="true" /> 목록으로
        </button>
        <div>
          <span>{selected.episode}화</span>
          <h1>{selected.title}</h1>
        </div>
      </div>

      <figure className="budget-webtoon-image">
        <img src={selected.imageSrc} alt={`${selected.episode}화 ${selected.title}`} />
      </figure>

      <nav className="budget-webtoon-episode-nav" aria-label="웹툰 회차 이동">
        {previous ? (
          <button type="button" aria-label={`이전 화 ${previous.episode}화`} onClick={() => setSelectedEpisode(previous.episode)}>
            <ArrowLeft aria-hidden="true" /> 이전 화
          </button>
        ) : <span />}
        <button type="button" aria-label="웹툰 목록으로" onClick={() => setSelectedEpisode(null)}>
          <List aria-hidden="true" /> 목록
        </button>
        {next ? (
          <button type="button" aria-label={`다음 화 ${next.episode}화`} onClick={() => setSelectedEpisode(next.episode)}>
            다음 화 <ArrowRight aria-hidden="true" />
          </button>
        ) : <span />}
      </nav>
      <p className="budget-webtoon-reader-note"><BookOpen aria-hidden="true" /> 이미지는 원본 비율로 표시됩니다.</p>
    </div>
  );
}
