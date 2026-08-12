import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResourceAdminDialog } from "./ResourceAdminDialog";

describe("ResourceAdminDialog", () => {
  it("등록할 파일과 제목을 검증한 뒤 입력값을 전달한다", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const file = new File(["guide"], "guide.pdf", { type: "application/pdf" });
    render(<ResourceAdminDialog mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "등록하기" }));
    expect(screen.getByRole("alert")).toHaveTextContent("자료 제목을 입력하세요.");

    await user.type(screen.getByLabelText("자료 제목"), "학교회계 참고자료");
    await user.upload(screen.getByLabelText("파일"), file);
    await user.click(screen.getByRole("button", { name: "등록하기" }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: "학교회계 참고자료",
      category: "reference",
      schoolYear: new Date().getFullYear(),
      isPublic: true,
    }), file);
  });

  it("수정 화면은 기존 값으로 시작하고 파일 교체를 선택사항으로 둔다", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ResourceAdminDialog
        mode="edit"
        resource={{
          id: "r1", title: "기존 자료", description: "설명", category: "guide", schoolYear: 2026,
          originalFilename: "guide.pdf", storagePath: "2026/guide.pdf", mimeType: "application/pdf",
          sizeBytes: 5, isPublic: false, createdBy: "admin", createdAt: "2026-01-01", updatedAt: "2026-01-01",
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("자료 제목")).toHaveValue("기존 자료");
    expect(screen.getByText("현재 파일: guide.pdf")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "기존 자료", isPublic: false }), undefined);
  });

  it("서버 오류를 대화상자 안에 알린다", async () => {
    const user = userEvent.setup();
    render(
      <ResourceAdminDialog
        mode="create"
        onSubmit={vi.fn().mockRejectedValue(new Error("등록 실패"))}
        onCancel={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText("자료 제목"), "자료");
    await user.upload(screen.getByLabelText("파일"), new File(["x"], "x.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: "등록하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("등록 실패");
    expect(screen.getByRole("dialog", { name: "자료 등록" })).toBeVisible();
  });
});
