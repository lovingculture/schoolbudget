import { useMemo, useRef, useState } from "react";
import { Download, ExternalLink, Eye, FileText, Search } from "lucide-react";
import guidelineIndex from "./guidelineIndex.json";
import { GUIDELINE_PDF_URL, GUIDELINE_TITLE } from "./guidelineConstants";
import { searchGuideline, type GuidelinePage } from "./searchGuideline";
import "./guidelines.css";

const pages = guidelineIndex as GuidelinePage[];

export function GuidelineSearchPanel({ searchLabel = "자료 검색" }: { searchLabel?: string }) {
  const [query, setQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    const bodyResults = searchGuideline(pages, normalizedQuery);
    if (!GUIDELINE_TITLE.toLocaleLowerCase("ko-KR").includes(normalizedQuery)) return bodyResults;
    return bodyResults.some(({ page }) => page === 1)
      ? bodyResults
      : [{ page: 1, excerpt: GUIDELINE_TITLE }, ...bodyResults].slice(0, 50);
  }, [normalizedQuery]);

  const openPreview = (page: number) => {
    setSelectedPage(page);
    setPreviewOpen(true);
    setPreviewError(false);
    window.setTimeout(() => previewRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }), 0);
  };

  return (
    <section className="guideline-search-panel" aria-label="예산 지침 검색">
      <div className="guideline-search" role="search">
        <Search aria-hidden="true" />
        <input type="search" aria-label={searchLabel} placeholder="지침 제목 또는 본문 내용을 검색하세요" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <article className="guideline-document-card">
        <span className="guideline-file-icon"><FileText aria-hidden="true" /></span>
        <div className="guideline-document-info"><h2>{GUIDELINE_TITLE}</h2><p>서울특별시교육청 · 2026학년도 · 216쪽</p></div>
        <div className="guideline-document-actions">
          <button type="button" onClick={() => openPreview(1)}><Eye size={18} /> 미리보기</button>
          <a href={GUIDELINE_PDF_URL} target="_blank" rel="noreferrer"><ExternalLink size={18} /> 새 탭에서 열기</a>
          <a href={GUIDELINE_PDF_URL} download="2026학년도_학교회계_예산편성_기본지침.pdf"><Download size={18} /> PDF 내려받기</a>
        </div>
      </article>

      {normalizedQuery && <section className="guideline-results" aria-live="polite">
        <div className="guideline-results-heading"><h2>검색 결과</h2><span>{results.length === 50 ? "최대 50건 표시" : `${results.length}건을 찾았습니다`}</span></div>
        {results.length > 0 ? <div className="guideline-result-list">{results.map((result) => <button type="button" key={result.page} className={selectedPage === result.page && previewOpen ? "selected" : ""} aria-label={`페이지 ${result.page} ${result.excerpt}`} onClick={() => openPreview(result.page)}><strong>{result.page}쪽</strong><span>{result.excerpt}</span></button>)}</div> : <p className="guideline-no-results">검색 결과가 없습니다. 다른 단어로 검색해 보세요.</p>}
      </section>}

      {previewOpen && <section className="guideline-preview" ref={previewRef} tabIndex={-1}>
        <div className="guideline-preview-heading"><div><span>PDF PREVIEW</span><h2>{selectedPage}쪽 미리보기</h2></div><a href={`${GUIDELINE_PDF_URL}#page=${selectedPage}`} target="_blank" rel="noreferrer"><ExternalLink size={17} /> 새 탭에서 열기</a></div>
        {previewError ? <div className="guideline-preview-error" role="alert"><p>PDF 미리보기를 표시하지 못했습니다.</p><a href={`${GUIDELINE_PDF_URL}#page=${selectedPage}`} target="_blank" rel="noreferrer">새 탭에서 해당 페이지 열기</a></div> : <iframe key={selectedPage} title="2026학년도 예산편성지침 미리보기" src={`${GUIDELINE_PDF_URL}#page=${selectedPage}`} onError={() => setPreviewError(true)} />}
      </section>}
    </section>
  );
}
