import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DraftStorage } from "./storage";
import type { PrebudgetFormDraft } from "./types";
import { PrebudgetPage } from "./PrebudgetPage";
import { createPrebudgetDraft } from "./draft";
import { exportPrebudgetExcel, exportPrebudgetHwpx } from "./exporters";

vi.mock("./exporters", async (importOriginal) => ({
  ...await importOriginal<typeof import("./exporters")>(),
  downloadBlob: vi.fn(),
  exportPrebudgetHwpx: vi.fn(),
  exportPrebudgetExcel: vi.fn(),
}));

const storage: DraftStorage = { load: () => null, save: vi.fn(), clear: vi.fn() };

const validDraft = () => {
  const draft = createPrebudgetDraft("서울우리학교");
  draft.title = "맞춤형늘봄교실 성립전예산 편성 요청";
  draft.department = "체육안전교육부";
  draft.requester = "김담당";
  draft.officialDocument = "교육지원과-2222(2026. 7. 1.)";
  draft.items[0] = {
    ...draft.items[0],
    unitBusiness: "방과후 학교운영",
    business: "늘봄학교 운영",
    detail: "맞춤형 늘봄교실 운영",
    description: "운영 물품비",
    manualAmount: 200_000,
  };
  return draft;
};

async function renderValidPreview() {
  Element.prototype.scrollIntoView = vi.fn();
  const draft = validDraft();
  const loadedStorage: DraftStorage = { load: () => draft, save: vi.fn(), clear: vi.fn() };
  render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "임시저장 불러오기" }));
  await user.click(screen.getByRole("button", { name: "자동점검 후 기안문 생성" }));
  return user;
}

it("문서 제목과 부서명 및 관련 공문을 빨간 별표로 필수 안내한다", () => {
  render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);

  for (const name of ["문서 제목", "부서명", "관련 공문"]) {
    const label = screen.getByLabelText(name).closest("label");
    expect(label).not.toBeNull();
    expect(within(label!).getByText("*")).toHaveClass("prebudget-required");
  }
});

describe("성립전예산 예시 통합", () => {
  it("세부사업 선택 전에는 검색하기에서 먼저 선택하도록 안내한다", () => {
    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);

    expect(screen.getByLabelText("세부사업")).toHaveDisplayValue(
      "세부사업 검색하기에서 먼저 선택해주세요",
    );
  });

  it("처음에는 빈 서식으로 시작하고 사용자가 선택할 때만 임시저장본을 불러온다", async () => {
    const savedDraft = validDraft();
    const loadedStorage: DraftStorage = {
      load: () => savedDraft,
      save: vi.fn(),
      clear: vi.fn(),
    };
    const user = userEvent.setup();

    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);

    expect(screen.getByRole("textbox", { name: "문서 제목" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "부서명" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "사업담당자" })).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "임시저장 불러오기" }));

    expect(screen.getByRole("textbox", { name: "문서 제목" })).toHaveValue(savedDraft.title);
    expect(screen.getByRole("textbox", { name: "부서명" })).toHaveValue(savedDraft.department);
    expect(screen.getByRole("textbox", { name: "사업담당자" })).toHaveValue(savedDraft.requester);
  });

  it("현재 작성 내용을 임시저장해도 같은 화면에 불러오기 안내를 새로 표시하지 않는다", async () => {
    const previousDraft = validDraft();
    const loadedStorage: DraftStorage = {
      load: () => previousDraft,
      save: vi.fn(),
      clear: vi.fn(),
    };
    const user = userEvent.setup();
    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);

    await user.type(screen.getByRole("textbox", { name: "문서 제목" }), "새 문서");
    await user.click(screen.getByRole("button", { name: "임시저장" }));

    expect(screen.queryByRole("button", { name: "임시저장 불러오기" })).not.toBeInTheDocument();
  });

  it("같은 사업정보는 한 번만 표시하고 산출 항목만 여러 행으로 묶는다", async () => {
    const draft = validDraft();
    draft.items.push({
      ...draft.items[0],
      id: "second-calculation-row",
      category: "교육운영비",
      description: "교재교구비",
      manualAmount: 300_000,
    });
    const loadedStorage: DraftStorage = { load: () => draft, save: vi.fn(), clear: vi.fn() };

    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "임시저장 불러오기" }));

    expect(screen.getAllByLabelText("단위사업")).toHaveLength(1);
    expect(screen.getAllByLabelText("세부사업")).toHaveLength(1);
    expect(screen.getAllByLabelText("세부항목")).toHaveLength(1);
    expect(screen.getAllByLabelText("산출내역")).toHaveLength(2);
    expect(screen.getByDisplayValue("운영 물품비")).toBeVisible();
    expect(screen.getByDisplayValue("교재교구비")).toBeVisible();
  });

  it("같은 사업에 산출 항목을 추가하면 공통 사업정보를 복사한 새 행을 만든다", async () => {
    const savedDrafts: PrebudgetFormDraft[] = [];
    const loadedStorage: DraftStorage = {
      load: () => validDraft(),
      save: (draft) => savedDrafts.push(draft),
      clear: vi.fn(),
    };
    const user = userEvent.setup();
    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);
    await user.click(screen.getByRole("button", { name: "임시저장 불러오기" }));

    await user.click(screen.getByRole("button", { name: "이 사업에 산출 항목 추가" }));

    expect(screen.getAllByLabelText("단위사업")).toHaveLength(1);
    expect(screen.getAllByLabelText("산출내역")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(savedDrafts.at(-1)?.items[1]).toEqual(expect.objectContaining({
      unitBusiness: "방과후 학교운영",
      business: "늘봄학교 운영",
      detail: "맞춤형 늘봄교실 운영",
      description: "",
    }));
  });

  it("공통 세부항목을 입력하는 동안 입력창을 유지한다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);

    await user.type(screen.getByLabelText("세부항목"), "디지털교육 운영");

    expect(screen.getByLabelText("세부항목")).toHaveValue("디지털교육 운영");
  });

  it("빈 예산항목에 산출내역과 계산요소 예시를 흐린 안내문으로 표시한다", () => {
    render(<PrebudgetPage initialSchoolName="○○초등학교" />);

    expect(screen.getAllByLabelText("산출내역")[0]).toHaveAttribute(
      "placeholder",
      "예: 안전인력 봉사활동비",
    );
    expect(screen.getAllByLabelText("단가")[0]).toHaveAttribute("placeholder", "예: 40,000");
    expect(screen.getAllByLabelText("수량")[0]).toHaveAttribute("placeholder", "예: 1");
    expect(screen.getAllByLabelText("수량 단위")[0]).toHaveValue("명");
    expect(screen.getAllByLabelText("횟수")[0]).toHaveAttribute("placeholder", "예: 20");
    expect(screen.getAllByLabelText("단가")[0]).toHaveValue("");
  });

  it("계산요소를 천 단위 콤마로 표시하고 클릭하면 기존 값을 전체 선택한다", async () => {
    const draft = validDraft();
    draft.items[0] = { ...draft.items[0], unitPrice: 20000, quantity: 1000, count: 2 };
    const loadedStorage: DraftStorage = { load: () => draft, save: vi.fn(), clear: vi.fn() };
    render(<PrebudgetPage initialSchoolName="○○초등학교" storage={loadedStorage} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "임시저장 불러오기" }));

    const unitPrice = screen.getAllByLabelText("단가")[0] as HTMLInputElement;
    const quantity = screen.getAllByLabelText("수량")[0] as HTMLInputElement;
    expect(unitPrice).toHaveValue("20,000");
    expect(quantity).toHaveValue("1,000");

    const select = vi.spyOn(unitPrice, "select");
    fireEvent.focus(unitPrice);
    expect(select).toHaveBeenCalledOnce();
  });

  it("수량 단위를 선택해 임시저장하고 기안문 산출식에 반영한다", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const draft = validDraft();
    draft.items[0] = { ...draft.items[0], unitPrice: 10_000, quantity: 3, count: 1 };
    const save = vi.fn();
    const loadedStorage: DraftStorage = { load: () => draft, save, clear: vi.fn() };
    const { container } = render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "임시저장 불러오기" }));
    await user.selectOptions(screen.getAllByLabelText("수량 단위")[0], "개");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ quantityUnit: "개" })],
    }));
    await user.click(screen.getByRole("button", { name: "자동점검 후 기안문 생성" }));
    expect(container.querySelector(".prebudget-paper")).toHaveTextContent("10,000원 × 3개 × 1회");
  });
  it("필요한 담당자 입력만 표시한다", () => {
    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);
    expect(screen.getByRole("textbox", { name: "부서명" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "부서명" })).toHaveAttribute("placeholder", "예: 체육안전교육부");
    expect(screen.getByRole("textbox", { name: "사업담당자" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "사업담당자" })).toHaveAttribute("placeholder", "예: 김담당");
    expect(screen.getByRole("textbox", { name: "예산(품의) 권한 부여 대상" })).toHaveValue("");
    for (const removed of ["교부기관", "사업기간", "편성 사유", "관련 근거"]) {
      expect(screen.queryByLabelText(removed)).not.toBeInTheDocument();
    }
  });

  it("미리보기에서 문서 제목을 한 번만 표시한다", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const draft = validDraft();
    const loadedStorage: DraftStorage = { load: () => draft, save: vi.fn(), clear: vi.fn() };
    const { container } = render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "임시저장 불러오기" }));
    await user.click(screen.getByRole("button", { name: "자동점검 후 기안문 생성" }));
    const paper = container.querySelector<HTMLElement>(".prebudget-paper")!;
    expect(paper.querySelector("h1")).toHaveTextContent(draft.title);
    expect(paper.querySelector("pre")).not.toHaveTextContent(new RegExp(`^${draft.title}`));
  });

  it("기안문 미리보기의 예산 편성 내역을 7열 표와 합계로 표시한다", async () => {
    const { container } = render(<PrebudgetPage initialSchoolName="서울우리학교" storage={{ load: () => validDraft(), save: vi.fn(), clear: vi.fn() }} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "임시저장 불러오기" }));
    await user.click(screen.getByRole("button", { name: "자동점검 후 기안문 생성" }));
    const paper = container.querySelector<HTMLElement>(".prebudget-paper")!;
    expect(within(paper).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["단위사업", "세부사업", "세부항목", "원가통계비목", "산출내역", "산출식", "요구금액"]);
    expect(within(paper).getByText("합계")).toBeVisible();
    expect(within(paper).getAllByText("200,000원")).toHaveLength(2);
  });

  it("엑셀과 한글 두 가지 다운로드만 제공한다", async () => {
    vi.mocked(exportPrebudgetExcel).mockResolvedValue({ blob: new Blob(["xlsx"]), filename: "성립전예산.xlsx" });
    await renderValidPreview();

    expect(screen.getByRole("button", { name: "한글(HWPX)" })).toBeVisible();
    expect(screen.getByRole("button", { name: "엑셀" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Word" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "PDF" })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "엑셀" }));
    expect(exportPrebudgetExcel).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Excel" })).not.toBeInTheDocument();
  });

  it("keeps the exported document outside the interactive workspace", async () => {
    await renderValidPreview();

    expect(document.querySelector(".prebudget-paper")?.classList.contains("portal-workspace")).toBe(false);
  });

  it("불러온 예시의 계산요소를 수정하면 항목 금액과 합계를 다시 계산한다", async () => {
    const draft = validDraft();
    draft.exampleSourceId = "loaded-example";
    draft.items[0] = {
      ...draft.items[0],
      unitPrice: 10_000,
      quantity: 10,
      count: 2,
      manualAmount: 200_000,
    };
    const loadedStorage: DraftStorage = { load: () => draft, save: vi.fn(), clear: vi.fn() };
    const { container } = render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "임시저장 불러오기" }));
    const unitPrice = container.querySelector<HTMLInputElement>(".formula input")!;

    expect(container.querySelector(".formula output")).toHaveTextContent("200,000원");
    expect(container.querySelector(".total strong")).toHaveTextContent("200,000원");

    await user.clear(unitPrice);
    await user.type(unitPrice, "20000");

    expect(container.querySelector(".formula output")).toHaveTextContent("400,000원");
    expect(container.querySelector(".total strong")).toHaveTextContent("400,000원");
  });

  it("disables HWPX while it exports and reports an export failure", async () => {
    let rejectExport: (reason?: unknown) => void = () => undefined;
    vi.mocked(exportPrebudgetHwpx).mockImplementationOnce(() => new Promise<Blob>((_, reject) => { rejectExport = reject; }));
    const user = await renderValidPreview();
    const hwpxButton = screen.getByRole("button", { name: "한글(HWPX)" });

    await user.click(hwpxButton);
    expect(hwpxButton).toBeDisabled();

    rejectExport(new Error("HWPX export failed"));
    await waitFor(() => expect(screen.getByText("한글(HWPX) 파일을 만들지 못했습니다. 다시 시도해 주세요.")).toBeVisible());
  });

  it("clears the HWPX export failure after a successful retry", async () => {
    vi.mocked(exportPrebudgetHwpx)
      .mockRejectedValueOnce(new Error("HWPX export failed"))
      .mockResolvedValueOnce(new Blob(["HWPX"]));
    const user = await renderValidPreview();
    const hwpxButton = screen.getByRole("button", { name: "한글(HWPX)" });
    const failureMessage = "한글(HWPX) 파일을 만들지 못했습니다. 다시 시도해 주세요.";

    await user.click(hwpxButton);
    await screen.findByText(failureMessage);
    expect(hwpxButton).toBeEnabled();

    await user.click(hwpxButton);
    await waitFor(() => expect(screen.queryByText(failureMessage)).not.toBeInTheDocument());
    expect(hwpxButton).toBeEnabled();
  });


  it("현재 학교명을 유지한 채 초보자 안내를 연다", async () => {
    const user = userEvent.setup(); render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);
    await user.click(screen.getByRole("button", { name: "예시에서 시작하기" }));
    expect(screen.getByText("이 사업비는 어디에서 받았나요?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
    expect(screen.getByText("7건")).toBeInTheDocument();
  });

  it("재원 안내 화면의 직접 작성 돌아가기 버튼을 전용 스타일로 표시한다", async () => {
    const user = userEvent.setup(); render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);
    await user.click(screen.getByRole("button", { name: "예시에서 시작하기" }));
    expect(screen.getByRole("button", { name: "직접 작성으로 돌아가기" })).toHaveClass("prebudget-guide-back");
  });

  it("작성 중인 내용을 덮어쓰지 않도록 취소한다", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false); const user = userEvent.setup();
    render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);
    await user.clear(screen.getByLabelText("문서 제목")); await user.type(screen.getByLabelText("문서 제목"), "작성 중인 문서");
    await user.click(screen.getByRole("button", { name: "예시에서 시작하기" })); await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
    await user.click(screen.getAllByRole("button", { name: "자세히 보기" })[0]); await user.click(screen.getByRole("button", { name: "이 예시로 작성하기" }));
    expect(confirm).toHaveBeenCalled(); expect(screen.getByDisplayValue("작성 중인 문서")).toBeInTheDocument();
  });
});
