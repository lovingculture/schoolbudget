import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GUIDELINE_PDF_URL } from "../guidelines/GuidelinesPage";
import { ResourcesPage } from "./ResourcesPage";

describe("portal workspace visual contract", () => {
  it("wraps the resources page in the portal workspace visual contract", () => {
    render(<ResourcesPage onGuidelines={() => {}} />);

    expect(screen.getByRole("heading", { level: 1 }).closest(".portal-workspace")).not.toBeNull();
  });
});

describe("자료실", () => {
  it("예산지침 PDF와 현재 세출 요구자료 양식 다운로드를 한곳에서 제공한다", () => {
    render(<ResourcesPage onGuidelines={() => {}} />);

    expect(screen.getByRole("heading", { name: "자료실" })).toBeVisible();
    expect(screen.getByRole("link", { name: "PDF 내려받기" })).toHaveAttribute(
      "href",
      GUIDELINE_PDF_URL,
    );
    expect(screen.getByRole("button", { name: "구형 Excel 양식(XLS) 다운로드" })).toBeVisible();
    expect(screen.getByRole("button", { name: "일반 Excel 양식(XLSX) 다운로드" })).toBeVisible();
  });
});
