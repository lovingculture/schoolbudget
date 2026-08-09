import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PortalHeader } from "./PortalHeader";

describe("PortalHeader", () => {
  it("renders the approved top-level navigation controls and routes workflow choices", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <PortalHeader
        activeView="home"
        displayName="김담당"
        onNavigate={onNavigate}
        schoolName="서울한빛초등학교"
      />,
    );

    for (const label of [
      "홈",
      "학교예산 지침",
      "예산 업무",
      "자료실",
      "동영상 안내",
      "통합검색",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeVisible();
    }

    await user.click(screen.getByRole("button", { name: "예산 업무" }));
    await user.click(screen.getByRole("menuitem", { name: "성립전예산" }));

    expect(onNavigate).toHaveBeenCalledWith("prebudget");
  });

  it("opens and closes the collapsed mobile menu", async () => {
    const user = userEvent.setup();

    render(
      <PortalHeader
        activeView="home"
        displayName="김담당"
        onNavigate={() => {}}
        schoolName="서울한빛초등학교"
      />,
    );

    const mobileToggle = screen.getByRole("button", { name: "메뉴 열기" });
    expect(mobileToggle).toHaveAttribute("aria-expanded", "false");

    await user.click(mobileToggle);
    expect(mobileToggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "메뉴 닫기" }));
    expect(screen.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
