import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    }, {
      id: "2", policy: "정책", unitBusiness: "단위", detailBusiness: "세부", detailItem: "항목",
      account: "목", subAccount: "세목", costCategory: "일반수용비", description: "소모품",
      budgetAmount: 1000, committedAmount: 1000, paidAmount: 1000, original: {},
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
  beforeEach(() => { mockedDownload.mockReset(); localStorage.clear(); });

  it("renders the supplementary workflow in the shared workspace", () => {
    render(<SupplementaryPage />);

    expect(screen.getByRole("heading", { level: 1 }).closest(".portal-workspace")).not.toBeNull();
  });

  it("에듀파인 다운로드 경로와 102-2 업로드 안내를 보여준다", () => {
    render(<SupplementaryPage />);
    expect(screen.getByRole("heading", { name: "집행실적으로 추경자료 만들기" })).toBeVisible();
    expect(screen.getByRole("img", { name: "추경예산 자료 정리를 돕는 서울시교육청 캐릭터" })).toHaveAttribute(
      "src",
      "/characters/cards/main-budget-good.png",
    );
    expect(screen.getByText("학교회계")).toBeVisible();
    expect(screen.getByText("사업관리")).toBeVisible();
    expect(screen.getByText("사업관리 카드")).toBeVisible();
    expect(screen.getByText("집행실적 엑셀저장(실시간)")).toBeVisible();
    expect(screen.getByRole("list", { name: "에듀파인 집행실적 메뉴 이동 경로" }).children).toHaveLength(4);
    expect(screen.getByText("자료코드 102-2를 선택한 후 Excel로 내려받아 주세요.")).toBeVisible();
    expect(screen.getByRole("img", { name: "에듀파인 집행실적 엑셀저장 화면에서 자료코드 102-2를 선택하는 위치" })).toHaveAttribute(
      "src",
      "/guides/edu-finance-execution-102-2.png",
    );
    expect(screen.getByText(/102-2 파일을 여기에 끌어다 놓으세요/)).toBeVisible();
    expect(screen.getByRole("button", { name: "파일 선택" })).toBeVisible();
  });

  it("에듀파인 경로 단계의 한글 단어를 중간에서 나누지 않는다", () => {
    render(<SupplementaryPage />);

    const stepLabel = screen.getByText("학교회계");
    expect(getComputedStyle(stepLabel).wordBreak).toBe("keep-all");
    expect(getComputedStyle(stepLabel).fontSize).toBe("16px");
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

  it("빠른 필터를 표와 합계 및 다운로드 대상에 함께 적용하고 초기화한다", async () => {
    mockedDownload.mockResolvedValue();
    render(<SupplementaryPage />);
    await loadExecutionFixture();

    expect(screen.getByRole("group", { name: "추경자료 빠른 필터" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "집행률 50% 미만" }));
    expect(screen.getByText("협의회")).toBeVisible();
    expect(screen.queryByText("소모품")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "집행률 50% 미만" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "일반 Excel 다운로드" }));
    await waitFor(() => expect(mockedDownload).toHaveBeenCalled());
    expect(mockedDownload.mock.calls[0][1]).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(screen.getByText("소모품")).toBeVisible();
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
  });

  it("엑셀처럼 열별 값 필터와 정렬 메뉴를 제공한다", async () => {
    render(<SupplementaryPage />);
    await loadExecutionFixture();

    fireEvent.click(screen.getByRole("button", { name: "원가통계비목 필터 열기" }));
    const menu = screen.getByRole("group", { name: "원가통계비목 필터" });
    fireEvent.click(within(menu).getByRole("checkbox", { name: "일반업무추진비" }));

    expect(screen.queryByText("협의회")).not.toBeInTheDocument();
    expect(screen.getByText("소모품")).toBeVisible();
    expect(screen.getByText("원가통계비목: 1개 선택")).toBeVisible();

    fireEvent.click(within(menu).getByRole("button", { name: "오름차순 정렬" }));
    expect(screen.getByRole("button", { name: "원가통계비목 필터 열기" })).toHaveAttribute("data-sorted", "ascending");
  });

  it("열 필터의 전체 선택을 한 번에 해제하고 다시 선택한다", async () => {
    render(<SupplementaryPage />);
    await loadExecutionFixture();

    fireEvent.click(screen.getByRole("button", { name: "원가통계비목 필터 열기" }));
    const menu = screen.getByRole("group", { name: "원가통계비목 필터" });
    const selectAll = within(menu).getByRole("checkbox", { name: "전체 선택" });

    expect(selectAll).toBeChecked();
    fireEvent.click(selectAll);
    expect(screen.queryByText("협의회")).not.toBeInTheDocument();
    expect(screen.queryByText("소모품")).not.toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("checkbox", { name: "일반수용비" }));
    expect(screen.queryByText("협의회")).not.toBeInTheDocument();
    expect(screen.getByText("소모품")).toBeVisible();
    expect(screen.getByText("원가통계비목: 1개 선택")).toBeVisible();

    fireEvent.click(selectAll);
    expect(screen.getByText("협의회")).toBeVisible();
    expect(screen.getByText("소모품")).toBeVisible();
  });

  it("추경검토 시트의 15개 열을 같은 순서로 보여준다", async () => {
    render(<SupplementaryPage />);
    await loadExecutionFixture();
    fireEvent.click(screen.getByRole("button", { name: "추경검토자료" }));

    const table = screen.getByRole("table");
    const headers = within(table).getAllByRole("columnheader").map(header => header.textContent?.trim());
    expect(headers).toEqual([
      "정책사업", "단위사업", "세부사업", "세부항목", "목명", "세목명", "원가통계비목", "산출내역",
      "예산액", "원인행위금액", "지출금액", "집행잔액", "부서별집행예정액", "추경감액가능금액", "추경(안)",
    ]);
    expect(within(table).getAllByText("목")).toHaveLength(2);
    expect(within(table).getAllByText("세목")).toHaveLength(2);
  });

  it("원인행위와 지출금액이 다른 항목임을 빠른 필터에 명확히 표시한다", async () => {
    render(<SupplementaryPage />);
    await loadExecutionFixture();

    expect(screen.getByRole("button", { name: "원인행위·지출 불일치" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "불일치 있음" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "원인행위·지출 불일치" })).toBeVisible();
  });

  it("작업 상태를 브라우저에 임시저장하고 다음 접속에서 복원한다", async () => {
    const first = render(<SupplementaryPage />);
    await loadExecutionFixture();
    fireEvent.click(screen.getByRole("button", { name: "추경검토자료" }));
    fireEvent.change(screen.getByLabelText("협의회 집행예정액"), { target: { value: "300" } });
    fireEvent.click(screen.getByRole("button", { name: "임시저장" }));
    expect(screen.getByRole("status")).toHaveTextContent("현재 브라우저에 임시저장했습니다");
    first.unmount();

    render(<SupplementaryPage />);
    expect(screen.getByText(/서울옥정초등학교.*임시저장 자료/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "임시저장 불러오기" }));

    expect(await screen.findByRole("button", { name: "일반 Excel 다운로드" })).toBeVisible();
    expect(screen.getByLabelText("협의회 집행예정액")).toHaveValue("300");
  });

  it("금액을 화살표 없이 직접 입력하고 추경안에는 음수를 허용한다", async () => {
    mockedDownload.mockResolvedValue();
    render(<SupplementaryPage />);
    await loadExecutionFixture();
    fireEvent.click(screen.getByRole("button", { name: "추경검토자료" }));

    const planned = screen.getByLabelText("협의회 집행예정액");
    const proposal = screen.getByLabelText("협의회 추경안");
    expect(planned).toHaveAttribute("type", "text");
    expect(proposal).toHaveAttribute("type", "text");

    fireEvent.focus(planned);
    fireEvent.change(planned, { target: { value: "1,200" } });
    fireEvent.blur(planned);
    expect(planned).toHaveValue("1,200");

    fireEvent.focus(proposal);
    fireEvent.change(proposal, { target: { value: "-500,000" } });
    fireEvent.blur(proposal);
    expect(proposal).toHaveValue("-500,000");

    fireEvent.click(screen.getByRole("button", { name: "일반 Excel 다운로드" }));
    await waitFor(() => expect(mockedDownload).toHaveBeenCalled());
    expect(mockedDownload.mock.calls[0][1][0]).toMatchObject({ plannedAmount: 1200, supplementProposal: -500000 });
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
