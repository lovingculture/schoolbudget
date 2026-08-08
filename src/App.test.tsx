import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App, { kakaoOAuthOptions, LoginPage, Portal, SchoolSetupPage } from "./App";

describe("예산업무 포털", () => {
  it("카카오 연결 보류 중에는 웹페이지를 바로 보여준다", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "예산업무, 흐름부터 문서까지 한곳에서" })).toBeVisible();
  });

  it("일반 카카오 앱에서는 이메일을 제외한 동의항목만 요청한다", () => {
    expect(kakaoOAuthOptions("https://school-budget-portal.vercel.app")).toEqual({
      redirectTo: "https://school-budget-portal.vercel.app",
      scopes: "profile_nickname profile_image",
    });
  });

  it("로그인 전에는 카카오 시작 버튼을 제공한다", async () => {
    const user = userEvent.setup();
    let called = false;
    render(<LoginPage onLogin={() => { called = true; }} busy={false} error="" />);
    await user.click(screen.getByRole("button", { name: "카카오로 시작하기" }));
    expect(called).toBe(true);
  });

  it("첫 로그인 사용자는 학교를 직접 등록할 수 있다", async () => {
    const user = userEvent.setup();
    let submitted = "";
    render(<SchoolSetupPage displayName="문화사랑" onSubmit={async (name) => { submitted = name; }} busy={false} error="" />);
    await user.type(screen.getByLabelText("학교명"), "서울한빛초등학교");
    await user.click(screen.getByRole("button", { name: "학교 등록하고 시작하기" }));
    expect(submitted).toBe("서울한빛초등학교");
  });

  it("홈에서 예산업무 흐름과 성립전예산 바로가기를 제공한다", () => {
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" onLogout={() => {}} />);
    expect(screen.getByRole("heading", { name: "예산업무, 흐름부터 문서까지 한곳에서" })).toBeVisible();
    expect(screen.getAllByTestId("budget-step")).toHaveLength(7);
    expect(screen.getByRole("button", { name: "성립전예산 새로 작성" })).toBeVisible();
  });

  it("홈에서 성립전예산의 Word와 PDF 출력만 안내한다", () => {
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" onLogout={() => {}} />);
    const guidance = screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "지침을 확인하고 성립전예산 요구서를 작성하면기안문과 Word·PDF가 자동으로 완성됩니다.");
    expect(guidance).toBeVisible();
    expect(guidance).not.toHaveTextContent("Excel");
  });

  it("성립전예산 입력 금액의 합계를 계산한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" onLogout={() => {}} />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));
    const prices = screen.getAllByLabelText("단가");
    const quantities = screen.getAllByLabelText("수량");
    const counts = screen.getAllByLabelText("횟수");
    await user.clear(prices[0]); await user.type(prices[0], "30000");
    await user.clear(quantities[0]); await user.type(quantities[0], "10");
    await user.clear(counts[0]); await user.type(counts[0], "1");
    expect(screen.getAllByText("300,000원")).toHaveLength(2);
  });

  it("단위사업에 맞는 세부사업만 선택하고 단위사업 변경 시 초기화한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

    const unitSelect = screen.getAllByLabelText("단위사업")[0];
    const detailSelect = screen.getAllByLabelText("세부사업")[0];
    expect(detailSelect).toBeDisabled();

    await user.selectOptions(unitSelect, "교과 활동");
    expect(detailSelect).toBeEnabled();
    expect(screen.getAllByRole("option", { name: "수학 교과활동" })).toHaveLength(1);
    expect(screen.queryByRole("option", { name: "학교급식운영" })).not.toBeInTheDocument();

    await user.selectOptions(detailSelect, "수학 교과활동");
    expect(detailSelect).toHaveValue("수학 교과활동");
    await user.selectOptions(unitSelect, "급식 관리");
    expect(detailSelect).toHaveValue("");
    expect(screen.getAllByRole("option", { name: "학교급식운영" })).toHaveLength(1);
    expect(screen.queryByRole("option", { name: "수학 교과활동" })).not.toBeInTheDocument();
  });

  it("재원구분 세 항목을 지정된 순서로 표시하고 목적사업비를 기본 선택한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

    const sourceSelect = screen.getByLabelText("재원구분");
    expect(sourceSelect).toHaveValue("목적사업비(교육청)");
    expect(
      within(sourceSelect)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "보조금(구청)",
      "목적사업비(교육청)",
      "수익자부담경비(학부모)",
    ]);
    expect(screen.queryByLabelText("재원")).not.toBeInTheDocument();
    expect(within(sourceSelect).queryByRole("option", { name: "교육청" })).not.toBeInTheDocument();
    expect(within(sourceSelect).queryByRole("option", { name: "서울시" })).not.toBeInTheDocument();
    expect(within(sourceSelect).queryByRole("option", { name: "자치구" })).not.toBeInTheDocument();
    expect(within(sourceSelect).queryByRole("option", { name: "기타" })).not.toBeInTheDocument();
  });

  it("원가통계비목 20개를 표시하고 일반수용비를 기본 선택한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

    const categorySelect = screen.getAllByLabelText("원가통계비목")[0];
    const categoryOptions = within(categorySelect);
    expect(categorySelect).toHaveValue("일반수용비");
    expect(categoryOptions.getAllByRole("option")).toHaveLength(20);
    expect(categoryOptions.getByRole("option", { name: "공무직인건비" })).toBeVisible();
    expect(screen.queryByRole("option", { name: "일반업무추진비" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "기간제직원인건비" })).not.toBeInTheDocument();
  });

  it("원가통계비목 선택에 맞는 전체 설명을 각 항목에 표시한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

    const firstCategory = screen.getAllByLabelText("원가통계비목")[0];
    const firstHelp = screen.getAllByLabelText("비목 설명")[0];
    expect(firstHelp).toHaveTextContent(
      "학교 운영에 소요되는 일반적인 경비",
    );

    await user.selectOptions(firstCategory, "공무직인건비");
    expect(firstHelp).toHaveTextContent(
      "공무원이 아닌 기간의 정함이 없는 근로계약을 체결한 근로자 인건비",
    );

    const helpCountBeforeAdd = screen.getAllByLabelText("비목 설명").length;
    await user.click(screen.getByRole("button", { name: "항목 추가" }));
    const helps = screen.getAllByLabelText("비목 설명");
    expect(helps).toHaveLength(helpCountBeforeAdd + 1);
    expect(helps[0]).toHaveTextContent("공무원이 아닌 기간의 정함이 없는 근로계약");
    expect(helps.at(-1)).toHaveTextContent("학교 운영에 소요되는 일반적인 경비");
  });

  it("완성된 메뉴의 준비 중 표시를 지우고 추경자료 메뉴를 제공한다", () => {
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    expect(screen.getByRole("button", { name: /본예산 준비 중/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "예산안건 설명서" })).toBeVisible();
    expect(screen.getByRole("button", { name: "결산설명서" })).toBeVisible();
    expect(screen.getByRole("button", { name: "집행실적으로 추경자료 만들기" })).toBeVisible();
  });

  it("예산안건 설명서 메뉴에서 총괄표 불러오기 기능을 연다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "예산안건 설명서" }));
    expect(screen.getByRole("button", { name: "세입세출총괄표 불러오기" })).toBeVisible();
  });
});
