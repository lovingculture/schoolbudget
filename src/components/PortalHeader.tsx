import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  CircleUserRound,
  FolderOpen,
  Home,
  Link2,
  LogOut,
  Menu,
  Search,
  Video,
  X,
} from "lucide-react";

export type PortalHeaderView =
  | "home"
  | "guidelines"
  | "prebudget"
  | "budget"
  | "main-budget-foundation"
  | "agenda"
  | "closing"
  | "supplementary"
  | "guide"
  | "resources"
  | "reference-sites"
  | "videos"
  | "webtoon";

type PortalHeaderProps = {
  activeView: PortalHeaderView;
  onNavigate: (view: PortalHeaderView) => void;
  schoolName: string;
  displayName: string;
  onLogout?: () => void;
};

const workItems: ReadonlyArray<[PortalHeaderView, string]> = [
  ["prebudget", "성립전예산요구서작성(사업담당자용)"],
  ["main-budget-foundation", "본예산 편성 기초자료 만들기"],
  ["budget", "예산 편성 확인 (업무추진비 3% 편성 확인)"],
  ["supplementary", "추경예산자료 만들기"],
  ["agenda", "안건설명서 만들기"],
  ["closing", "결산 설명서 만들기"],
];

const searchItems: ReadonlyArray<{
  view: PortalHeaderView;
  label: string;
  description: string;
  keywords: string;
}> = [
  { view: "home", label: "홈", description: "학교예산 한눈에 첫 화면", keywords: "처음 메인" },
  { view: "guide", label: "학교예산 한눈에 이용안내", description: "업무별 사용 방법과 자주 묻는 질문", keywords: "도움말 사용법 질문" },
  { view: "prebudget", label: "성립전예산요구서작성(사업담당자용)", description: "성립전예산 요구서와 기안문 작성", keywords: "목적사업비 보조금 수익자부담" },
  { view: "main-budget-foundation", label: "본예산 편성 기초자료 만들기", description: "세입·세출 자료 분석과 Excel 미리보기", keywords: "본예산 엑셀 기초자료" },
  { view: "budget", label: "예산 편성 확인 (업무추진비 3% 편성 확인)", description: "세입 기준금액과 업무추진비 비율 확인", keywords: "본예산 3퍼센트 일반업무추진비" },
  { view: "supplementary", label: "추경예산자료 만들기", description: "집행실적으로 추경 검토자료 만들기", keywords: "추가경정 집행실적" },
  { view: "agenda", label: "안건설명서 만들기", description: "예산안 안건설명서 자동 작성", keywords: "예산 설명서" },
  { view: "closing", label: "결산 설명서 만들기", description: "결산 총괄표로 결산 설명서 작성", keywords: "결산서" },
  { view: "resources", label: "예산 자료실", description: "예산 지침 검색과 업무자료 내려받기", keywords: "지침 파일 다운로드" },
  { view: "reference-sites", label: "참고사이트", description: "예산 업무 관련 외부 사이트", keywords: "교육청 열린재정 에듀파인" },
  { view: "videos", label: "동영상 안내", description: "학교회계 예산관리 교육영상", keywords: "유튜브 교육" },
  { view: "webtoon", label: "예산 웹툰", description: "쉽게 보는 학교예산 웹툰", keywords: "만화" },
];

export function PortalHeader({
  activeView,
  onNavigate,
  schoolName,
  displayName,
  onLogout,
}: PortalHeaderProps) {
  const [isWorkMenuOpen, setIsWorkMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const isWorkView = workItems.some(([view]) => view === activeView);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ko-KR").replaceAll(" ", "");
  const searchResults = normalizedQuery
    ? searchItems.filter((item) => `${item.label}${item.description}${item.keywords}`.toLocaleLowerCase("ko-KR").replaceAll(" ", "").includes(normalizedQuery))
    : [];

  const navigate = (view: PortalHeaderView) => {
    setIsWorkMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
    onNavigate(view);
  };

  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <button
          className="portal-brand"
          type="button"
          aria-label="학교예산 한눈에 홈으로"
          onClick={() => navigate("home")}
        >
          <span className="portal-brand-character">
            <img src="/characters/cards/main-budget-good.png" alt="서울시교육청 캐릭터" />
          </span>
          <strong className="portal-brand-title">학교예산 한눈에</strong>
        </button>

        <button
          className="portal-mobile-toggle"
          type="button"
          aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-controls="portal-primary-navigation"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>

        <nav
          id="portal-primary-navigation"
          className="portal-nav"
          aria-label="주요 메뉴"
          data-open={isMobileMenuOpen}
        >
          <button
            type="button"
            className={activeView === "home" ? "active" : undefined}
            aria-current={activeView === "home" ? "page" : undefined}
            onClick={() => navigate("home")}
          >
            <Home size={17} aria-hidden="true" />
            홈
          </button>
          <div className="portal-work-menu">
            <button
              type="button"
              className={isWorkView ? "active" : undefined}
              aria-controls="portal-workflow-menu"
              aria-expanded={isWorkMenuOpen}
              onClick={() => setIsWorkMenuOpen((open) => !open)}
            >
              예산 업무
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            {isWorkMenuOpen && (
              <div id="portal-workflow-menu" className="portal-work-dropdown">
                {workItems.map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    className={activeView === view ? "active" : undefined}
                    onClick={() => navigate(view)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={activeView === "resources" ? "active" : undefined}
            aria-current={activeView === "resources" ? "page" : undefined}
            onClick={() => navigate("resources")}
          >
            <FolderOpen size={17} aria-hidden="true" />
            예산 자료실
          </button>
          <button
            type="button"
            className={activeView === "reference-sites" ? "active" : undefined}
            aria-current={activeView === "reference-sites" ? "page" : undefined}
            onClick={() => navigate("reference-sites")}
          >
            <Link2 size={17} aria-hidden="true" />
            참고사이트
          </button>
          <button
            type="button"
            className={activeView === "videos" ? "active" : undefined}
            aria-current={activeView === "videos" ? "page" : undefined}
            onClick={() => navigate("videos")}
          >
            <Video size={17} aria-hidden="true" />
            동영상 안내
          </button>
          <button
            type="button"
            className={activeView === "webtoon" ? "active" : undefined}
            aria-current={activeView === "webtoon" ? "page" : undefined}
            onClick={() => navigate("webtoon")}
          >
            <BookOpen size={17} aria-hidden="true" />
            예산 웹툰
          </button>
          <a
            href="https://notebook.google.com/notebook/db7666d9-8e19-4d43-8f3e-b8f1345e7d08/preview"
            target="_blank"
            rel="noreferrer"
            aria-label="학교예산 질의응답 (노트북엘앰기반)"
          >
            <CircleHelp size={17} aria-hidden="true" />
            학교예산 질의응답
          </a>
          {onLogout && (
            <button
              type="button"
              className="portal-mobile-logout"
              onClick={onLogout}
            >
              <LogOut size={17} aria-hidden="true" />
              로그아웃
            </button>
          )}
        </nav>

        <div className="portal-search">
          <button
            type="button"
            className="portal-search-toggle"
            aria-label={isSearchOpen ? "사이트 검색 닫기" : "사이트 검색 열기"}
            aria-controls="portal-site-search"
            aria-expanded={isSearchOpen}
            onClick={() => setIsSearchOpen((open) => !open)}
          >
            {isSearchOpen ? <X size={19} aria-hidden="true" /> : <Search size={19} aria-hidden="true" />}
            <span>검색</span>
          </button>
          {isSearchOpen && (
            <div id="portal-site-search" className="portal-search-panel">
              <label htmlFor="portal-site-search-input">사이트 전체 검색</label>
              <div className="portal-search-input">
                <Search size={18} aria-hidden="true" />
                <input
                  id="portal-site-search-input"
                  type="search"
                  aria-label="사이트 전체 검색"
                  autoFocus
                  value={searchQuery}
                  placeholder="업무명이나 필요한 기능을 검색하세요"
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              {normalizedQuery && (
                <div className="portal-search-results" aria-live="polite">
                  {searchResults.length ? searchResults.map((item) => (
                    <button key={item.view} type="button" aria-label={`${item.label}로 이동`} onClick={() => navigate(item.view)}>
                      <b>{item.label}</b>
                      <span>{item.description}</span>
                    </button>
                  )) : <p>일치하는 메뉴가 없습니다. 다른 검색어를 입력해 보세요.</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {onLogout && (
          <div className="portal-profile">
            <CircleUserRound size={21} aria-hidden="true" />
            <span>
              <strong>{displayName}</strong>
              <small>{schoolName}</small>
            </span>
            <button type="button" aria-label="로그아웃" onClick={onLogout}>
              <LogOut size={17} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
