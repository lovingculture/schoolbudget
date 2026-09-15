import { Search, Video } from "lucide-react";
import { useMemo, useState } from "react";
import {
  filterVideoGuides,
  VIDEO_GUIDE_CATEGORIES,
  type VideoGuideCategory,
} from "./videoGuide";

export function VideoGuidePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<VideoGuideCategory>("전체");
  const guides = useMemo(() => filterVideoGuides(query, category), [category, query]);
  const hasFilters = Boolean(query.trim()) || category !== "전체";

  return (
    <div className="content video-guide-page portal-workspace">
      <div className="page-title">
        <span>VIDEO GUIDE</span>
        <h1>동영상 안내</h1>
        <p>공개된 학교 예산 업무 안내 영상을 제목과 분류로 찾아보세요.</p>
      </div>

      <section className="video-guide-toolbar" aria-label="동영상 안내 검색">
        <label className="video-guide-search">
          <Search aria-hidden="true" />
          <span className="visually-hidden">영상 제목 검색</span>
          <input type="search" aria-label="영상 제목 검색" placeholder="영상 제목으로 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label className="video-guide-category">
          <span>영상 분류</span>
          <select aria-label="영상 분류" value={category} onChange={(event) => setCategory(event.target.value as VideoGuideCategory)}>
            {VIDEO_GUIDE_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </section>

      {guides.length > 0 ? (
        <section className="video-guide-grid" aria-live="polite">
          {guides.map((guide) => (
            <article
              className={`video-guide-card${guide.featured ? " video-guide-card-featured" : ""}`}
              key={guide.id}
              aria-labelledby={`video-guide-title-${guide.id}`}
            >
              {guide.localVideoUrl ? (
                <video aria-label={`${guide.title} 영상`} controls playsInline poster={guide.posterUrl} preload="metadata">
                  <source src={guide.localVideoUrl} type="video/mp4" />
                  이 브라우저에서는 영상을 재생할 수 없습니다.
                </video>
              ) : guide.thumbnailUrl ? <img src={guide.thumbnailUrl} alt="" /> : <span className="video-guide-placeholder" aria-hidden="true"><Video /></span>}
              <div>
                <span>{guide.category}</span>
                {["k-edufine-budget-management-chapter-1", "k-edufine-budget-management-chapter-2", "k-edufine-budget-management-chapter-3"].includes(guide.id) ? (
                  <h2 id={`video-guide-title-${guide.id}`} aria-label={guide.title}>
                    <span className="video-guide-title-line">[학교회계 - 예산관리]</span>
                    <span className="video-guide-title-line">{guide.title.replace("[학교회계 - 예산관리] ", "")}</span>
                  </h2>
                ) : (
                  <h2 id={`video-guide-title-${guide.id}`}>{guide.title}</h2>
                )}
                <p>{guide.description}</p>
                {guide.videoUrl && <a href={guide.videoUrl} target="_blank" rel="noreferrer" aria-label={`${guide.title} 유튜브에서 보기`}>유튜브에서 보기</a>}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="video-guide-empty" aria-live="polite">
          <span className="video-guide-placeholder" aria-hidden="true"><Video /></span>
          <h2>{hasFilters ? "조건에 맞는 안내 영상이 없습니다. 다른 검색어나 분류를 선택해 보세요." : "안내 동영상을 준비하고 있습니다."}</h2>
          <p>{hasFilters ? "검색 조건을 바꾸어 다시 확인해 주세요." : "공개할 수 있는 안내 영상이 등록되면 이곳에서 제목과 분류로 찾아볼 수 있습니다."}</p>
        </section>
      )}
    </div>
  );
}
