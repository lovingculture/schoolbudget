import { useMemo, useState } from "react";
import { ExternalLink, Link2, Search } from "lucide-react";
import "./referenceSites.css";

export type ReferenceSiteCategory = "교육청" | "학교회계" | "업무지원" | "기타";

export type ReferenceSite = {
  id: string;
  title: string;
  category: ReferenceSiteCategory;
  description: string;
  url: string;
};

export const REFERENCE_SITES: ReferenceSite[] = [
  {
    id: "k-edufine-main-budget-training-2025-11-20",
    title: "(25.11.20.) K-에듀파인 학교회계 예산관리(본예산편성) 대표강사 교육영상",
    category: "학교회계",
    description: "K-에듀파인 학교회계 본예산 편성 절차를 안내하는 대표강사 교육영상입니다.",
    url: "https://www.youtube.com/watch?v=4eQjyipBuEM&t=1s",
  },
  {
    id: "k-edufine-budget-closing-training-2026-02-12",
    title: "(26.02.12) K-에듀파인 학교회계 예산결산 사용자 교육",
    category: "학교회계",
    description: "K-에듀파인 학교회계 예산·결산 업무를 안내하는 사용자 교육영상입니다.",
    url: "https://www.youtube.com/watch?v=J9wdZZCYYVk",
  },
  {
    id: "k-edufine-supplementary-budget-training-2025-03-20",
    title: "('25.03.20.) K-에듀파인 학교회계 예산관리(성립전예산 및 추가경정예산) 대표강사 교육",
    category: "학교회계",
    description: "성립전예산과 추가경정예산의 편성·관리 절차를 안내하는 대표강사 교육영상입니다.",
    url: "https://www.youtube.com/watch?v=q73d3QkwmP4",
  },
  {
    id: "k-edufine-budget-management-chapter-1",
    title: "[학교회계 - 예산관리] 1장 예산관리개요",
    category: "학교회계",
    description: "K-에듀파인 학교회계 예산관리의 기본 개념과 업무 흐름을 안내하는 교육영상입니다.",
    url: "https://www.youtube.com/watch?v=dr-dxp9UCLE&list=PLnNTGUWLwu1sBH5y4_WZV05q5U_UD7wB1",
  },
  {
    id: "k-edufine-budget-management-chapter-2",
    title: "[학교회계 - 예산관리] 2장 예산편성 사전작업",
    category: "학교회계",
    description: "K-에듀파인에서 예산을 편성하기 전에 필요한 사전작업을 안내하는 교육영상입니다.",
    url: "https://www.youtube.com/watch?v=a5VfrWqDcNo&t=20s",
  },
  {
    id: "k-edufine-budget-management-chapter-3",
    title: "[학교회계 - 예산관리] 3장 본예산관리",
    category: "학교회계",
    description: "K-에듀파인 학교회계 본예산 편성과 관리 방법을 안내하는 교육영상입니다.",
    url: "https://www.youtube.com/watch?v=zaMVS8WLWTo&t=16s",
  },
];

const CATEGORIES = ["전체", "교육청", "학교회계", "업무지원", "기타"] as const;

export function ReferenceSitesPage({ sites = REFERENCE_SITES }: { sites?: ReferenceSite[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("전체");
  const filtered = useMemo(() => {
    const token = query.trim().toLocaleLowerCase("ko-KR");
    return sites.filter((site) => {
      const categoryMatches = category === "전체" || site.category === category;
      const textMatches = !token || [site.title, site.description, site.category]
        .some((value) => value.toLocaleLowerCase("ko-KR").includes(token));
      return categoryMatches && textMatches;
    });
  }, [category, query, sites]);

  return <div className="content reference-sites-page">
    <section className="reference-sites-hero" aria-labelledby="reference-sites-title">
      <div>
        <span>USEFUL LINKS</span>
        <h1 id="reference-sites-title">참고사이트</h1>
        <p>학교예산 업무에 도움이 되는 교육청·학교회계·업무지원 사이트를 한곳에서 확인하세요.</p>
      </div>
      <span className="reference-sites-hero-icon" aria-hidden="true"><Link2 /></span>
    </section>

    <section className="reference-sites-tools" aria-label="참고사이트 검색 및 분류">
      <label><Search aria-hidden="true"/><input type="search" aria-label="참고사이트 검색" placeholder="사이트명이나 설명을 검색하세요" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <div role="group" aria-label="참고사이트 분야">{CATEGORIES.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </section>

    {filtered.length ? <section className="reference-sites-grid" aria-label="참고사이트 목록">
      {filtered.map((site) => <article key={site.id}>
        <small>{site.category}</small>
        <h2>{site.title}</h2>
        <p>{site.description}</p>
        <a href={site.url} target="_blank" rel="noreferrer" aria-label={`${site.title} 바로가기`}>바로가기 <ExternalLink aria-hidden="true"/></a>
      </article>)}
    </section> : <section className="reference-sites-empty" aria-live="polite">
      <span aria-hidden="true"><Link2 /></span>
      <h2>등록된 참고사이트가 없습니다.</h2>
      <p>링크를 알려주시면 확인 후 게시판에 반영합니다.</p>
    </section>}
  </div>;
}
