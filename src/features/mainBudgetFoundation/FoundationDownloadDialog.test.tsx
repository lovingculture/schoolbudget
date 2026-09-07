import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FoundationDownloadDialog } from "./FoundationDownloadDialog";

describe("FoundationDownloadDialog", () => {
  it("opens with both workbook choices and closes with Escape", async () => {
    const user = userEvent.setup();
    render(<FoundationDownloadDialog canDownloadResult onDownloadResult={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "엑셀 자료 내려받기" }));
    expect(screen.getByRole("dialog", { name: "엑셀 자료 내려받기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "분석 결과 Excel 내려받기" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "작업용 매크로 양식 내려받기" })).toHaveAttribute("href", "/download/school-main-budget-foundation-template.xlsm");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("disables generated workbook download when validation blocks export", async () => {
    const user = userEvent.setup();
    render(<FoundationDownloadDialog canDownloadResult={false} onDownloadResult={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "엑셀 자료 내려받기" }));
    expect(screen.getByRole("button", { name: "분석 결과 Excel 내려받기" })).toBeDisabled();
  });
});
