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
  it("분류와 제목 검색을 제공하고 아직 등록되지 않은 영상은 솔직하게 안내한다", () => {
    render(<VideoGuidePage />);

    expect(screen.getByRole("combobox", { name: "영상 분류" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "영상 제목 검색" })).toBeVisible();
    expect(screen.getByText("안내 동영상을 준비하고 있습니다.")).toBeVisible();
  });

  it("검색 또는 분류 결과가 없을 때 다음 행동을 안내한다", async () => {
    const user = userEvent.setup();
    render(<VideoGuidePage />);

    await user.type(screen.getByRole("searchbox", { name: "영상 제목 검색" }), "예산편성");

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
