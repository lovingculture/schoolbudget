import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrebudgetHeader } from "./PrebudgetHeader";

describe("성립전예산 홈 일치형 상단", () => {
  it("공식 캐릭터와 4단계 및 예시 진입을 제공한다", async () => {
    const onOpenExamples = vi.fn();
    render(<PrebudgetHeader documentReady={false} onOpenExamples={onOpenExamples} />);

    expect(screen.getByRole("region", { name: "성립전예산 작성 안내" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "성립전예산 요구서 작성" })).toBeVisible();
    expect(screen.getByText("Pre-Approval Budget Preparation")).toBeVisible();
    expect(
      screen.getByText(
        "교부된 사업비 또는 수익자부담금의 산출내역을 작성하여, 성립전예산 요구서 편성 및 기안문 생성까지 한번에 처리할 수 있습니다.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "문서를 작성하는 서울시교육청 캐릭터 자라나" })).toHaveAttribute("src", "/characters/cards/prebudget-writing.png");
    expect(screen.getByLabelText("성립전예산 작성 단계").children).toHaveLength(4);
    const exampleRegion = screen.getByRole("region", { name: "예시 작성 안내" });
    const exampleButton = screen.getByRole("button", { name: "예시에서 시작하기" });
    expect(exampleRegion).toHaveClass("prebudget-example-start-highlighted");
    expect(exampleRegion.querySelector("svg")).not.toBeNull();
    expect(exampleButton).toHaveClass("prebudget-example-start-button");
    await userEvent.setup().click(exampleButton);
    expect(onOpenExamples).toHaveBeenCalledOnce();
  });

  it("문서가 생성되면 자동점검과 미리보기 단계를 완료로 표시한다", () => {
    render(<PrebudgetHeader documentReady onOpenExamples={vi.fn()} />);
    const steps = screen.getByLabelText("성립전예산 작성 단계").children;
    expect(steps[2]).toHaveAttribute("data-status", "complete");
    expect(steps[3]).toHaveAttribute("data-status", "complete");
  });
});
