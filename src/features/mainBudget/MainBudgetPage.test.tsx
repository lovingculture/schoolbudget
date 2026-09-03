import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MainBudgetAnalysisResult } from "./analysisTypes";

const dispatcherMocks = vi.hoisted(() => ({ analyzeBudgetFile: vi.fn() }));
const storageMocks = vi.hoisted(() => ({
  load: vi.fn(), save: vi.fn(), clear: vi.fn(), migrateLegacy: vi.fn(),
}));

vi.mock("./analyzeBudgetFile", () => ({ analyzeBudgetFile: dispatcherMocks.analyzeBudgetFile }));
vi.mock("./analysisStorage", () => ({ mainBudgetAnalysisStorage: storageMocks }));

import { MainBudgetPage } from "./MainBudgetPage";

const verificationLabels = [
  "학교운영비전입금", "사용료", "수수료", "자산매각대", "지난년도수입", "이자수입", "기타행정활동수입", "순세계잉여금",
];

function result(overrides: Partial<MainBudgetAnalysisResult> = {}): MainBudgetAnalysisResult {
  const revenueRow = { cells: ["학교운영비전입금", 721_573], sourcePage: 3, sourceRow: 8, confidence: 0.94 };
  const expenseRow = { cells: ["일반업무추진비", 23_020], sourceSheet: "표지", sourceRow: 71, confidence: 0.92 };
  const expense = {
    id: "표지:71", policy: "교육활동", unit: "교육지원", business: "학생지원", detail: "학생자치",
    costItem: "일반업무추진비", amount: 23_020, row: expenseRow,
  };
  const base: MainBudgetAnalysisResult = {
    source: { fileName: "2026본예산.xlsx", format: "xlsx", sheetCount: 1 },
    identity: { schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" },
    totalRevenue: { label: "세입예산총액", amount: 1_010_749 },
    purposeRevenue: { label: "목적사업비전입금", amount: 0 },
    beneficiaryRevenue: { label: "수익자부담수입", amount: 207_176 },
    revenueBaseline: 803_573,
    verificationRevenue: {
      facts: verificationLabels.map((label, index) => ({
        label, amount: index === 0 ? 721_573 : index === 5 ? 2_000 : index === 7 ? 80_000 : 0, row: revenueRow,
      })),
      isComplete: true,
    },
    verificationRevenueTotal: 803_573,
    generalBusinessExpenses: [expense],
    generalBusinessExpenseFacts: { facts: [expense], isComplete: true },
    generalBusinessExpenseTotal: 23_020,
    ratio: 23_020 / 803_573 * 100,
    comparison: { status: "match", revenueBaseline: 803_573, verificationRevenueTotal: 803_573, difference: 0 },
    warnings: [],
  };
  return { ...base, ...overrides };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function budgetFile(name = "budget.xlsx") {
  return new File(["budget"], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("본예산 PDF·Excel 자동 계산 화면", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.load.mockReturnValue(null);
    storageMocks.save.mockReturnValue(true);
    storageMocks.clear.mockReturnValue(true);
  });
  afterEach(() => vi.restoreAllMocks());

  it("starts with only a single-file PDF/Excel upload and no sample or retired results", () => {
    render(<MainBudgetPage />);
    expect(screen.getByRole("heading", { level: 1, name: "본예산 PDF·Excel 자동 계산" }).closest(".portal-workspace")).not.toBeNull();
    const input = screen.getByLabelText("본예산 파일 선택");
    expect(input).toHaveAttribute("accept", ".pdf,.xls,.xlsx");
    expect(input).not.toHaveAttribute("multiple");
    expect(screen.queryByText(/803,573/)).not.toBeInTheDocument();
    expect(screen.queryByText(/23,020/)).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /통합본|오류검토 보고서/ })).not.toBeInTheDocument();
  });

  it("captures the selected file before clearing a browser-live FileList", () => {
    const selected = budgetFile();
    const liveFiles: { 0?: File; length: number; item: (index: number) => File | null } = {
      0: selected,
      length: 1,
      item: (index) => index === 0 && liveFiles.length === 1 ? selected : null,
    };
    dispatcherMocks.analyzeBudgetFile.mockResolvedValue(result());
    render(<MainBudgetPage />);
    const input = screen.getByLabelText("본예산 파일 선택");
    Object.defineProperty(input, "files", { configurable: true, get: () => liveFiles });
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => "",
      set: () => {
        liveFiles.length = 0;
        delete liveFiles[0];
      },
    });

    fireEvent.change(input);

    expect(dispatcherMocks.analyzeBudgetFile).toHaveBeenCalledWith(selected, expect.any(Object));
  });

  it("shows progress, disables replacement, and cancels without accepting a late completion", async () => {
    const user = userEvent.setup();
    const pending = deferred<MainBudgetAnalysisResult>();
    let signal!: AbortSignal;
    dispatcherMocks.analyzeBudgetFile.mockImplementation((_file, options) => {
      signal = options.signal;
      options.onProgress({ phase: "ocr-recognizing", status: "recognizing text", completed: 2, total: 10 });
      return pending.promise;
    });
    render(<MainBudgetPage />);
    const input = screen.getByLabelText("본예산 파일 선택");
    await user.upload(input, budgetFile("scan.pdf"));
    expect(await screen.findByRole("status")).toHaveTextContent("OCR로 문자를 인식하는 중");
    expect(screen.getByText("2 / 10")).toBeVisible();
    expect(input).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "분석 취소" }));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(input).not.toBeDisabled();
    pending.resolve(result());
    await pending.promise;
    await waitFor(() => expect(storageMocks.save).not.toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "분석 결과" })).not.toBeInTheDocument();
  });

  it("saves a successful result and renders exact summaries, eight revenues, conversions, and provenance", async () => {
    const user = userEvent.setup();
    const analyzed = result();
    dispatcherMocks.analyzeBudgetFile.mockResolvedValue(analyzed);
    render(<MainBudgetPage />);
    await user.upload(screen.getByLabelText("본예산 파일 선택"), budgetFile());
    expect(await screen.findByRole("heading", { name: "분석 결과" })).toBeVisible();
    expect(screen.getByText("803,573천원")).toBeVisible();
    expect(screen.getByText("803,573,000원")).toBeVisible();
    expect(screen.getByText("23,020천원")).toBeVisible();
    expect(screen.getByText("23,020,000원")).toBeVisible();
    expect(screen.getByText("2.86%")).toBeVisible();
    expect(screen.getByText("일치")).toBeVisible();
    expect(screen.getByText("가람초등학교")).toBeVisible();
    expect(screen.getByText("2026학년도")).toBeVisible();
    expect(screen.getByText("본예산")).toBeVisible();
    expect(screen.getByText("1개 시트")).toBeVisible();
    const revenueTable = screen.getByRole("table", { name: "세입 검증 항목" });
    expect(within(revenueTable).getAllByRole("row")).toHaveLength(9);
    expect(within(revenueTable).getByText("721,573천원")).toBeVisible();
    expect(within(revenueTable).getByText("721,573,000원")).toBeVisible();
    const expenseTable = screen.getByRole("table", { name: "일반업무추진비 세부 내역" });
    expect(within(expenseTable).getByText("표지 시트 · 71행")).toBeVisible();
    expect(within(expenseTable).getByText("92%")).toBeVisible();
    expect(storageMocks.save).toHaveBeenCalledWith(analyzed);
    await user.click(screen.getByRole("button", { name: "다른 파일 분석" }));
    expect(storageMocks.clear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "분석 결과" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("본예산 파일 선택")).toBeVisible();
  });

  it("restores a saved result without needing the original file", () => {
    storageMocks.load.mockReturnValue(result({ source: { fileName: "restored-budget.pdf", format: "pdf", pageCount: 22 } }));
    render(<MainBudgetPage />);
    expect(screen.getByRole("heading", { name: "분석 결과" })).toBeVisible();
    expect(screen.getByText("restored-budget.pdf")).toBeVisible();
    expect(screen.getByText("22쪽")).toBeVisible();
    expect(screen.queryByLabelText("본예산 파일 선택")).not.toBeInTheDocument();
    expect(dispatcherMocks.analyzeBudgetFile).not.toHaveBeenCalled();
  });

  it("shows mismatch and low-confidence warnings with the calculated difference", async () => {
    const user = userEvent.setup();
    dispatcherMocks.analyzeBudgetFile.mockResolvedValue(result({
      verificationRevenueTotal: 782_000,
      comparison: { status: "mismatch", revenueBaseline: 803_573, verificationRevenueTotal: 782_000, difference: 21_573 },
      warnings: [
        { code: "REVENUE_BASELINE_MISMATCH", message: "세입 기준금액과 세입 검증 항목 합계가 일치하지 않습니다.", severity: "warning" },
        { code: "LOW_CONFIDENCE", message: "OCR 인식 신뢰도가 낮아 원본 확인이 필요합니다.", severity: "warning", row: { cells: ["이자수입", "A".repeat(100)], sourcePage: 4, confidence: 0.62 } },
      ],
    }));
    render(<MainBudgetPage />);
    await user.upload(screen.getByLabelText("본예산 파일 선택"), budgetFile("mismatch.pdf"));
    expect(await screen.findByText("불일치")).toBeVisible();
    expect(screen.getByText("차이 21,573천원")).toBeVisible();
    expect(screen.getByText("세입 기준금액과 세입 검증 항목 합계가 일치하지 않습니다.")).toBeVisible();
    expect(screen.getByText("OCR 인식 신뢰도가 낮아 원본 확인이 필요합니다.")).toBeVisible();
    const source = screen.getByLabelText(/경고 출처:/);
    expect(source).toBeVisible();
    expect(source).toHaveAccessibleName(/4쪽.*인식 문자열:.*이자수입.*….*신뢰도 62%/);
    expect(source).not.toHaveAccessibleName(/A{100}/);
  });

  it("keeps an ordinary small warning set fully expanded without a grouped-warning summary", () => {
    storageMocks.load.mockReturnValue(result({
      warnings: [
        { code: "TOTAL_REVENUE", message: "세입예산총액을 확인할 수 없습니다.", severity: "error" },
        { code: "LOW_CONFIDENCE_REVENUE_ROW", message: "세입예산명세서 본문에 신뢰도가 낮은 행이 있어 확인이 필요합니다.", severity: "error", row: { cells: ["이자수입"], sourcePage: 5, sourceRow: 12, confidence: 0.61 } },
      ],
    }));

    render(<MainBudgetPage />);

    expect(screen.getByText("세입예산총액을 확인할 수 없습니다.")).toBeVisible();
    expect(screen.getByText("세입예산명세서 본문에 신뢰도가 낮은 행이 있어 확인이 필요합니다.")).toBeVisible();
    expect(screen.getByLabelText(/경고 출처: 5쪽 12행/)).toBeVisible();
    expect(screen.queryByText(/묶어서 표시/)).not.toBeInTheDocument();
  });

  it("groups a large repeated OCR warning set while retaining critical warnings, counts, and representative evidence", () => {
    const repeatedWarnings = Array.from({ length: 100 }, (_, index) => ({
      code: "LOW_CONFIDENCE_EXPENDITURE_ROW",
      message: "세출예산명세서 본문에 신뢰도가 낮은 행이 있어 확인이 필요합니다.",
      severity: "error" as const,
      row: { cells: [`일반업무추진비 ${index + 1}`], sourcePage: 8 + Math.floor(index / 10), sourceRow: index + 1, confidence: 0.4 },
    }));
    storageMocks.load.mockReturnValue(result({
      warnings: [
        { code: "EXPENDITURE_SECTION_INCOMPLETE", message: "세출예산명세서의 데이터와 종료 구조를 완전하게 확인할 수 없습니다.", severity: "error" },
        ...repeatedWarnings,
      ],
    }));

    render(<MainBudgetPage />);

    expect(screen.getByText("세출예산명세서의 데이터와 종료 구조를 완전하게 확인할 수 없습니다.")).toBeVisible();
    expect(screen.getByText("동일한 OCR 행 경고 100건을 묶어서 표시합니다.")).toBeVisible();
    expect(screen.getByText("대표 출처 3건 표시 · 나머지 97건은 목록에서 접었습니다.")).toBeVisible();
    expect(screen.getAllByLabelText(/경고 출처:/)).toHaveLength(3);
    expect(screen.getByLabelText(/경고 출처: 8쪽 1행/)).toBeInTheDocument();
    expect(screen.getByLabelText(/경고 출처: 8쪽 2행/)).toBeInTheDocument();
    expect(screen.getByLabelText(/경고 출처: 8쪽 3행/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/경고 출처: 8쪽 4행/)).not.toBeInTheDocument();
  });

  it("renders a successful analysis with a nonfatal restoration warning when saving is blocked", async () => {
    const user = userEvent.setup();
    dispatcherMocks.analyzeBudgetFile.mockResolvedValue(result());
    storageMocks.save.mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    render(<MainBudgetPage />);

    await user.upload(screen.getByLabelText("본예산 파일 선택"), budgetFile());

    expect(await screen.findByRole("heading", { name: "분석 결과" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("다음 방문 때 복원할 수 없습니다");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    [0, []],
    [2, [budgetFile("one.pdf"), budgetFile("two.pdf")]],
  ])("rejects a drag/drop selection containing %i files", async (count, dropped) => {
    render(<MainBudgetPage />);
    const files = {
      length: count,
      item: (index: number) => dropped[index] ?? null,
    };

    fireEvent.drop(screen.getByRole("region", { name: "본예산서 파일 불러오기" }), {
      dataTransfer: { files },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("파일을 정확히 하나만 선택");
    expect(dispatcherMocks.analyzeBudgetFile).not.toHaveBeenCalled();
  });

  it("renders unknown amounts as 확인 필요 and never manufactures a zero", async () => {
    const user = userEvent.setup();
    const unknown = result({
      revenueBaseline: null, verificationRevenueTotal: null, generalBusinessExpenseTotal: null, ratio: null,
      comparison: { status: "needs-review", revenueBaseline: null, verificationRevenueTotal: null, difference: null },
      verificationRevenue: { facts: verificationLabels.map((label) => ({ label, amount: null })), isComplete: false },
      generalBusinessExpenses: [{ id: "unknown", policy: "", unit: "", business: "", detail: "", costItem: "일반업무추진비", amount: null }],
    });
    dispatcherMocks.analyzeBudgetFile.mockResolvedValue(unknown);
    render(<MainBudgetPage />);
    await user.upload(screen.getByLabelText("본예산 파일 선택"), budgetFile());
    const baselineCard = (await screen.findByText("세입 기준금액")).closest("article");
    expect(baselineCard).not.toBeNull();
    expect(within(baselineCard!).getAllByText("확인 필요")).toHaveLength(2);
    expect(within(baselineCard!).queryByText(/0천원/)).not.toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "일반업무추진비 세부 내역" })).getAllByText("확인 필요").length).toBeGreaterThan(0);
  });

  it("surfaces analysis failures and never stores failed or partial results", async () => {
    const user = userEvent.setup();
    dispatcherMocks.analyzeBudgetFile.mockRejectedValue(new Error("OCR 파일을 불러오지 못했습니다. 인터넷 연결 또는 네트워크 권한을 확인해 주세요."));
    render(<MainBudgetPage />);
    await user.upload(screen.getByLabelText("본예산 파일 선택"), budgetFile("scan.pdf"));
    expect(await screen.findByRole("alert")).toHaveTextContent("OCR 파일을 불러오지 못했습니다. 인터넷 연결 또는 네트워크 권한을 확인해 주세요.");
    expect(storageMocks.save).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "분석 결과" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("본예산 파일 선택")).not.toBeDisabled();
  });

  it("aborts a replaced run and ignores its stale completion", async () => {
    const first = deferred<MainBudgetAnalysisResult>();
    const second = deferred<MainBudgetAnalysisResult>();
    const signals: AbortSignal[] = [];
    dispatcherMocks.analyzeBudgetFile
      .mockImplementationOnce((_file, options) => { signals.push(options.signal); return first.promise; })
      .mockImplementationOnce((_file, options) => { signals.push(options.signal); return second.promise; });
    render(<MainBudgetPage />);
    const input = screen.getByLabelText("본예산 파일 선택");
    fireEvent.change(input, { target: { files: [budgetFile("first.xlsx")] } });
    await waitFor(() => expect(dispatcherMocks.analyzeBudgetFile).toHaveBeenCalledTimes(1));
    fireEvent.change(input, { target: { files: [budgetFile("second.xlsx")] } });
    await waitFor(() => expect(dispatcherMocks.analyzeBudgetFile).toHaveBeenCalledTimes(2));
    expect(signals[0].aborted).toBe(true);
    const secondResult = result({ source: { fileName: "second.xlsx", format: "xlsx", sheetCount: 1 }, generalBusinessExpenseTotal: 12_345 });
    second.resolve(secondResult);
    expect(await screen.findByText("second.xlsx")).toBeVisible();
    first.resolve(result({ source: { fileName: "first.xlsx", format: "xlsx", sheetCount: 1 }, generalBusinessExpenseTotal: 99_999 }));
    await first.promise;
    await waitFor(() => expect(screen.queryByText("first.xlsx")).not.toBeInTheDocument());
    expect(storageMocks.save).toHaveBeenCalledTimes(1);
    expect(storageMocks.save).toHaveBeenCalledWith(secondResult);
  });

  it("aborts the active analysis when unmounted", async () => {
    const pending = deferred<MainBudgetAnalysisResult>();
    let signal!: AbortSignal;
    dispatcherMocks.analyzeBudgetFile.mockImplementation((_file, options) => { signal = options.signal; return pending.promise; });
    const { unmount } = render(<MainBudgetPage />);
    fireEvent.change(screen.getByLabelText("본예산 파일 선택"), { target: { files: [budgetFile()] } });
    await waitFor(() => expect(dispatcherMocks.analyzeBudgetFile).toHaveBeenCalledTimes(1));
    unmount();
    expect(signal.aborted).toBe(true);
    pending.resolve(result());
    await pending.promise;
    await waitFor(() => expect(storageMocks.save).not.toHaveBeenCalled());
  });
});
