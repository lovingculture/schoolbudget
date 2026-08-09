import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GUIDELINE_PDF_URL, GuidelinesPage } from "./GuidelinesPage";

describe("예산지침 화면", () => {
  it("실제 지침 한 건만 표시한다", () => {
    render(<GuidelinesPage />);

    expect(screen.getByRole("heading", { name: "예산지침" })).toBeVisible();
    expect(screen.getByText("2026학년도 학교회계 예산편성 기본지침")).toBeVisible();
    expect(screen.queryByText("성립전예산 편성 및 집행 유의사항")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "PDF 내려받기" })).toHaveAttribute(
      "download",
    );
  });

  it("부서별 세출 요구서 양식을 XLS와 XLSX로 제공한다", () => {
    render(<GuidelinesPage />);
    expect(screen.getByRole("heading", { name: "부서별 본예산 세출 요구자료 양식" })).toBeVisible();
    expect(screen.getByRole("button", { name: "구형 Excel 양식(XLS) 다운로드" })).toBeVisible();
    expect(screen.getByRole("button", { name: "일반 Excel 양식(XLSX) 다운로드" })).toBeVisible();
  });

  it("본문을 검색하고 결과 페이지를 미리보기로 연다", async () => {
    const user = userEvent.setup();
    render(<GuidelinesPage />);

    await user.type(
      screen.getByRole("searchbox", { name: "지침 검색" }),
      "학교운영위원회",
    );

    const results = await screen.findAllByRole("button", {
      name: /페이지 \d+.*학교운영위원회/,
    });
    await user.click(results[0]);

    expect(screen.getByTitle("2026학년도 예산편성지침 미리보기")).toHaveAttribute(
      "src",
      expect.stringMatching(/#page=\d+$/),
    );
  });

  it("다른 검색 결과를 선택하면 해당 페이지 주소로 PDF iframe을 새로 생성한다", async () => {
    const user = userEvent.setup();
    render(<GuidelinesPage />);

    await user.type(
      screen.getByRole("searchbox", { name: "지침 검색" }),
      "학교운영위원회",
    );

    const results = await screen.findAllByRole("button", {
      name: /페이지 \d+.*학교운영위원회/,
    });
    expect(results.length).toBeGreaterThan(1);

    await user.click(results[0]);
    const firstFrame = screen.getByTitle("2026학년도 예산편성지침 미리보기");

    await user.click(results[1]);
    const secondFrame = screen.getByTitle("2026학년도 예산편성지침 미리보기");
    const secondPage = results[1]
      .getAttribute("aria-label")
      ?.match(/페이지 (\d+)/)?.[1];

    expect(secondFrame).not.toBe(firstFrame);
    expect(secondFrame).toHaveAttribute(
      "src",
      `${GUIDELINE_PDF_URL}#page=${secondPage}`,
    );
  });

  it("검색 결과가 없으면 안내한다", async () => {
    const user = userEvent.setup();
    render(<GuidelinesPage />);

    await user.type(
      screen.getByRole("searchbox", { name: "지침 검색" }),
      "존재하지않는검색어",
    );

    expect(screen.getByText("검색 결과가 없습니다. 다른 단어로 검색해 보세요.")).toBeVisible();
  });
});
