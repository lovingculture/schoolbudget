import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BudgetResourceLibraryPage } from "./BudgetResourceLibraryPage";
import type { BudgetResource } from "./resourceTypes";

const sampleResource: BudgetResource = {
  id: "r1", title: "학교회계 참고자료", description: "업무 참고", category: "reference", schoolYear: 2026,
  originalFilename: "reference.pdf", storagePath: "2026/reference.pdf", mimeType: "application/pdf", sizeBytes: 12,
  isPublic: true, createdBy: "admin-1", createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

function repository(resources = [sampleResource]) {
  return {
    listPublic: vi.fn().mockResolvedValue(resources),
    listAll: vi.fn().mockResolvedValue(resources),
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    download: vi.fn().mockResolvedValue(undefined),
  };
}

describe("예산 자료실", () => {
  it("지침 검색과 정적 자료를 하나의 화면에 제공한다", () => {
    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={repository([])} />);

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

  it("저장소의 공개 자료를 표시하고 인증된 비공개 다운로드를 호출한다", async () => {
    const user = userEvent.setup();
    const repo = repository();
    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={repo} />);

    expect(await screen.findByRole("heading", { name: "학교회계 참고자료" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "다운로드: 학교회계 참고자료" }));
    expect(repo.download).toHaveBeenCalledWith(sampleResource);
  });

  it("관리자가 자료를 등록하고 목록을 새로 불러온다", async () => {
    const user = userEvent.setup();
    const repo = repository([]);
    render(<BudgetResourceLibraryPage isAdmin userId="admin-1" repository={repo} />);

    await user.click(screen.getByRole("button", { name: "자료 등록" }));
    expect(screen.getByRole("dialog", { name: "자료 등록" })).toBeVisible();
    const file = new File(["guide"], "guide.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("파일"), file);
    await user.type(screen.getByLabelText("자료 제목"), "새 참고자료");
    await user.click(screen.getByRole("button", { name: "등록하기" }));
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ title: "새 참고자료" }), file, "admin-1");
    await waitFor(() => expect(repo.listAll).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("status")).toHaveTextContent("자료를 등록했습니다.");
  });

  it("관리자는 비공개 자료를 포함한 전체 목록을 불러오고 일반 사용자는 공개 목록만 불러온다", async () => {
    const privateResource = { ...sampleResource, id: "draft-1", title: "비공개 초안", isPublic: false };
    const adminRepo = repository([privateResource]);
    const publicRepo = repository([]);

    const { unmount } = render(<BudgetResourceLibraryPage isAdmin userId="admin-1" repository={adminRepo} />);
    expect(await screen.findByRole("heading", { name: "비공개 초안" })).toBeVisible();
    expect(adminRepo.listAll).toHaveBeenCalledTimes(1);
    expect(adminRepo.listPublic).not.toHaveBeenCalled();
    unmount();

    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={publicRepo} />);
    await waitFor(() => expect(publicRepo.listPublic).toHaveBeenCalledTimes(1));
    expect(publicRepo.listAll).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "비공개 초안" })).not.toBeInTheDocument();
  });

  it("관리자가 자료를 수정하고 확인 후 삭제한다", async () => {
    const user = userEvent.setup();
    const repo = repository();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BudgetResourceLibraryPage isAdmin userId="admin-1" repository={repo} />);

    await screen.findByRole("heading", { name: "학교회계 참고자료" });
    await user.click(screen.getByRole("button", { name: "자료 수정: 학교회계 참고자료" }));
    await user.clear(screen.getByLabelText("자료 제목"));
    await user.type(screen.getByLabelText("자료 제목"), "수정한 참고자료");
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    expect(repo.update).toHaveBeenCalledWith("r1", expect.objectContaining({ title: "수정한 참고자료" }), undefined);
    expect(screen.getByRole("status")).toHaveTextContent("자료를 수정했습니다.");

    await user.click(screen.getByRole("button", { name: "자료 삭제: 학교회계 참고자료" }));
    expect(repo.remove).toHaveBeenCalledWith(sampleResource);
    await waitFor(() => expect(repo.listAll).toHaveBeenCalledTimes(3));
    expect(screen.getByRole("status")).toHaveTextContent("자료를 삭제했습니다.");
  });

  it("목록을 불러오는 동안 접근 가능한 상태를 표시하고 빈 목록 안내를 먼저 보이지 않는다", () => {
    const repo = repository([]);
    repo.listPublic.mockReturnValue(new Promise(() => undefined));

    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={repo} />);

    expect(screen.getByRole("status")).toHaveTextContent("자료 목록을 불러오는 중입니다.");
    expect(screen.queryByText("등록된 자료가 없습니다.")).not.toBeInTheDocument();
  });

  it("삭제 확인을 취소하면 저장소를 변경하지 않는다", async () => {
    const user = userEvent.setup();
    const repo = repository();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<BudgetResourceLibraryPage isAdmin userId="admin-1" repository={repo} />);
    await screen.findByRole("heading", { name: "학교회계 참고자료" });
    await user.click(screen.getByRole("button", { name: "자료 삭제: 학교회계 참고자료" }));
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
