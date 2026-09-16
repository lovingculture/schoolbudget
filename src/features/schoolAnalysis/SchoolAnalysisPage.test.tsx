import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { init } from "echarts";
import garak from "../../../public/data/school-analysis/schools/B100000370_2025_202603.json";
import gangdong from "../../../public/data/school-analysis/schools/B100005540_2025_202603.json";
import beodeul from "../../../public/data/school-analysis/schools/B100005384_2025_202603.json";
import { loadSchoolDataset, loadSchoolManifest } from "./data";
import SchoolAnalysisPage from "./SchoolAnalysisPage";
import SchoolTreemap from "./SchoolTreemap";
import type { BudgetDataset, BudgetNode, SchoolManifestEntry } from "./types";

// Network and canvas are external boundaries; all dashboard/calculation code stays real.
vi.mock("./data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./data")>()),
  loadSchoolManifest: vi.fn(),
  loadSchoolDataset: vi.fn(),
}));
vi.mock("echarts", () => ({ init: vi.fn() }));
const datasets = [garak, gangdong, beodeul] as BudgetDataset[];
const entries: SchoolManifestEntry[] = datasets.map(({ summary: s }) => ({
  schoolName: s.schoolName,
  schoolCode: s.schoolCode,
  fiscalYear: s.fiscalYear,
  referenceMonth: s.referenceMonth,
  file: `${s.schoolCode}_2025_202603.json`,
}));
const manifest = [
  ...entries,
  ...Array.from({ length: 1650 }, (_, i) => ({
    ...entries[0],
    schoolCode: `TEST${i}`,
    schoolName: `테스트학교${i}`,
    file: `TEST${i}.json`,
  })),
];
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(init).mockImplementation(() => {
    throw new Error("Canvas unavailable");
  });
  vi.mocked(loadSchoolManifest).mockResolvedValue(manifest);
  vi.mocked(loadSchoolDataset).mockImplementation(async (entry) => {
    const result = datasets.find(
      (d) => d.summary.schoolCode === entry.schoolCode,
    );
    if (!result) throw new Error("Unknown school");
    return result;
  });
});
async function choose(name: string) {
  const user = userEvent.setup();
  const search = await screen.findByRole("combobox", { name: "학교 검색" });
  await user.clear(search);
  await user.type(search, name);
  await user.click(screen.getByRole("option", { name }));
  return user;
}

describe("school analysis selection", () => {
  it("keeps the NEIS school code out of the school search and selected-school display", async () => {
    render(<SchoolAnalysisPage />);

    const search = await screen.findByRole("combobox", { name: "학교 검색" });
    expect(search).toHaveAttribute("placeholder", "학교명 입력");
    expect(screen.getByRole("option", { name: "가락고등학교" })).not.toHaveTextContent("B100000370");
    search.focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(search.getAttribute("aria-activedescendant")).not.toContain("B100000370");

    await choose("가락고등학교");
    expect(await screen.findByRole("heading", { name: "가락고등학교" })).toBeVisible();
    expect(screen.queryByText(/학교코드\s*B100000370/)).not.toBeInTheDocument();
  });

  it("keeps 50 suggestions out of the Tab order and navigates them with a combobox", async () => {
    render(
      <>
        <SchoolAnalysisPage />
        <button>다음 영역</button>
      </>,
    );
    const user = userEvent.setup();
    const input = await screen.findByRole("combobox", { name: "학교 검색" });
    expect(screen.getAllByRole("option")).toHaveLength(50);
    input.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveFocus();
    const second = screen.getByRole("option", { name: "강동중학교" });
    expect(input).toHaveAttribute("aria-activedescendant", second.id);
    expect(second).toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(screen.getByRole("button", { name: "다음 영역" })).toHaveFocus();
    await user.click(input);
    await user.type(input, "가락");
    await user.keyboard("{Escape}");
    expect(input).toHaveValue("가락");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(
      await screen.findByRole("heading", { name: "가락고등학교" }),
    ).toBeVisible();
  });
  it("preserves a single main landmark when embedded in the portal", async () => {
    render(
      <main>
        <SchoolAnalysisPage />
      </main>,
    );
    await screen.findByRole("combobox", { name: "학교 검색" });
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
  it("loads the manifest only, caps matches at 50, then requests just the chosen school", async () => {
    render(<SchoolAnalysisPage />);
    expect(await screen.findByText("1,653개 학교·유치원")).toBeVisible();
    expect(screen.getAllByRole("option")).toHaveLength(50);
    expect(loadSchoolDataset).not.toHaveBeenCalled();
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("combobox", { name: "학교 검색" }),
      "  버들  ",
    );
    expect(
      screen.getByRole("option", { name: "서울버들초등학교" }),
    ).toBeVisible();
    await user.click(screen.getByRole("option", { name: "서울버들초등학교" }));
    expect(
      await screen.findByRole("heading", { name: "서울버들초등학교" }),
    ).toBeVisible();
    expect(loadSchoolDataset).toHaveBeenCalledExactlyOnceWith(entries[2]);
    expect(screen.getByRole("tab", { name: "세출결산" })).toBeVisible();
  });
  it("normalizes decomposed Korean and exact codes, deduplicating school codes", async () => {
    vi.mocked(loadSchoolManifest).mockResolvedValue([...entries, entries[2]]);
    render(<SchoolAnalysisPage />);
    const user = userEvent.setup();
    const search = await screen.findByRole("combobox", { name: "학교 검색" });
    await user.type(search, "버들".normalize("NFD"));
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.clear(search);
    await user.type(search, " b100005384 ");
    expect(
      screen.getByRole("option", { name: "서울버들초등학교" }),
    ).toBeVisible();
    await user.clear(search);
    await user.type(search, "없는학교");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("검색 결과가 없습니다.")).toBeVisible();
  });
  it("offers manifest retry after a network failure", async () => {
    vi.mocked(loadSchoolManifest).mockRejectedValueOnce(
      new Error("학교 목록 오류"),
    );
    render(<SchoolAnalysisPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학교 목록 오류",
    );
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("1,653개 학교·유치원")).toBeVisible();
  });
  it("does not expose a raw English manifest failure", async () => {
    vi.mocked(loadSchoolManifest).mockRejectedValueOnce(
      new TypeError("Failed to fetch"),
    );
    render(<SchoolAnalysisPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학교 목록을 불러오지 못했습니다.",
    );
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });
  it("redacts a NEIS code from a Korean loading error", async () => {
    vi.mocked(loadSchoolManifest).mockRejectedValueOnce(
      new Error("학교 목록 B100000370 오류"),
    );
    render(<SchoolAnalysisPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("B100000370");
    expect(alert).toHaveTextContent("학교 목록 오류");
  });
  it("rejects a dataset for another school instead of displaying its values", async () => {
    vi.mocked(loadSchoolDataset).mockResolvedValueOnce(garak as BudgetDataset);
    render(<SchoolAnalysisPage />);
    await choose("강동중학교");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "선택한 학교·기간과 자료가 일치하지 않습니다.",
    );
    expect(
      screen.queryByRole("region", { name: "결산 핵심 지표" }),
    ).not.toBeInTheDocument();
  });
  it("rejects mismatched detail rows even when the summary belongs to the chosen school", async () => {
    vi.mocked(loadSchoolDataset).mockResolvedValueOnce({
      ...garak,
      expenseRows: gangdong.expenseRows,
    } as BudgetDataset);
    render(<SchoolAnalysisPage />);
    await choose("가락고등학교");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "선택한 학교·기간과 자료가 일치하지 않습니다.",
    );
    expect(
      screen.queryByRole("region", { name: "결산 핵심 지표" }),
    ).not.toBeInTheDocument();
  });
  it("selects schools by keyboard and ignores a stale rejected request", async () => {
    let rejectOld!: (error: Error) => void;
    vi.mocked(loadSchoolDataset).mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectOld = reject;
        }),
    );
    render(<SchoolAnalysisPage />);
    const user = userEvent.setup();
    const search = await screen.findByRole("combobox", { name: "학교 검색" });
    await user.type(search, "가락");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("status")).toHaveTextContent("가락고등학교");
    await choose("강동중학교");
    expect(
      await screen.findByRole("heading", { name: "강동중학교" }),
    ).toBeVisible();
    await act(async () => rejectOld(new Error("늦은 오류")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("keeps the selector usable after a school failure and retries the selected school", async () => {
    vi.mocked(loadSchoolDataset).mockRejectedValueOnce(
      new Error("학교 자료 오류"),
    );
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학교 자료 오류",
    );
    expect(screen.getByRole("combobox", { name: "학교 검색" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("heading", { name: "가락고등학교" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("region", { name: "결산 핵심 지표" })).getByText(
        "2,569,339,810원",
      ),
    ).toBeVisible();
  });
  it("refetches a fulfilled but invalid cached dataset when Retry is pressed", async () => {
    const real = await vi.importActual<typeof import("./data")>("./data");
    real.clearSchoolAnalysisCache();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ...garak, expenseRows: gangdong.expenseRows }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(garak)));
    vi.mocked(loadSchoolDataset).mockImplementation((entry) =>
      real.loadSchoolDataset(entry, fetcher),
    );
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "선택한 학교·기간과 자료가 일치하지 않습니다.",
    );
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("heading", { name: "가락고등학교" }),
    ).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(
      within(screen.getByRole("region", { name: "결산 핵심 지표" })).getByText(
        "2,569,339,810원",
      ),
    ).toBeVisible();
    real.clearSchoolAnalysisCache();
  });
  it("removes previous values immediately and ignores late responses from an older selection", async () => {
    let resolveOld!: (value: BudgetDataset) => void;
    vi.mocked(loadSchoolDataset).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    render(<SchoolAnalysisPage />);
    await choose("가락고등학교");
    await choose("강동중학교");
    expect(
      await screen.findByRole("heading", { name: "강동중학교" }),
    ).toBeVisible();
    await act(async () => resolveOld(garak as BudgetDataset));
    expect(
      screen.queryByRole("heading", { name: "가락고등학교" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("2,569,339,810원")).not.toBeInTheDocument();
    let resolveNext!: (value: BudgetDataset) => void;
    vi.mocked(loadSchoolDataset).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve;
        }),
    );
    await choose("서울버들초등학교");
    expect(
      screen.queryByRole("region", { name: "결산 핵심 지표" }),
    ).not.toBeInTheDocument();
    await act(async () => resolveNext(beodeul as BudgetDataset));
    expect(
      await screen.findByRole("heading", { name: "서울버들초등학교" }),
    ).toBeVisible();
  });
  it("reserves a neutral dashboard layout while switching schools", async () => {
    render(<SchoolAnalysisPage />);
    await choose("가락고등학교");
    expect(
      await screen.findByRole("heading", { name: "가락고등학교" }),
    ).toBeVisible();

    let resolveNext!: (value: BudgetDataset) => void;
    vi.mocked(loadSchoolDataset).mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveNext = resolve;
      }),
    );
    await choose("서울버들초등학교");

    const loadingLayout = screen.getByRole("region", {
      name: "결산자료 불러오는 중",
    });
    expect(loadingLayout).toHaveAttribute("aria-busy", "true");
    expect(within(loadingLayout).getAllByRole("presentation")).toHaveLength(5);
    expect(screen.queryByText("2,569,339,810원")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "가락고등학교" })).not.toBeInTheDocument();

    await act(async () => resolveNext(beodeul as BudgetDataset));
    expect(
      await screen.findByRole("heading", { name: "서울버들초등학교" }),
    ).toBeVisible();
  });
});

describe("complete analysis composition", () => {
  it("scrolls and focuses the analysis panel after drilling from a top item", async () => {
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    await user.click(await screen.findByRole("tab", { name: "세출결산" }));
    const panel = screen.getByRole("tabpanel", { name: "세출결산" });
    const scroll = vi.fn();
    panel.scrollIntoView = scroll;
    await user.click(
      within(
        screen.getByRole("region", { name: "결산액 상위 10개 세부항목" }),
      ).getByRole("button", { name: /급식재료구입비/ }),
    );
    expect(
      screen.getByRole("complementary", { name: "선택 항목" }),
    ).toHaveTextContent("급식재료구입비");
    expect(panel).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  });
  it("converts actual amounts and changes the numeric order rather than only sort labels", async () => {
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    await user.click(await screen.findByRole("tab", { name: "세출결산" }));
    const table = screen.getByRole("table", { name: /현재 단계 분석표/ });
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
      "학생복지/교육격차 해소",
    );
    const welfareRow = within(table).getAllByRole("row")[1];
    expect(within(welfareRow).getByText("1,032,686,790")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("표 단위"), "만원");
    expect(within(welfareRow).getByText("103,268.68")).toBeVisible();
    expect(
      within(welfareRow).queryByText("1,032,686,790"),
    ).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("표 단위"), "억원");
    expect(within(welfareRow).getByTitle("1,032,686,790원")).toHaveTextContent(
      "10.33",
    );
    await user.click(screen.getByRole("button", { name: "결산액 정렬" }));
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(
      "학교 재무활동",
    );
    expect(within(table).getAllByRole("row").at(-1)).toHaveTextContent(
      "학생복지/교육격차 해소",
    );
  });
  it("replaces previous values with distinct selected bundle values and resets drill state", async () => {
    const original = garak as BudgetDataset;
    vi.mocked(loadSchoolDataset).mockResolvedValueOnce({
      ...original,
      expenseRows: [
        ...original.expenseRows,
        ...original.expenseRows.map((row) => ({
          ...row,
          sourceBundleNumber: 2,
          currentBudget: row.currentBudget * 2,
          settlementAmount: row.settlementAmount * 2,
          difference: row.difference * 2,
        })),
      ],
    });
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    await user.click(await screen.findByRole("tab", { name: "세출결산" }));
    let table = screen.getByRole("table", { name: /현재 단계 분석표/ });
    expect(within(table).getByText("1,032,686,790")).toBeVisible();
    await user.click(
      within(table).getByRole("button", {
        name: "학생복지/교육격차 해소 상세 보기",
      }),
    );
    await user.selectOptions(screen.getByLabelText("원문 묶음"), "2");
    table = screen.getByRole("table", { name: /현재 단계 분석표/ });
    expect(within(table).getByText("2,065,373,580")).toBeVisible();
    expect(within(table).queryByText("1,032,686,790")).not.toBeInTheDocument();
    expect(screen.getByText("5,138,679,620원")).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "분석 경로" }),
    ).toHaveTextContent(/^전체$/);
    await user.selectOptions(screen.getByLabelText("원문 묶음"), "1");
    expect(within(table).getByText("1,032,686,790")).toBeVisible();
    expect(within(table).queryByText("2,065,373,580")).not.toBeInTheDocument();
  });
  it("shows school profile, scale, exact summary and keyboard-operable tabs", async () => {
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    expect(
      await screen.findByRole("heading", { name: "학교 규모를 반영한 분석" }),
    ).toBeVisible();
    expect(screen.getByText("757명")).toBeVisible();
    expect(screen.getByText("16,504㎡")).toBeVisible();
    expect(screen.queryByText("건물 연면적")).not.toBeInTheDocument();
    expect(
      screen.queryByText("교사 현황 API는 실 수를 제공하며 건물 연면적은 제공하지 않음"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("원문 대조 및 자료 안내 · 0건"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "결산 총괄 · 단위: 원" }),
    ).toBeVisible();
    const tab = screen.getByRole("tab", { name: "총괄" });
    tab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "세입결산" })).toHaveFocus();
    expect(
      screen.getByRole("heading", { name: "세입 구조 분석" }),
    ).toBeVisible();
    expect(screen.getByText("교육청 재원 의존도")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "트리맵 금액 목록" }),
    ).toBeVisible();
  });
  it("preserves missing summary values without blocking collected income and expense details", async () => {
    render(<SchoolAnalysisPage />);
    const user = await choose("강동중학교");
    expect(screen.getByText("원문 대조 및 자료 안내 · 3건")).toBeVisible();
    expect(
      await screen.findByText("원사이트에서 총괄표를 제공하지 않습니다"),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "세출결산" }));
    expect(screen.getByText("1,769,148,830원")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "핵심 지출 분석" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "경직성 경비" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "결산액 상위 10개 세부항목" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "집행잔액 상위 5개 세부항목" }),
    ).toBeVisible();
  });
  it("drills through accessible data, navigates breadcrumbs, changes units, sorts and selects top items", async () => {
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    await user.click(await screen.findByRole("tab", { name: "세출결산" }));
    const table = screen.getByRole("table", { name: /현재 단계 분석표/ });
    await user.click(
      within(table).getByRole("button", {
        name: "학생복지/교육격차 해소 상세 보기",
      }),
    );
    expect(
      within(screen.getByRole("navigation", { name: "분석 경로" })).getByText(
        "학생복지/교육격차 해소",
      ),
    ).toBeVisible();
    expect(
      within(screen.getByRole("table", { name: /현재 단계 분석표/ })).getByText(
        "급식 관리",
      ),
    ).toBeVisible();
    await user.selectOptions(screen.getByLabelText("표 단위"), "만원");
    expect(
      screen.getByRole("table", { name: "현재 단계 분석표 · 단위 만원" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "결산액 정렬" }));
    expect(
      screen.getByRole("columnheader", { name: /결산액/ }),
    ).toHaveAttribute("aria-sort", "ascending");
    await user.click(screen.getByRole("button", { name: "전체" }));
    const top = screen.getByRole("region", {
      name: "결산액 상위 10개 세부항목",
    });
    await user.click(
      within(top).getByRole("button", { name: /급식재료구입비/ }),
    );
    expect(
      screen.getByRole("complementary", { name: "선택 항목" }),
    ).toHaveTextContent("급식재료구입비");
    await user.click(screen.getByRole("button", { name: "선택 항목 닫기" }));
    expect(
      screen.queryByRole("complementary", { name: "선택 항목" }),
    ).not.toBeInTheDocument();
  });
  it("switches duplicate source bundles without mixing their hierarchy", async () => {
    render(<SchoolAnalysisPage />);
    const user = await choose("서울버들초등학교");
    await user.click(await screen.findByRole("tab", { name: "세출결산" }));
    expect(screen.getByLabelText("원문 묶음")).toHaveValue("1");
    await user.selectOptions(screen.getByLabelText("원문 묶음"), "2");
    expect(screen.getByText(/현재 묶음 2만 분석/)).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "분석 경로" }),
    ).toHaveTextContent("전체");
  });
  it("isolates empty detail data while allowing another tab", async () => {
    vi.mocked(loadSchoolDataset).mockResolvedValueOnce({
      ...garak,
      expenseRows: [],
    } as BudgetDataset);
    render(<SchoolAnalysisPage />);
    const user = await choose("가락고등학교");
    await user.click(await screen.findByRole("tab", { name: "세출결산" }));
    expect(
      screen.getByText("수집된 세출결산 상세자료가 없습니다."),
    ).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "세입결산" }));
    expect(
      screen.getByRole("heading", { name: "세입 구조 분석" }),
    ).toBeVisible();
  });
});

it("retains zero and negative treemap values and keyboard selection when the chart cannot initialize", async () => {
  const select = vi.fn();
  const nodes = [100, 0, -5].map(
    (amount, i): BudgetNode => ({
      id: String(i),
      name: `항목${i}`,
      path: [`항목${i}`],
      hasChildren: false,
      currentBudget: 100,
      settlementAmount: amount,
      difference: 100 - amount,
      sourceDifference: 100 - amount,
      settlementRate: amount,
      share: amount,
      sourceUrl: "https://open.sen.go.kr/",
      sourceRowNumber: i + 1,
    }),
  );
  render(<SchoolTreemap nodes={nodes} onSelect={select} />);
  const list = screen.getByRole("list", { name: "트리맵 금액 목록" });
  expect(within(list).getByText("0원")).toBeVisible();
  expect(within(list).getByText("-5원")).toBeVisible();
  await waitFor(() =>
    expect(screen.getByText(/차트를 표시할 수 없습니다/)).toBeVisible(),
  );
  await userEvent.click(within(list).getByRole("button", { name: /항목2/ }));
  expect(select).toHaveBeenCalledWith(nodes[2]);
});

it("disposes chart and resize subscriptions on unmount and sends canvas clicks through the same selection path", async () => {
  const node: BudgetNode = {
    id: "leaf",
    name: "지출항목",
    path: ["지출항목"],
    hasChildren: false,
    currentBudget: 20,
    settlementAmount: 10,
    difference: 10,
    sourceDifference: 10,
    settlementRate: 50,
    share: 100,
    sourceUrl: "https://open.sen.go.kr/",
    sourceRowNumber: 1,
  };
  let click!: (event: { data: { id: string } }) => void;
  const chart = {
    setOption: vi.fn(),
    on: vi.fn((_type, handler) => {
      click = handler;
    }),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  vi.mocked(init).mockReturnValue(chart as unknown as ReturnType<typeof init>);
  const select = vi.fn();
  const { unmount } = render(
    <SchoolTreemap nodes={[node]} onSelect={select} />,
  );
  await waitFor(() => expect(chart.setOption).toHaveBeenCalled());
  act(() => click({ data: { id: "leaf" } }));
  expect(select).toHaveBeenCalledWith(node);
  act(() => window.dispatchEvent(new Event("resize")));
  expect(chart.resize).toHaveBeenCalledTimes(1);
  unmount();
  expect(chart.dispose).toHaveBeenCalledTimes(1);
  act(() => window.dispatchEvent(new Event("resize")));
  expect(chart.resize).toHaveBeenCalledTimes(1);
});
