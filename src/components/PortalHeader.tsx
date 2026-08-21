import { useState } from "react";
import {
  ChevronDown,
  CircleUserRound,
  FolderOpen,
  Home,
  LogOut,
  Menu,
  Video,
  X,
} from "lucide-react";

export type PortalHeaderView =
  | "home"
  | "guidelines"
  | "prebudget"
  | "budget"
  | "agenda"
  | "closing"
  | "supplementary"
  | "guide"
  | "resources"
  | "videos";

type PortalHeaderProps = {
  activeView: PortalHeaderView;
  onNavigate: (view: PortalHeaderView) => void;
  schoolName: string;
  displayName: string;
  onLogout?: () => void;
};

const workItems: ReadonlyArray<[PortalHeaderView, string]> = [
  ["prebudget", "성립전예산"],
  ["budget", "본예산"],
  ["agenda", "예산안건 설명서"],
  ["closing", "결산설명서"],
  ["supplementary", "집행실적으로 추경자료 만들기"],
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
  const isWorkView = workItems.some(([view]) => view === activeView);

  const navigate = (view: PortalHeaderView) => {
    setIsWorkMenuOpen(false);
    setIsMobileMenuOpen(false);
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
            className={activeView === "videos" ? "active" : undefined}
            aria-current={activeView === "videos" ? "page" : undefined}
            onClick={() => navigate("videos")}
          >
            <Video size={17} aria-hidden="true" />
            동영상 안내
          </button>
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
