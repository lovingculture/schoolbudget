import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DraftStorage } from "./storage";
import { PrebudgetPage } from "./PrebudgetPage";

const storage: DraftStorage = { load: () => null, save: vi.fn(), clear: vi.fn() };

describe("성립전예산 예시 통합", () => {
  it("현재 학교명을 유지한 채 초보자 안내를 연다", async () => {
    const user = userEvent.setup(); render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);
    await user.click(screen.getByRole("button", { name: "예시에서 시작하기" }));
    expect(screen.getByText("이 사업비는 어디에서 받았나요?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
    expect(screen.getByText("10건")).toBeInTheDocument();
  });

  it("작성 중인 내용을 덮어쓰지 않도록 취소한다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); const user = userEvent.setup();
    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);
    await user.clear(screen.getByLabelText("문서 제목")); await user.type(screen.getByLabelText("문서 제목"), "작성 중인 문서");
    await user.click(screen.getByRole("button", { name: "예시에서 시작하기" })); await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
    await user.click(screen.getAllByRole("button", { name: "자세히 보기" })[0]); await user.click(screen.getByRole("button", { name: "이 예시로 작성하기" }));
    expect(confirm).toHaveBeenCalled(); expect(screen.getByDisplayValue("작성 중인 문서")).toBeInTheDocument();
  });
});
