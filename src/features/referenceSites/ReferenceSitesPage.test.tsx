import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReferenceSitesPage, type ReferenceSite } from "./ReferenceSitesPage";

const sites: ReferenceSite[] = [
  { id: "sen", title: "서울특별시교육청", category: "교육청", description: "교육 정책과 공지 확인", url: "https://www.sen.go.kr" },
  { id: "work", title: "학교 업무지원", category: "업무지원", description: "학교 업무 참고자료", url: "https://example.com/work" },
];

describe("참고사이트 게시판", () => {
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
