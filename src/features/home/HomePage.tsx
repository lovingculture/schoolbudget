import { ArrowRight, BookOpen, CircleHelp } from "lucide-react";
import type { View } from "../../App";
import "./home.css";

type HomePageProps = {
  displayName: string;
  schoolName: string;
  onNavigate: (view: View) => void;
};

type WorkCard = {
  view: View;
  icon?: string;
  imageSrc?: string;
  imageAlt?: string;
  tone: string;
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
};

const workCards: WorkCard[] = [
  {
    view: "prebudget",
    imageSrc: "/characters/cards/prebudget-writing.png",
    imageAlt: "예산안 작성 중인 서울교육 캐릭터 자라나",
    tone: "mint",
    badge: "빠른 작성",
    title: "성립전예산요구서작성(사업담당자용)",
    description:
      "지침을 확인하고 성립전예산 요구서를 작성하면 기안문과 Word·PDF가 자동으로 완성됩니다.",
    actionLabel: "성립전예산 새로 작성",
  },
  {
    view: "supplementary",
    imageSrc: "/characters/cards/main-budget-good.png",
    imageAlt: "추경예산 자료 정리를 돕는 서울시교육청 캐릭터",
    tone: "green",
    badge: "추경 검토",
    title: "추경예산자료 만들기",
    description: "집행실적을 분석해 감액 가능액과 추경 검토자료를 만드세요.",
    actionLabel: "추경예산자료 만들기 시작하기",
  },
  {
    view: "budget",
    imageSrc: "/characters/cards/main-budget-good.png",
    imageAlt: "본예산 편성을 응원하는 서울교육 캐릭터 자라나",
    tone: "blue",
    badge: "예산 편성",
    title: "본예산 Excel 자동 계산",
    description: "본예산서를 불러오면 세입 기준금액과 일반업무추진비 편성 비율을 자동으로 계산합니다.",
    actionLabel: "본예산 시작하기",
  },
  {
    view: "agenda",
    imageSrc: "/characters/cards/budget-agenda-calm.png",
    imageAlt: "예산안 설명서 업무를 돕는 서울교육 캐릭터 열리미",
    tone: "purple",
    badge: "자동 작성",
    title: "안건설명서 만들기",
    description: "세입세출예산총괄표를 불러와 예산 안건설명서를 작성하세요.",
    actionLabel: "안건설명서 만들기 시작하기",
  },
  {
    view: "closing",
    imageSrc: "/characters/cards/closing-musical.png",
    imageAlt: "결산 설명서 업무를 돕는 서울교육 캐릭터 열리미",
    tone: "coral",
    badge: "결산 업무",
    title: "결산 설명서 만들기",
    description: "결산 총괄표를 바탕으로 결산 안건설명서를 작성하세요.",
    actionLabel: "결산 설명서 만들기 시작하기",
  },
];

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="content home-page-v2">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-section-inner home-hero-layout">
          <div className="home-hero-copy">
            <h1 id="home-hero-title">
              복잡한 학교예산 업무,
              <strong>한눈에 쉽고 빠르게</strong>
            </h1>
            <p>
              지침 확인부터 예산편성·안건설명서·결산·추경자료까지
              <br />
              현재 제공 중인 학교회계 업무를 한곳에서 처리하세요.
            </p>
            <div className="home-hero-actions">
              <button type="button" onClick={() => onNavigate("resources")}>
                예산 지침 보기
              </button>
            </div>
            <ul className="home-hero-benefits" aria-label="서비스 특징">
              <li>별도 설치 없이</li>
              <li>예산 파일 그대로</li>
              <li>쉬운 단계별 안내</li>
            </ul>
          </div>
          <figure className="home-character">
            <img
              src="/characters/seoul-education-characters-v3.png"
              width="1940"
              height="1962"
              alt="환영 인사를 건네는 서울교육 캐릭터 자라나와 열리미"
            />
          </figure>
        </div>
      </section>

      <section className="home-section-inner home-quick-services" aria-label="자주 찾는 서비스">
        <div className="home-quick-intro">
          <span>자주 찾는 서비스</span>
          <strong>어떤 업무를 도와드릴까요?</strong>
        </div>
        <button
          type="button"
          data-testid="budget-step"
          onClick={() => onNavigate("resources")}
          aria-label="2026 학교회계 예산편성 기본지침 보기"
        >
          <span className="home-quick-icon blue" aria-hidden="true">
            <BookOpen />
          </span>
          <span>
            <strong>2026 학교회계<br />예산편성 기본지침</strong>
            <small>PDF 검색·열람</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
        <button
          type="button"
          data-testid="budget-step"
          onClick={() => onNavigate("guide")}
          aria-label="처음 오셨나요? 안내 확인"
        >
          <span className="home-quick-icon green" aria-hidden="true">
            <CircleHelp />
          </span>
          <span>
            <strong>처음 오셨나요?</strong>
            <small>홈페이지 이용 안내</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <section className="home-work" aria-labelledby="home-work-title">
        <div className="home-section-inner home-work-inner">
          <div className="home-section-heading">
            <div>
              <span>ONE-STOP BUDGET</span>
              <h2
                id="home-work-title"
                aria-label="예산업무, 흐름부터 문서까지 한곳에서"
              >
                예산 업무를 한 번에
              </h2>
              <p>필요한 업무를 선택하면 현재 제공 중인 화면으로 바로 이동합니다.</p>
            </div>
          </div>
          <div className="home-work-grid">
            {workCards.map((card) => (
              <article
                className={`home-work-card ${["prebudget", "supplementary", "budget"].includes(card.view) ? "home-work-primary" : "home-work-secondary"}`}
                data-testid="budget-step"
                data-view={card.view}
                key={card.view}
              >
                <div className="home-work-card-head">
                  <span className={`home-work-icon ${card.tone}`}>
                    {card.imageSrc ? (
                      <img src={card.imageSrc} alt={card.imageAlt} />
                    ) : (
                      <span aria-hidden="true">{card.icon}</span>
                    )}
                  </span>
                  <small>{card.badge}</small>
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
                <button
                  type="button"
                  aria-label={card.actionLabel}
                  onClick={() => onNavigate(card.view)}
                >
                  시작하기 <ArrowRight aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-section-inner home-news" aria-labelledby="home-news-title">
        <div className="home-section-heading">
          <div>
            <span>알림 · 자료</span>
            <h2 id="home-news-title">새로운 소식을 확인하세요</h2>
          </div>
        </div>
        <div className="home-news-grid">
          <article>
            <small className="guideline">지침</small>
            <h3>2026학년도 학교회계 예산편성 기본지침</h3>
            <p>학교회계 예산편성 기준과 지침 원문을 확인하세요.</p>
            <button
              type="button"
              onClick={() => onNavigate("resources")}
              aria-label="2026학년도 학교회계 예산편성 기본지침 확인"
            >
              확인하기 <ArrowRight aria-hidden="true" />
            </button>
          </article>
          <article>
            <small className="guide">안내</small>
            <h3>학교예산 한눈에 이용 안내</h3>
            <p>현재 제공 중인 예산 지침과 업무 자료를 확인하세요.</p>
            <button
              type="button"
              onClick={() => onNavigate("guide")}
              aria-label="학교예산 한눈에 이용 안내 확인"
            >
              확인하기 <ArrowRight aria-hidden="true" />
            </button>
          </article>
          <article>
            <small className="site">링크</small>
            <h3>학교예산 업무 참고사이트</h3>
            <p>교육청·학교회계·업무지원 사이트를 한곳에서 확인하세요.</p>
            <button
              type="button"
              onClick={() => onNavigate("reference-sites")}
              aria-label="참고사이트 게시판 확인"
            >
              확인하기 <ArrowRight aria-hidden="true" />
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}
