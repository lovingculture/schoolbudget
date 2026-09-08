import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { kakaoOAuthOptions, LoginPage, Portal, resolveKakaoAuthEnabled, SchoolSetupPage } from "./App";

describe("예산업무 포털", () => {
  it("인증 설정이 없으면 로그인 모드를 사용하고 false를 명시한 개발 환경에서만 데모 모드를 사용한다", () => {
    expect(resolveKakaoAuthEnabled(undefined)).toBe(false);
    expect(resolveKakaoAuthEnabled("true")).toBe(true);
    expect(resolveKakaoAuthEnabled("false")).toBe(false);
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
    expect(screen.getAllByTestId("budget-step")).toHaveLength(8);
    expect(screen.getByRole("button", { name: "성립전예산 새로 작성" })).toBeVisible();
  });

  it("성립전예산의 이전 화면은 홈이 아니라 바로 앞 작성 단계로 돌아간다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);

    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));
    await user.click(screen.getByRole("button", { name: "예시에서 시작하기" }));
    expect(screen.getByRole("heading", { name: "이 사업비는 어디에서 받았나요?" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "이전 화면" }));

    expect(screen.getByRole("heading", { name: "기본정보" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "예산업무, 흐름부터 문서까지 한곳에서" })).not.toBeInTheDocument();
  });

  it("홈에서 성립전예산의 Word와 PDF 출력만 안내한다", () => {
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" onLogout={() => {}} />);
    const guidance = screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "지침을 확인하고 성립전예산 요구서를 작성하면 기안문과 Word·PDF가 자동으로 완성됩니다.");
    expect(guidance).toBeVisible();
    expect(guidance).not.toHaveTextContent("Excel");
  });

  it("모든 업무 페이지 하단에 학교 자료 보안 안내를 표시한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" onLogout={() => {}} />);

    expect(screen.getByText("학교 자료는 안전하게")).toBeVisible();
    expect(screen.getByText("선택한 파일은 이 브라우저에서만 처리되며 서버에 업로드하거나 저장하지 않습니다.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));
    expect(screen.getAllByText("학교 자료는 안전하게")).toHaveLength(1);
    expect(screen.getAllByText("선택한 파일은 이 브라우저에서만 처리되며 서버에 업로드하거나 저장하지 않습니다.")).toHaveLength(1);
  });

  it("공개 포털은 로그인 화면 없이 열리고 자료실 관리자 기능에서만 로그인을 요청한다", async () => {
    const user = userEvent.setup();
    let loginRequested = false;
    render(
      <Portal
        displayName="예산담당자"
        schoolName="○○초등학교"
        onAdminLogin={() => { loginRequested = true; }}
      />,
    );

    expect(screen.queryByRole("button", { name: "카카오로 시작하기" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "예산 자료실" }));
    await user.click(screen.getByRole("button", { name: "관리자 로그인" }));
    expect(loginRequested).toBe(true);
  });

  it("성립전예산 기본정보에서 학교명을 요구하지 않는다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="예산담당자" schoolName="" />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));
    expect(screen.queryByLabelText("학교명")).not.toBeInTheDocument();
    expect(screen.getByLabelText("문서 제목")).toHaveValue("");
    expect(screen.getByLabelText("문서 제목")).toHaveAttribute("placeholder", "안전인력봉사비 성립전예산 편성 요청");
  });

  it("성립전예산 입력 금액의 합계를 계산한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" onLogout={() => {}} />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));
    const prices = screen.getAllByLabelText("단가");
    const quantities = screen.getAllByLabelText("수량(명)");
    const counts = screen.getAllByLabelText("횟수");
    await user.clear(prices[0]); await user.type(prices[0], "30000");
    await user.clear(quantities[0]); await user.type(quantities[0], "10");
    await user.clear(counts[0]); await user.type(counts[0], "1");
    expect(screen.getAllByText("300,000원")).toHaveLength(3);
  });

  it("단위사업에 맞는 세부사업만 선택하고 단위사업 변경 시 초기화한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

    const unitSelect = screen.getAllByLabelText("단위사업")[0];
    expect(screen.getAllByLabelText("세부사업")[0]).toBeDisabled();

    await user.selectOptions(unitSelect, "교과 활동");
    const detailSelect = screen.getAllByLabelText("세부사업")[0];
    expect(detailSelect).toBeEnabled();
    expect(screen.getAllByRole("option", { name: "수학 교과활동" })).toHaveLength(1);
    expect(screen.queryByRole("option", { name: "학교급식운영" })).not.toBeInTheDocument();

    await user.selectOptions(detailSelect, "수학 교과활동");
    expect(detailSelect).toHaveValue("수학 교과활동");
    await user.selectOptions(screen.getAllByLabelText("단위사업")[0], "급식 관리");
    expect(screen.getAllByLabelText("세부사업")[0]).toHaveValue("");
    expect(screen.getAllByRole("option", { name: "학교급식운영" })).toHaveLength(1);
    expect(screen.queryByRole("option", { name: "수학 교과활동" })).not.toBeInTheDocument();
  });

  it("검색한 세부사업을 선택하면 연결된 단위사업을 자동으로 설정한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

    const business = screen.getAllByLabelText("세부사업 검색")[0];
    await user.type(business, "학교급식운영");

    expect(screen.getAllByLabelText("단위사업")[0]).toHaveValue("급식 관리");
    expect(business).toHaveValue("학교급식운영");
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
    await user.click(screen.getByRole("button", { name: "이 사업에 산출 항목 추가" }));
    const helps = screen.getAllByLabelText("비목 설명");
    expect(helps).toHaveLength(helpCountBeforeAdd + 1);
    expect(helps[0]).toHaveTextContent("공무원이 아닌 기간의 정함이 없는 근로계약");
    expect(helps.at(-1)).toHaveTextContent("학교 운영에 소요되는 일반적인 경비");
  });

  it("본예산 메뉴에서 업무추진비 3% 편성 확인 화면을 연다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "예산 업무" }));
    expect(screen.getByRole("button", { name: "안건설명서 만들기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "결산 설명서 만들기" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "추경예산자료 만들기" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "예산 편성 확인 (업무추진비 3% 편성 확인)" }));
    expect(screen.getByRole("heading", { name: "예산 편성 확인 (업무추진비 3% 편성 확인)" })).toBeVisible();
    expect(screen.getByText("본예산서를 불러오면 세입 기준금액과 일반업무추진비 편성 비율을 자동으로 계산합니다.")).toBeVisible();
  });

  it("예산안건 설명서 메뉴에서 총괄표 불러오기 기능을 연다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "예산 업무" }));
    await user.click(screen.getByRole("button", { name: "안건설명서 만들기" }));
    expect(screen.getByRole("button", { name: "세입세출총괄표 불러오기" })).toBeVisible();
  });

  it("예산 업무 메뉴에서 본예산 편성 기초자료 만들기를 연다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "예산 업무" }));
    await user.click(screen.getByRole("button", { name: "본예산 편성 기초자료 만들기" }));
    expect(screen.getByRole("heading", { name: "본예산 편성 기초자료 만들기" })).toBeVisible();
    expect(screen.getByLabelText("세입·세출예산서 Excel 파일 선택")).toBeVisible();
  });

  it("예산 업무 메뉴가 모든 기존 업무 화면으로 이동한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);

    const destinations = [
      ["성립전예산요구서작성(사업담당자용)", "성립전예산 요구서 작성"],
      ["예산 편성 확인 (업무추진비 3% 편성 확인)", "예산 편성 확인 (업무추진비 3% 편성 확인)"],
      ["안건설명서 만들기", "예산 안건설명서 자동작성"],
      ["결산 설명서 만들기", "결산 안건설명서 자동작성"],
      ["추경예산자료 만들기", "집행실적으로 추경자료 만들기"],
    ] as const;

    for (const [label, heading] of destinations) {
      await user.click(screen.getByRole("button", { name: "예산 업무" }));
      await user.click(screen.getByRole("button", { name: label }));
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    }

    await user.click(screen.getByRole("button", { name: "예산 업무" }));
    expect(screen.queryByRole("button", { name: "학교 설정" })).not.toBeInTheDocument();
  });

  it("예산 자료실 상단 메뉴가 지침 검색과 자료 다운로드를 제공한다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);

    await user.click(screen.getByRole("button", { name: "예산 자료실" }));

    expect(screen.getByRole("heading", { name: "예산 자료실" })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "예산편성지침 검색" })).toBeVisible();
  });

  it("관리자는 예산 자료실에서 자료 등록을 볼 수 있다", async () => {
    const user = userEvent.setup();
    render(
      <Portal
        displayName="김담당"
        schoolName="서울한빛초등학교"
        userId="authenticated-user-id"
        isAdmin
      />,
    );

    await user.click(screen.getByRole("button", { name: "예산 자료실" }));

    expect(screen.getByRole("button", { name: "자료 등록" })).toBeVisible();
  });

  it("동영상 안내 상단 메뉴가 접근 가능한 안내 화면을 연다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);

    await user.click(screen.getByRole("button", { name: "동영상 안내" }));

    expect(screen.getByRole("heading", { name: "동영상 안내" })).toBeVisible();
    expect(screen.getByRole("link", { name: /본예산편성.*유튜브에서 보기/ })).toBeVisible();
  });

  it("예산 웹툰 상단 메뉴에서 여섯 회차의 목록을 연다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);

    await user.click(screen.getByRole("button", { name: "예산 웹툰" }));

    expect(screen.getByRole("heading", { name: "예산 웹툰" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /화 .* 읽어보기/ })).toHaveLength(6);
  });

  it("이용안내에서 연 모든 업무 화면은 이용안내 목록으로 돌아갈 수 있다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "학교예산 한눈에 이용 안내 확인" }));

    const destinations = [
      "예산 자료실로 이동",
      "성립전예산 작성으로 이동",
      "예산 편성 확인 (업무추진비 3% 편성 확인)으로 이동",
      "본예산 편성 기초자료 만들기로 이동",
      "예산안건 설명서로 이동",
      "결산 설명서로 이동",
      "추경예산자료로 이동",
    ];

    for (const destination of destinations) {
      await user.click(screen.getByRole("button", { name: destination }));
      expect(screen.getByRole("button", { name: "이전 화면" })).toBeVisible();
      await user.click(screen.getByRole("button", { name: "이용안내 목록으로" }));
      expect(screen.getByRole("heading", { name: "학교예산 한눈에 이용 안내" })).toBeVisible();
    }
  });

  it("업무 화면의 이전 화면 버튼은 직전에 보던 이용안내로 돌아간다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "학교예산 한눈에 이용 안내 확인" }));
    expect(screen.getByRole("button", { name: "홈으로" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "결산 설명서로 이동" }));

    await user.click(screen.getByRole("button", { name: "이전 화면" }));

    expect(screen.getByRole("heading", { name: "학교예산 한눈에 이용 안내" })).toBeVisible();
  });

  it("업무 화면 이동 버튼은 왼쪽에 배치되고 스크롤을 따라오지 않는다", async () => {
    const user = userEvent.setup();
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    await user.click(screen.getByRole("button", { name: "학교예산 한눈에 이용 안내 확인" }));
    await user.click(screen.getByRole("button", { name: "결산 설명서로 이동" }));

    const navigation = screen.getByRole("navigation", { name: "페이지 이동" });
    expect(getComputedStyle(navigation).position).toBe("static");
    expect(getComputedStyle(navigation).justifyContent).toBe("flex-start");
  });

  it("통합검색 준비 중 메뉴를 표시하지 않는다", () => {
    render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
    expect(screen.queryByRole("button", { name: "통합검색 준비 중" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "통합검색 준비 중" })).not.toBeInTheDocument();
  });
});
