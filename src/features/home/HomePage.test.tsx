import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Portal } from "../../App";
import { HomePage } from "./HomePage";

const homeStyles = readFileSync("src/features/home/home.css", "utf8");

describe("승인된 포털 홈", () => {
  it("초광폭 화면에서도 전체 폭 배경과 공통 콘텐츠 거터가 같은 좌표계를 쓴다", () => {
    const style = document.createElement("style");
    style.textContent = homeStyles;
    document.head.append(style);

    try {
      const { container } = render(
        <HomePage
          displayName="김담당"
          schoolName="서울한빛초등학교"
          onNavigate={() => {}}
        />,
      );
      const page = container.querySelector<HTMLElement>(".home-page-v2");
      expect(page).not.toBeNull();
      const rules = Array.from((style.sheet as CSSStyleSheet).cssRules).filter(
        (rule): rule is CSSStyleRule => "selectorText" in rule,
      );
      const pageRule = rules.find((rule) => rule.selectorText === ".home-page-v2");
      expect(pageRule).toBeDefined();
      expect(pageRule!.style.getPropertyValue("max-width")).toBe("none");
      expect(pageRule!.style.getPropertyValue("width")).toBe("100%");

      const sectionInners = container.querySelectorAll<HTMLElement>(
        ".home-section-inner",
      );
      expect(sectionInners).toHaveLength(5);
      const innerRule = rules.find(
        (rule) => rule.selectorText === ".home-section-inner",
      );
      expect(innerRule).toBeDefined();
      expect(innerRule!.style.getPropertyValue("width")).toBe("calc(100% - 84px)");
      expect(innerRule!.style.getPropertyValue("max-width")).toBe("1356px");
      expect(innerRule!.style.getPropertyValue("margin-inline")).toBe("auto");
    } finally {
      style.remove();
    }
  });

  it("공식 캐릭터와 핵심 행동을 갖춘 홈 구성을 제공한다", () => {
    const { container } = render(
      <HomePage
        displayName="김담당"
        schoolName="서울한빛초등학교"
        onNavigate={() => {}}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "복잡하고 반복적인 학교 예산 업무를 더 빠르고 편리하게.",
      }),
    ).toBeVisible();
    expect(screen.getByText("학교예산 한눈에")).toBeVisible();
    expect(screen.getByText(/교직원이 예산 업무에 필요한 정보를 한곳에서 쉽고 빠르게 확인하고/)).toBeVisible();
    expect(screen.getByRole("region", { name: "학교예산 한눈에 구축 목적" })).toBeVisible();
    expect(screen.getByText(/학교 공사가 집중되는 겨울방학 중 예산 편성 업무에 소요되는 시간을 줄이고/)).toBeVisible();
    expect(screen.getByText("업무 시간은 줄이고, 예산 업무는 더 정확하게.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "업무 시작하기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "예산 지침 보기" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "환영 인사를 건네는 서울교육 캐릭터 자라나와 열리미",
      }),
    ).toHaveAttribute("src", "/characters/seoul-education-characters-v3.png");
    expect(screen.queryByText("서울한빛초등학교 업무 지원")).not.toBeInTheDocument();
    expect(container.querySelector(".home-character figcaption")).not.toBeInTheDocument();
    expect(screen.queryByText("김담당님의 예산 업무를 도와드려요.")).not.toBeInTheDocument();

    const workCards = within(
      screen.getByRole("region", {
        name: "예산업무, 흐름부터 문서까지 한곳에서",
      }),
    ).getAllByRole("article");
    expect(workCards).toHaveLength(6);
    expect(
      workCards.map((card) => within(card).getByRole("heading").textContent),
    ).toEqual([
      "성립전예산요구서작성(사업담당자용)",
      "추경예산자료 만들기",
      "예산 편성 확인 (업무추진비 3% 편성 확인)",
      "본예산 편성 기초자료 만들기",
      "안건설명서 만들기",
      "결산 설명서 만들기",
    ]);
    expect(screen.getByText("본예산서를 불러오면 세입 기준금액과 일반업무추진비 편성 비율을 자동으로 계산합니다.")).toBeVisible();

    expect(screen.getByRole("region", { name: "자주 찾는 서비스" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "2026 학교회계 예산편성 기본지침 보기" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "처음 오셨나요? 안내 확인" }),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "새로운 소식을 확인하세요" }),
    ).toBeVisible();
    expect(screen.getByText("학교예산 한눈에 이용 안내")).toBeVisible();
    expect(screen.queryByRole("button", { name: "통합검색 준비 중 안내 보기" })).not.toBeInTheDocument();
    expect(screen.queryByText("통합검색 기능은 현재 준비 중입니다.")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("예산업무 6개를 화면당 세 항목씩 배치한다", () => {
    const style = document.createElement("style");
    style.textContent = `${homeStyles}\n.primary { background: #f07450; color: white; }\n.secondary { background: white; }`;
    document.head.append(style);

    try {
      const { container } = render(
        <HomePage
          displayName="김담당"
          schoolName="서울한빛초등학교"
          onNavigate={() => {}}
        />,
      );
      const cards = Array.from(container.querySelectorAll<HTMLElement>(".home-work-card"));
      expect(cards.every((card) => card.classList.contains("home-work-primary"))).toBe(true);
      expect(cards.every((card) => !card.classList.contains("primary") && !card.classList.contains("secondary"))).toBe(true);
      expect(getComputedStyle(cards[0]).backgroundColor).toBe("rgb(255, 255, 255)");

      const rules = Array.from((style.sheet as CSSStyleSheet).cssRules).filter(
        (rule): rule is CSSStyleRule => "selectorText" in rule,
      );
      expect(rules.find((rule) => rule.selectorText === ".home-work-grid")?.style.getPropertyValue("grid-template-columns")).toBe(
        "repeat(6, minmax(0, 1fr))",
      );
      expect(rules.find((rule) => rule.selectorText === ".home-work-card.home-work-primary")?.style.getPropertyValue("grid-column")).toBe("span 2");
    } finally {
      style.remove();
    }
  });

  it("문자 아이콘 대신 예산 업무별 캐릭터 이미지를 제공합니다", () => {
    const { container } = render(
      <HomePage
        displayName="김담당"
        schoolName="서울한빛초등학교"
        onNavigate={() => {}}
      />,
    );

    const expectedCards = [
      {
        view: "prebudget",
        src: "/characters/cards/prebudget-writing.png",
        alt: "예산안 작성 중인 서울교육 캐릭터 자라나",
        previousTextMark: "₩",
      },
      {
        view: "budget",
        src: "/characters/cards/main-budget-good.png",
        alt: "본예산 편성을 응원하는 서울교육 캐릭터 자라나",
        previousTextMark: "本",
      },
      {
        view: "agenda",
        src: "/characters/cards/budget-agenda-calm.png",
        alt: "예산안 설명서 업무를 돕는 서울교육 캐릭터 열리미",
        previousTextMark: "案",
      },
      {
        view: "closing",
        src: "/characters/cards/closing-musical.png",
        alt: "결산 설명서 업무를 돕는 서울교육 캐릭터 열리미",
        previousTextMark: "決",
      },
      {
        view: "supplementary",
        src: "/characters/cards/main-budget-good.png",
        alt: "추경예산 자료 정리를 돕는 서울시교육청 캐릭터",
        previousTextMark: "↗",
      },
    ] as const;

    for (const { view, src, alt, previousTextMark } of expectedCards) {
      const card = container.querySelector<HTMLElement>(`[data-view="${view}"]`);
      if (!card) throw new Error(`${view} 카드를 찾을 수 없습니다.`);

      const icon = card.querySelector<HTMLElement>(".home-work-icon");
      if (!icon) throw new Error(`${view} 카드 아이콘을 찾을 수 없습니다.`);

      expect(icon).not.toHaveTextContent(previousTextMark);
      expect(within(icon).getByRole("img", { name: alt })).toHaveAttribute("src", src);
    }
  });

  it("캐릭터 카드 아이콘 상자를 52픽셀로 고정합니다", () => {
    const style = document.createElement("style");
    style.textContent = homeStyles;
    document.head.append(style);

    try {
      const { container } = render(
        <HomePage
          displayName="김담당"
          schoolName="서울한빛초등학교"
          onNavigate={() => {}}
        />,
      );

      for (const view of ["prebudget", "budget", "agenda", "closing", "supplementary"]) {
        const icon = container.querySelector<HTMLElement>(
          `[data-view="${view}"] .home-work-icon`,
        );
        if (!icon) throw new Error(`${view} 카드 아이콘을 찾을 수 없습니다.`);

        const iconStyle = getComputedStyle(icon);
        expect(iconStyle.width).toBe("52px");
        expect(iconStyle.height).toBe("52px");
        expect(iconStyle.minWidth).toBe("0");
        expect(iconStyle.minHeight).toBe("0");
        expect(iconStyle.flexShrink).toBe("0");
        expect(iconStyle.flexBasis).toBe("52px");
      }
    } finally {
      style.remove();
    }
  });

  it("홈의 모든 실행 항목을 실제 포털 화면에 연결한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);

    const destinations = [
      ["성립전예산 새로 작성", "성립전예산 요구서 작성"],
      ["본예산 시작하기", "예산 편성 확인 (업무추진비 3% 편성 확인)"],
      ["본예산 편성 기초자료 만들기 시작하기", "본예산 편성 기초자료 만들기"],
      ["안건설명서 만들기 시작하기", "예산 안건설명서 자동작성"],
      ["결산 설명서 만들기 시작하기", "결산 안건설명서 자동작성"],
      ["추경예산자료 만들기 시작하기", "집행실적으로 추경자료 만들기"],
      ["2026 학교회계 예산편성 기본지침 보기", "예산 자료실"],
      ["처음 오셨나요? 안내 확인", "학교예산 한눈에 이용 안내"],
      ["2026학년도 학교회계 예산편성 기본지침 확인", "예산 자료실"],
      ["학교예산 한눈에 이용 안내 확인", "학교예산 한눈에 이용 안내"],
      ["참고사이트 게시판 확인", "참고사이트"],
    ] as const;

    for (const [action, heading] of destinations) {
      await user.click(screen.getByRole("button", { name: action }));
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
      await user.click(
        screen.getByRole("button", { name: "학교예산 한눈에 홈으로" }),
      );
    }
  }, 15_000);

  it("학교예산 질의응답 서비스를 새 창으로 연다", () => {
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);

    const link = screen.getByRole("link", { name: "학교예산 질의응답 질문하러 가기" });
    expect(link).toHaveAttribute(
      "href",
      "https://notebook.google.com/notebook/db7666d9-8e19-4d43-8f3e-b8f1345e7d08/preview",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    expect(screen.getByText("학교예산 업무와 관련해 궁금한 내용을 질문하고 답변을 확인해 보세요.")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "자주 찾는 서비스" })).getByRole(
      "link", { name: "학교예산 질의응답 질문하러 가기" },
    )).toBe(link);
    expect(within(screen.getByRole("region", { name: "새로운 소식을 확인하세요" })).queryByText(
      "학교예산 질의응답",
    )).not.toBeInTheDocument();
  });

  it("서울시교육청 열린 재정을 홈 하단에서 새 창으로 연다", () => {
    render(<HomePage displayName="김담당" schoolName="서울한빛초등학교" onNavigate={() => {}} />);

    const news = screen.getByRole("region", { name: "새로운 소식을 확인하세요" });
    const link = within(news).getByRole("link", { name: "서울시교육청 열린 재정 바로가기" });
    expect(link).toHaveAttribute(
      "href",
      "https://open.sen.go.kr/fus/MI000000000000000509/html/cont0010v.do",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(within(news).getByText("서울교육 재정정보와 예산·결산 자료를 확인할 수 있습니다.")).toBeVisible();
  });
});
