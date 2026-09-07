import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { VideoGuidePage } from "./VideoGuidePage";
import { filterVideoGuides, type VideoGuide } from "./videoGuide";

describe("portal workspace visual contract", () => {
  it("wraps the video guide page in the portal workspace visual contract", () => {
    render(<VideoGuidePage />);

    expect(screen.getByRole("heading", { level: 1 }).closest(".portal-workspace")).not.toBeNull();
  });
});

describe("동영상 안내", () => {
  it("학교회계 유튜브 안내 영상 7개를 한곳에서 제공한다", () => {
    render(<VideoGuidePage />);

    const videos = [
      ["(25.11.20.) K-에듀파인 학교회계 예산관리(본예산편성) 대표강사 교육영상", "https://www.youtube.com/watch?v=4eQjyipBuEM&t=1s"],
      ["(26.02.12) K-에듀파인 학교회계 예산결산 사용자 교육", "https://www.youtube.com/watch?v=J9wdZZCYYVk"],
      ["('25.03.20.) K-에듀파인 학교회계 예산관리(성립전예산 및 추가경정예산) 대표강사 교육", "https://www.youtube.com/watch?v=q73d3QkwmP4"],
      ["[학교회계 - 예산관리] 1장 예산관리 개요", "https://www.youtube.com/watch?v=dr-dxp9UCLE&list=PLnNTGUWLwu1sBH5y4_WZV05q5U_UD7wB1"],
      ["[학교회계 - 예산관리] 2장 예산편성 사전작업", "https://www.youtube.com/watch?v=a5VfrWqDcNo&t=20s"],
      ["[학교회계 - 예산관리] 3장 본예산관리", "https://www.youtube.com/watch?v=zaMVS8WLWTo&t=16s"],
      ["[직무콕] 한눈에 쏙 들어오는 본예산 조정회의 자료 만들기", "https://www.youtube.com/watch?v=5epYRQu4Ov4"],
    ];

    videos.forEach(([title, url]) => {
      const link = screen.getByRole("link", { name: `${title} 유튜브에서 보기` });
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveAttribute("target", "_blank");
    });

    const chapterOne = screen.getByRole("heading", {
      name: "[학교회계 - 예산관리] 1장 예산관리 개요",
    });
    expect(chapterOne.querySelectorAll("span")).toHaveLength(2);
    expect(chapterOne.querySelectorAll("span")[0]).toHaveTextContent("[학교회계 - 예산관리]");
    expect(chapterOne.querySelectorAll("span")[1]).toHaveTextContent("1장 예산관리 개요");

    const chapterTwo = screen.getByRole("heading", {
      name: "[학교회계 - 예산관리] 2장 예산편성 사전작업",
    });
    expect(chapterTwo.querySelectorAll("span")).toHaveLength(2);
    expect(chapterTwo.querySelectorAll("span")[0]).toHaveTextContent("[학교회계 - 예산관리]");
    expect(chapterTwo.querySelectorAll("span")[1]).toHaveTextContent("2장 예산편성 사전작업");
  });

  it("분류와 제목 검색을 제공하고 아직 등록되지 않은 영상은 솔직하게 안내한다", () => {
    render(<VideoGuidePage />);

    expect(screen.getByRole("combobox", { name: "영상 분류" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "영상 제목 검색" })).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(7);
  });

  it("검색 또는 분류 결과가 없을 때 다음 행동을 안내한다", async () => {
    const user = userEvent.setup();
    render(<VideoGuidePage />);

    await user.type(screen.getByRole("searchbox", { name: "영상 제목 검색" }), "등록되지 않은 영상");

    expect(screen.getByText("조건에 맞는 안내 영상이 없습니다. 다른 검색어나 분류를 선택해 보세요.")).toBeVisible();
  });
});

describe("filterVideoGuides", () => {
  const guides: VideoGuide[] = [
    { id: "prebudget", title: "School Budget Start guide", category: "예산편성", description: "" },
    { id: "closing", title: "결산 설명서 작성", category: "결산", description: "" },
  ];

  it("선택한 분류의 영상만 반환한다", () => {
    expect(filterVideoGuides("", "결산", guides).map(({ id }) => id)).toEqual(["closing"]);
  });

  it("제목을 대소문자와 관계없이 검색한다", () => {
    expect(filterVideoGuides("START", "전체", guides).map(({ id }) => id)).toEqual(["prebudget"]);
  });
});
