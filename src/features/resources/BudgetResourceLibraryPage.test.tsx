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
const guideResource: BudgetResource = {
  ...sampleResource,
  id: "r2",
  title: "2025 예산편성 지침",
  description: "기본 지침 안내",
  category: "guide",
  schoolYear: 2025,
  originalFilename: "guide.xlsx",
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  sizeBytes: 1536,
  createdAt: "2025-12-31T12:00:00Z",
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

it("비로그인 사용자는 공개 자료를 보고 관리자 기능에서만 로그인을 요청한다", async () => {
  const user = userEvent.setup();
  const onAdminLogin = vi.fn();
  render(
    <BudgetResourceLibraryPage
      isAdmin={false}
      userId=""
      repository={repository([])}
      onAdminLogin={onAdminLogin}
    />,
  );

  await user.click(screen.getByRole("button", { name: "관리자 로그인" }));
  expect(onAdminLogin).toHaveBeenCalledTimes(1);
});

describe("예산 자료실", () => {
  it("지침 검색과 정적 자료를 하나의 화면에 제공한다", () => {
    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={repository([])} />);

    expect(screen.getByRole("heading", { name: "예산 자료실" })).toBeVisible();
    expect(screen.getByText("BUDGET RESOURCE LIBRARY")).toBeVisible();
    expect(screen.getByRole("img", { name: "자료를 안내하는 서울교육청 캐릭터" })).toHaveAttribute(
      "src",
      "/characters/cards/main-budget-good.png",
    );
    expect(screen.getByRole("searchbox", { name: "예산편성지침 검색" })).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "연도" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "미리보기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "구형 Excel 양식(XLS) 다운로드" })).toBeVisible();
    expect(screen.getByRole("link", { name: "집행실적 정리(추경예산 만들기)용 엑셀파일 다운로드" })).toHaveAttribute(
      "href",
      "/resources/expenditure-performance-budget-revision.xlsm",
    );
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

  it("동적 자료를 제목과 설명으로 검색하고 분류 및 학년도로 필터링한다", async () => {
    const user = userEvent.setup();
    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={repository([sampleResource, guideResource])} />);
    await screen.findByRole("heading", { name: "학교회계 참고자료" });

    const search = screen.getByRole("searchbox", { name: "등록 자료 검색" });
    await user.type(search, "기본 지침");
    expect(screen.getByRole("heading", { name: "2025 예산편성 지침" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "학교회계 참고자료" })).not.toBeInTheDocument();

    await user.clear(search);
    await user.selectOptions(screen.getByRole("combobox", { name: "자료 분류" }), "reference");
    expect(screen.getByRole("heading", { name: "학교회계 참고자료" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "2025 예산편성 지침" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "자료 분류" }), "all");
    await user.selectOptions(screen.getByRole("combobox", { name: "학년도" }), "2025");
    expect(screen.getByRole("heading", { name: "2025 예산편성 지침" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "학교회계 참고자료" })).not.toBeInTheDocument();
  });

  it("자료 카드에 분류, 학년도, 형식, 등록일, 파일 크기를 표시한다", async () => {
    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={repository([guideResource])} />);
    const article = (await screen.findByRole("heading", { name: "2025 예산편성 지침" })).closest("article");
    expect(article).toHaveTextContent("지침");
    expect(article).toHaveTextContent("2025학년도");
    expect(article).toHaveTextContent("XLSX");
    expect(article).toHaveTextContent("2025. 12. 31.");
    expect(article).toHaveTextContent("1.5 KB");
  });

  it("필터 결과가 없을 때 접근 가능한 안내를 표시한다", async () => {
    const user = userEvent.setup();
    render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" repository={repository([sampleResource])} />);
    await screen.findByRole("heading", { name: "학교회계 참고자료" });
    await user.type(screen.getByRole("searchbox", { name: "등록 자료 검색" }), "없는 자료");
    expect(screen.getByRole("status")).toHaveTextContent("조건에 맞는 등록 자료가 없습니다.");
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
