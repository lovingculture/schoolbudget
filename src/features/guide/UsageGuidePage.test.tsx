import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UsageGuidePage } from "./UsageGuidePage";

describe("학교예산 한눈에 이용 안내", () => {
  it("초보자가 업무 순서와 파일·보안 안내를 한 화면에서 확인한다", async () => {
    const user = userEvent.setup();
    render(<UsageGuidePage onNavigate={() => {}} />);

    expect(screen.getByRole("heading", { name: "학교예산 한눈에 이용 안내" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "업무별 이용 방법" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "파일 내려받기 안내" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "자주 묻는 질문" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "추경예산자료 만들기 이용 방법" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "예산 편성 확인 (업무추진비 3% 편성 확인)" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "본예산 편성 기초자료 만들기" })).toBeVisible();
    expect(screen.getAllByText(/세입·세출예산서 Excel/).length).toBeGreaterThan(0);
    await user.click(screen.getByText("본예산 편성 기초자료는 어떻게 만드나요?"));
    expect(screen.getAllByText(/지원 형식은 \.xls와 \.xlsx이며/)).toHaveLength(2);
    expect(screen.getByText(/분석 결과 Excel 또는 작업용 매크로 양식/)).toBeVisible();
    expect(screen.queryByText(/기존 CSV 파일도 계속 사용할 수 있고/)).not.toBeInTheDocument();
    expect(screen.getByText("본예산서를 불러오면 세입 기준금액과 일반업무추진비 편성 비율을 자동으로 계산합니다.")).toBeVisible();
    await user.click(screen.getByText("예산 편성 확인(업무추진비 3%)은 어떻게 하나요?"));
    expect(screen.getByText(/세입 기준금액과 일반업무추진비 합계·편성 비율/)).toBeVisible();
    expect(screen.getByText(/지원 형식은 \.xls와 \.xlsx이며, 파일과 분석 결과/)).toBeVisible();
    expect(screen.getByText(/파일과 분석 결과는 서버로 전송되지 않습니다/)).toBeVisible();
    expect(screen.getByText(/각 열 제목의 필터 버튼/)).toBeVisible();
    expect(screen.getByText(/브라우저를 닫았다가 다음 날 다시 접속해도/)).toBeVisible();
    expect(screen.getByText("선택한 파일은 이 브라우저에서만 처리되며 서버에 업로드하거나 저장하지 않습니다.")).toBeVisible();
  });

  it("각 업무 화면으로 바로 이동한다", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<UsageGuidePage onNavigate={onNavigate} />);

    const destinations = [
      ["예산 자료실로 이동", "resources"],
      ["성립전예산 작성으로 이동", "prebudget"],
      ["예산 편성 확인 (업무추진비 3% 편성 확인)으로 이동", "budget"],
      ["본예산 편성 기초자료 만들기로 이동", "main-budget-foundation"],
      ["예산안건 설명서로 이동", "agenda"],
      ["결산 설명서로 이동", "closing"],
      ["추경예산자료로 이동", "supplementary"],
    ] as const;

    for (const [buttonName, view] of destinations) {
      await user.click(screen.getByRole("button", { name: buttonName }));
      expect(onNavigate).toHaveBeenLastCalledWith(view);
    }
  });
});
