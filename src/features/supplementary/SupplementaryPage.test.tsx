import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadSupplementaryWorkbook } from "./exportExcel";
import { SupplementaryPage } from "./SupplementaryPage";

vi.mock("./exportExcel", () => ({ downloadSupplementaryWorkbook: vi.fn() }));
vi.mock("./parser", () => ({
  ExecutionParseError: class ExecutionParseError extends Error {},
  parseExecutionWorkbook: vi.fn(() => ({
    fiscalYear: 2026,
    executionDate: "20260801",
    schoolName: "서울옥정초등학교",
    sourceSheetName: "102-2",
    headers: ["학교명", "예산액(4)(1+2+3)"],
    originalRows: [["학교명", "예산액(4)(1+2+3)"], ["서울옥정초등학교", 1000]],
    rows: [{
      id: "1", policy: "정책", unitBusiness: "단위", detailBusiness: "세부", detailItem: "항목",
      account: "목", subAccount: "세목", costCategory: "일반업무추진비", description: "협의회",
      budgetAmount: 1000, committedAmount: 400, paidAmount: 350, original: {},
    }],
  })),
}));

const mockedDownload = vi.mocked(downloadSupplementaryWorkbook);

async function loadExecutionFixture() {
  const file = { name: "2026집행실적_102-2.xlsx", arrayBuffer: async () => new ArrayBuffer(0) };
  fireEvent.change(screen.getByLabelText("집행실적 102-2 파일"), { target: { files: [file] } });
  await screen.findByRole("button", { name: "일반 Excel 다운로드" });
}

describe("집행실적으로 추경자료 만들기 화면", () => {
  beforeEach(() => { mockedDownload.mockReset(); });

  it("에듀파인 다운로드 경로와 102-2 업로드 안내를 보여준다", () => {
    render(<SupplementaryPage />);
    expect(screen.getByRole("heading", { name: "집행실적으로 추경자료 만들기" })).toBeVisible();
    expect(screen.getByText(/학교회계 → 사업관리 → 사업관리카드/)).toBeVisible();
    expect(screen.getByText(/102-2 파일을 여기에 끌어다 놓으세요/)).toBeVisible();
    expect(screen.getByRole("button", { name: "파일 선택" })).toBeVisible();
  });

  it("일반 Excel만 다운로드한다", async () => {
    mockedDownload.mockResolvedValue();
    render(<SupplementaryPage />);
    await loadExecutionFixture();

    fireEvent.click(screen.getByRole("button", { name: "일반 Excel 다운로드" }));
    await waitFor(() => expect(mockedDownload).toHaveBeenCalledWith(expect.anything(), expect.anything()));
    expect(screen.queryByRole("button", { name: "버튼 포함 Excel 다운로드" })).not.toBeInTheDocument();
    expect(screen.queryByText(/콘텐츠 사용/)).not.toBeInTheDocument();
  });

  it("Excel을 만드는 동안 버튼을 비활성화하고 완료 후 복구한다", async () => {
    let finish!: () => void;
    mockedDownload.mockImplementation(() => new Promise<void>(resolvePromise => { finish = resolvePromise; }));
    render(<SupplementaryPage />);
    await loadExecutionFixture();

    const button = screen.getByRole("button", { name: "일반 Excel 다운로드" });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveTextContent("일반 Excel 생성 중");

    await act(async () => { finish(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "일반 Excel 다운로드" })).not.toBeDisabled());
  });

  it("Excel 생성 실패 시 다시 시도 안내를 보여준다", async () => {
    mockedDownload.mockRejectedValue(new Error("failed"));
    render(<SupplementaryPage />);
    await loadExecutionFixture();

    fireEvent.click(screen.getByRole("button", { name: "일반 Excel 다운로드" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("일반 Excel 파일을 만들지 못했습니다");
  });
});
