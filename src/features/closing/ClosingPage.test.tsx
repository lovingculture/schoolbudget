import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ClosingPage } from "./ClosingPage";

describe("결산설명서 업로드 화면", () => {
  it("에듀파인 다운로드 경로와 두 가지 업로드 방법을 안내한다", () => {
    render(<ClosingPage />);
    expect(screen.getByText(/세입세출결산총괄표.*끌어다 놓으세요/)).toBeVisible();
    expect(screen.getByText(/학교회계 → 예산결산 → 결산서 → 결산서 일괄 출력/)).toBeVisible();
    expect(screen.getByRole("button", { name: "파일 선택" })).toBeVisible();
    expect(screen.getByText(/지원 파일.*\.xls.*\.xlsx/)).toBeVisible();
  });

  it("지원하지 않는 파일은 에듀파인 원본 안내와 함께 거절한다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ClosingPage />);
    const input = screen.getByLabelText("세입세출결산총괄표 파일");
    await user.upload(input, new File(["bad"], "다른보고서.csv", { type: "text/csv" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "에듀파인 세입세출결산총괄표 엑셀 파일만 사용할 수 있습니다.",
    );
  });
});
