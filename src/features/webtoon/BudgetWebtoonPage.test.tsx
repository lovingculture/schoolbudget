import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BudgetWebtoonPage } from "./BudgetWebtoonPage";

describe("예산 웹툰", () => {
  it("1화부터 6화까지 순서대로 보여주고 선택한 회차를 연다", async () => {
    const user = userEvent.setup();
    render(<BudgetWebtoonPage />);

    const episodeButtons = screen.getAllByRole("button", { name: /화 .* 읽어보기/ });
    expect(episodeButtons).toHaveLength(6);
    expect(episodeButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "1화 학교예산, 왜 중요할까? 읽어보기",
      "2화 학교예산, 어떻게 편성될까? 읽어보기",
      "3화 성립전예산, 언제 어떻게 편성할까? 읽어보기",
      "4화 성립전예산, 어떻게 편성하지? 읽어보기",
      "5화 추가경정예산(추경)이란? 읽어보기",
      "6화 추경예산, 언제 어떻게 편성할까? 읽어보기",
    ]);

    await user.click(screen.getByRole("button", { name: "3화 성립전예산, 언제 어떻게 편성할까? 읽어보기" }));
    expect(screen.getByRole("img", { name: "3화 성립전예산, 언제 어떻게 편성할까?" })).toHaveAttribute(
      "src",
      "/webtoons/budget/episode-3.png",
    );
  });

  it("상세페이지에서 이전 화·다음 화·목록 이동을 제공한다", async () => {
    const user = userEvent.setup();
    render(<BudgetWebtoonPage />);

    await user.click(screen.getByRole("button", { name: "3화 성립전예산, 언제 어떻게 편성할까? 읽어보기" }));
    expect(screen.getByRole("button", { name: "이전 화 2화" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "다음 화 4화" }));
    expect(screen.getByRole("heading", { name: "성립전예산, 어떻게 편성하지?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "웹툰 목록으로" }));
    expect(screen.getByRole("heading", { name: "예산 웹툰" })).toBeVisible();
  });

  it("첫 화와 마지막 화에서 존재하지 않는 방향 이동을 숨긴다", async () => {
    const user = userEvent.setup();
    render(<BudgetWebtoonPage />);

    await user.click(screen.getByRole("button", { name: "1화 학교예산, 왜 중요할까? 읽어보기" }));
    expect(screen.queryByRole("button", { name: /이전 화/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다음 화 2화" }));
    await user.click(screen.getByRole("button", { name: "웹툰 목록으로" }));
    await user.click(screen.getByRole("button", { name: "6화 추경예산, 언제 어떻게 편성할까? 읽어보기" }));
    expect(screen.queryByRole("button", { name: /다음 화/ })).not.toBeInTheDocument();
  });
});
