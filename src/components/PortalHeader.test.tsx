import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PortalHeader } from "./PortalHeader";

describe("PortalHeader", () => {
  it("renders the approved top-level navigation controls and routes workflow choices", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <PortalHeader
        activeView="home"
        displayName="김담당"
        onNavigate={onNavigate}
        schoolName="서울한빛초등학교"
      />,
    );

    expect(screen.getByText("학교예산 한눈에")).toBeVisible();
    expect(screen.getByRole("img", { name: "서울시교육청 캐릭터" })).toHaveAttribute(
      "src",
      "/characters/cards/main-budget-good.png",
    );
    expect(screen.queryByText("김담당")).not.toBeInTheDocument();
    expect(screen.queryByText("서울한빛초등학교")).not.toBeInTheDocument();

    for (const label of [
      "홈",
      "예산 자료실",
      "참고사이트",
      "예산 업무",
      "동영상 안내",
      "예산 웹툰",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }
    const webtoon = screen.getByRole("button", { name: "예산 웹툰" });
    const questionAndAnswer = screen.getByRole("link", {
      name: "학교예산 질의응답 (노트북엘앰기반)",
    });
    expect(questionAndAnswer).toHaveAttribute(
      "href",
      "https://notebook.google.com/notebook/db7666d9-8e19-4d43-8f3e-b8f1345e7d08/preview",
    );
    expect(questionAndAnswer).toHaveAttribute("target", "_blank");
    expect(webtoon.compareDocumentPosition(questionAndAnswer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: "통합검색 준비 중" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "예산 업무" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    const workflowMenu = document.getElementById("portal-workflow-menu");
    expect(workflowMenu).not.toBeNull();
    expect(
      within(workflowMenu!).getAllByRole("button").map((button) => button.textContent),
    ).toEqual([
      "성립전예산요구서작성(사업담당자용)",
      "본예산 편성 기초자료 만들기",
      "예산 편성 확인 (업무추진비 3% 편성 확인)",
      "추경예산자료 만들기",
      "안건설명서 만들기",
      "결산 설명서 만들기",
    ]);
    await user.click(
      screen.getByRole("button", { name: "성립전예산요구서작성(사업담당자용)" }),
    );

    expect(onNavigate).toHaveBeenCalledWith("prebudget");

    await user.click(screen.getByRole("button", { name: "참고사이트" }));
    expect(onNavigate).toHaveBeenCalledWith("reference-sites");

    await user.click(screen.getByRole("button", { name: "예산 웹툰" }));
    expect(onNavigate).toHaveBeenCalledWith("webtoon");
  });

  it("로그인한 사용자에게만 담당자 정보를 표시한다", () => {
    render(
      <PortalHeader
        activeView="home"
        displayName="김담당"
        onLogout={() => {}}
        onNavigate={() => {}}
        schoolName="서울한빛초등학교"
      />,
    );

    expect(screen.getByText("김담당")).toBeVisible();
    expect(screen.getByText("서울한빛초등학교")).toBeVisible();
  });

  it("keeps logout available inside the expanded mobile navigation", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <PortalHeader
        activeView="home"
        displayName="김담당"
        onLogout={onLogout}
        onNavigate={() => {}}
        schoolName="서울한빛초등학교"
      />,
    );

    await user.click(screen.getByRole("button", { name: "메뉴 열기" }));
    const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    const logout = within(navigation).getByRole("button", { name: "로그아웃" });

    await user.click(logout);
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("opens and closes the collapsed mobile menu", async () => {
    const user = userEvent.setup();

    render(
      <PortalHeader
        activeView="home"
        displayName="김담당"
        onNavigate={() => {}}
        schoolName="서울한빛초등학교"
      />,
    );

    const mobileToggle = screen.getByRole("button", { name: "메뉴 열기" });
    expect(mobileToggle).toHaveAttribute("aria-expanded", "false");

    await user.click(mobileToggle);
    expect(mobileToggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "메뉴 닫기" }));
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("사이트 전체 검색 결과를 선택하면 해당 업무 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <PortalHeader
        activeView="home"
        displayName="김담당"
        onNavigate={onNavigate}
        schoolName="서울한빛초등학교"
      />,
    );

    await user.click(screen.getByRole("button", { name: "사이트 검색 열기" }));
    const search = screen.getByRole("searchbox", { name: "사이트 전체 검색" });
    await user.type(search, "추경");
    await user.click(screen.getByRole("button", { name: "추경예산자료 만들기로 이동" }));

    expect(onNavigate).toHaveBeenCalledWith("supplementary");
    expect(screen.queryByRole("searchbox", { name: "사이트 전체 검색" })).not.toBeInTheDocument();
  });
});
