import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReferenceSitesPage, type ReferenceSite } from "./ReferenceSitesPage";

const sites: ReferenceSite[] = [
  { id: "sen", title: "서울특별시교육청", category: "교육청", description: "교육 정책과 공지 확인", url: "https://www.sen.go.kr" },
  { id: "work", title: "학교 업무지원", category: "업무지원", description: "학교 업무 참고자료", url: "https://example.com/work" },
];

describe("참고사이트 게시판", () => {
  it("본예산 편성 대표강사 교육영상을 기본 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "(25.11.20.) K-에듀파인 학교회계 예산관리(본예산편성) 대표강사 교육영상 바로가기" });
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=4eQjyipBuEM&t=1s");
    expect(within(link.closest("article")!).getByText("학교회계")).toBeVisible();
  });

  it("학교회계 예산결산 사용자 교육영상을 기본 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "(26.02.12) K-에듀파인 학교회계 예산결산 사용자 교육 바로가기" });
    expect(link).toHaveAttribute("href", "https://www.youtube.com/watch?v=J9wdZZCYYVk");
    expect(within(link.closest("article")!).getByText("학교회계")).toBeVisible();
  });

  it("서울시교육청 목적사업비 정산시스템을 교육청 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "서울시교육청 목적사업비 정산시스템 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://mokjeok.sen.go.kr/");
    expect(within(card).getByText("교육청")).toBeVisible();
    expect(within(card).getByText("사이트 바로가기")).toBeVisible();
  });

  it("성립전·추경 교육과 예산관리 1~3장 영상을 기본 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const videos = [
      ["('25.03.20.) K-에듀파인 학교회계 예산관리(성립전예산 및 추가경정예산) 대표강사 교육", "https://www.youtube.com/watch?v=q73d3QkwmP4"],
      ["[학교회계 - 예산관리] 1장 예산관리개요", "https://www.youtube.com/watch?v=dr-dxp9UCLE&list=PLnNTGUWLwu1sBH5y4_WZV05q5U_UD7wB1"],
      ["[학교회계 - 예산관리] 2장 예산편성 사전작업", "https://www.youtube.com/watch?v=a5VfrWqDcNo&t=20s"],
      ["[학교회계 - 예산관리] 3장 본예산관리", "https://www.youtube.com/watch?v=zaMVS8WLWTo&t=16s"],
    ];

    videos.forEach(([title, url]) => {
      const link = screen.getByRole("link", { name: `${title} 바로가기` });
      expect(link).toHaveAttribute("href", url);
      expect(within(link.closest("article")!).getByText("학교회계")).toBeVisible();
    });
  });

  it("유튜브 미리보기를 누르면 사이트 안에서 영상을 재생하고 닫는다", async () => {
    const user = userEvent.setup();
    render(<ReferenceSitesPage />);
    const title = "[학교회계 - 예산관리] 1장 예산관리개요";

    expect(screen.getByRole("img", { name: `${title} 미리보기` })).toHaveAttribute(
      "src",
      "https://i.ytimg.com/vi/dr-dxp9UCLE/hqdefault.jpg",
    );
    await user.click(screen.getByRole("button", { name: `${title} 사이트에서 재생` }));

    const dialog = screen.getByRole("dialog", { name: title });
    expect(within(dialog).getByTitle(title)).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/dr-dxp9UCLE?autoplay=1",
    );
    await user.click(within(dialog).getByRole("button", { name: "영상 닫기" }));
    expect(screen.queryByRole("dialog", { name: title })).not.toBeInTheDocument();
  });

  it("등록된 링크를 검색하고 분야별로 골라 외부 사이트를 연다", async () => {
    const user = userEvent.setup();
    render(<ReferenceSitesPage sites={sites} />);

    expect(screen.getByRole("heading", { name: "참고사이트" })).toBeVisible();
    await user.type(screen.getByRole("searchbox", { name: "참고사이트 검색" }), "서울");
    expect(screen.getByRole("link", { name: "서울특별시교육청 바로가기" })).toHaveAttribute("href", "https://www.sen.go.kr");
    expect(screen.queryByText("학교 업무지원")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "참고사이트 검색" }));
    await user.click(screen.getByRole("button", { name: "업무지원" }));
    expect(screen.getByText("학교 업무지원")).toBeVisible();
    expect(screen.queryByText("서울특별시교육청")).not.toBeInTheDocument();
  });

  it("등록된 링크가 없으면 추가 예정 안내를 보여준다", () => {
    render(<ReferenceSitesPage sites={[]} />);
    expect(screen.getByText("등록된 참고사이트가 없습니다.")).toBeVisible();
    expect(screen.getByText("링크를 알려주시면 확인 후 게시판에 반영합니다.")).toBeVisible();
  });
});
