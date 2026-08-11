import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PREBUDGET_EXAMPLES } from "./data";
import { PrebudgetExampleLibrary } from "./PrebudgetExampleLibrary";
import { PrebudgetFundingGuide } from "./PrebudgetFundingGuide";

describe("초보자용 성립전예산 예시 화면", () => {
  it("쉬운 질문으로 목적사업비와 잘 모르겠어요를 선택한다", async () => {
    const onSelect = vi.fn(); const onUnsure = vi.fn(); const user = userEvent.setup();
    render(<PrebudgetFundingGuide onSelect={onSelect} onUnsure={onUnsure} />);
    await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
    expect(onSelect).toHaveBeenCalledWith("목적사업비");
    await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));
    expect(onUnsure).toHaveBeenCalled();
  });

  it("목적사업비 10건에서 쉬운 검색어로 예시를 찾고 상세를 연다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="목적사업비" onUseExample={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("10건")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "책");
    expect(screen.getByRole("heading", { name: "독서교육·도서구입" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));
    expect(screen.getByRole("heading", { name: "작성 전에 준비하세요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이 예시로 작성하기" })).toBeInTheDocument();
  });

  it("예시 목록과 상세 미리보기를 명확한 영역으로 제공한다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="전체" onUseExample={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("region", { name: "성립전예산 예시 찾기" })).toHaveClass("prebudget-example-library");
    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "돌봄");
    await user.click(screen.getAllByRole("button", { name: "자세히 보기" })[0]);
    expect(screen.getByRole("button", { name: "이 예시로 작성하기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "다른 예시 보기" })).toBeVisible();
  });

  it("재원 안내의 네 선택지를 목록 구조로 제공한다", () => {
    render(<PrebudgetFundingGuide onSelect={vi.fn()} onUnsure={vi.fn()} />);
    expect(screen.getByRole("list").children).toHaveLength(4);
  });
});
