import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BudgetResourceLibraryPage } from "./BudgetResourceLibraryPage";

describe("예산 자료실", () => {
  it("지침 검색과 정적 자료를 하나의 화면에 제공한다", () => {
    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" />);

    expect(screen.getByRole("heading", { name: "예산 자료실" })).toBeVisible();
    expect(screen.getByText("BUDGET RESOURCE LIBRARY")).toBeVisible();
    expect(screen.getByRole("img", { name: "자료를 안내하는 서울교육청 캐릭터" })).toHaveAttribute(
      "src",
      "/characters/cards/main-budget-good.png",
    );
    expect(screen.getByRole("searchbox", { name: "자료 검색" })).toBeVisible();
    expect(screen.getByRole("button", { name: "미리보기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "구형 Excel 양식(XLS) 다운로드" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "자료 등록" })).not.toBeInTheDocument();
  });

  it("관리자에게 자료 등록을 제공한다", () => {
    render(<BudgetResourceLibraryPage isAdmin userId="admin-1" />);

    expect(screen.getByRole("button", { name: "자료 등록" })).toBeVisible();
  });
});
