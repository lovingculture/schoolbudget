import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PREBUDGET_EXAMPLES } from "./data";
import { PrebudgetExampleLibrary } from "./PrebudgetExampleLibrary";
import { PrebudgetFundingGuide } from "./PrebudgetFundingGuide";

describe("초보자용 성립전예산 예시 화면", () => {
  it("쉬운 질문으로 목적사업비와 잘 모르겠어요를 선택한다", async () => {
    const onSelect = vi.fn(); const onUnsure = vi.fn(); const user = userEvent.setup();
    render(<PrebudgetFundingGuide onSelect={onSelect} onUnsure={onUnsure} />);
    await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
    expect(onSelect).toHaveBeenCalledWith("목적사업비");
    await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));
    expect(onUnsure).toHaveBeenCalled();
  });

  it("목적사업비 10건에서 쉬운 검색어로 예시를 찾고 상세를 연다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="목적사업비" onUseExample={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText("10건")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "책");
    const readingCard = screen.getByRole("heading", { name: "독서교육·도서구입" }).closest("article")!;
    await user.click(within(readingCard).getByRole("button", { name: "자세히 보기" }));
    expect(screen.getByRole("heading", { name: "작성 전에 준비하세요" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "세부사업", "세부항목", "원가통계비목", "산출내역", "산출식", "요구금액",
    ]);
    expect(screen.getByRole("button", { name: "이 예시로 작성하기" })).toBeInTheDocument();
  });

  it("예시 목록과 상세 미리보기를 명확한 영역으로 제공한다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="전체" onUseExample={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByRole("region", { name: "성립전예산 예시 찾기" })).toHaveClass("prebudget-example-library");
    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "돌봄");
    await user.click(screen.getAllByRole("button", { name: "자세히 보기" })[0]);
    expect(screen.getByRole("button", { name: "이 예시로 작성하기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "다른 예시 보기" })).toBeVisible();
  });

  it("재원 안내의 네 선택지를 목록 구조로 제공한다", () => {
    render(<PrebudgetFundingGuide onSelect={vi.fn()} onUnsure={vi.fn()} />);
    expect(screen.getByRole("list").children).toHaveLength(4);
  });

  it("각 재원 카드에 번호가 있는 제목과 요청한 설명 및 예시를 보여준다", () => {
    render(<PrebudgetFundingGuide onSelect={vi.fn()} onUnsure={vi.fn()} />);

    const purpose = screen.getByRole("button", { name: "교육청·교육지원청에서 특정 사업을 위해 받았어요" });
    expect(within(purpose).getByText("① 목적사업비")).toBeVisible();
    expect(within(purpose).getByText("교부공문에 사용 목적이 정해진 사업비예요.")).toBeVisible();
    expect(within(purpose).getByText("예시) 돌봄교실운영비, 방과후교실사업비, 기초학력책임지도예산 등")).toBeVisible();

    const subsidy = screen.getByRole("button", { name: "구청이나 지방자치단체에서 지원받았어요" });
    expect(within(subsidy).getByText("② 보조금")).toBeVisible();
    expect(within(subsidy).getByText("예시) 치아건강사업, 새내기학습준비지원, 예체능교육지원 등")).toBeVisible();

    const beneficiary = screen.getByRole("button", { name: "학부모가 비용의 전부 또는 일부를 부담해요" });
    expect(within(beneficiary).getByText("③ 수익자부담경비")).toBeVisible();
    expect(within(beneficiary).getByText("예시) 현장학습비, 졸업앨범비, 돌봄중식비 등")).toBeVisible();
    expect(within(beneficiary).queryByText("가정통신문과 징수계획에 따라 모으는 경비예요.")).not.toBeInTheDocument();
  });

  it("잘 모르겠어요 카드에는 재원 안내 문구를 표시하지 않는다", () => {
    render(<PrebudgetFundingGuide onSelect={vi.fn()} onUnsure={vi.fn()} />);
    const unsure = screen.getByRole("button", { name: "잘 모르겠어요" });
    expect(within(unsure).getByText("④ 잘 모르겠어요")).toBeVisible();
    expect(within(unsure).getByText("공문 발신기관(교육지원청 초등교육과, 구청 교육지원과 등)을 확인해보세요.")).toBeVisible();
    expect(within(unsure).queryByText("재원 안내")).not.toBeInTheDocument();
  });

  it("잘 모르겠어요 안내 문구를 다른 카드의 예시와 같은 강조 스타일로 표시한다", () => {
    render(<PrebudgetFundingGuide onSelect={vi.fn()} onUnsure={vi.fn()} />);
    const unsure = screen.getByRole("button", { name: "잘 모르겠어요" });
    expect(within(unsure).getByText(/공문 발신기관/)).toHaveClass("prebudget-guide-card-examples");
  });

  it("예시 찾기의 모든 동작 버튼을 역할별 전용 스타일로 표시한다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="전체" onUseExample={vi.fn()} onBack={vi.fn()} />);

    expect(screen.getByRole("button", { name: "재원 다시 선택" })).toHaveClass("prebudget-example-back");
    expect(screen.getByRole("button", { name: "초기화" })).toHaveClass("prebudget-example-reset");
    for (const button of screen.getAllByRole("button", { name: "자세히 보기" })) {
      expect(button).toHaveClass("prebudget-example-detail-button");
    }

    await user.click(screen.getAllByRole("button", { name: "자세히 보기" })[0]);
    expect(screen.getByRole("button", { name: "다른 예시 보기" })).toHaveClass("prebudget-example-back");
    expect(screen.getByRole("button", { name: "이 예시로 작성하기" })).toHaveClass("prebudget-example-use");
  });

  it("단위학교 기초학력 책임지도 예시에 교부 기준과 5개 편성항목을 보여준다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="목적사업비" onUseExample={vi.fn()} onBack={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "기초학력");
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));

    expect(screen.getByRole("heading", { name: "단위학교 기초학력 책임지도" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "작성 전에 확인하세요" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "대표 편성항목(예시)" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "세부항목" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "산출식" })).toBeVisible();
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getByText("288,000원 × 2회")).toBeVisible();
    expect(screen.getByText("15,000,000원")).toBeVisible();
    expect(screen.getByText(/해당 교부공문의 편성기준에 따라 달라질 수 있습니다/)).toBeVisible();
    expect(screen.getByText(/단위학교 기초학력 책임지도 사업비를 교부 목적 및 예산 편성기준에 따라/)).toBeVisible();
    expect(screen.getByText(/원가통계비목이 적절하게 선택되었는지/)).toBeVisible();
  });

  it("졸업앨범비 예시에 학부모 부담 기준과 100부 산출식을 보여준다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="수익자부담금" onUseExample={vi.fn()} onBack={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "졸업앨범비");
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));

    expect(screen.getByText("졸업앨범비를 학부모 부담 경비로 걷는 경우")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "작성 전에 준비하세요" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "세부항목" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "산출식" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "요구금액" })).toBeVisible();
    expect(screen.getByText("학생복지비")).toBeVisible();
    expect(screen.getByText("졸업앨범비 구입")).toBeVisible();
    expect(screen.getByText("졸업앨범 제작")).toBeVisible();
    expect(screen.getByText("70,000원 × 100부")).toBeVisible();
    expect(screen.getByText("7,000,000원")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "기안문 미리보기" })).not.toBeInTheDocument();
    expect(screen.queryByText("졸업앨범비 사업비를 교부 목적과 산출근거에 따라 성립전예산으로 편성합니다.")).not.toBeInTheDocument();
    expect(screen.getByText("학생수 및 졸업앨범비 단가를 확인하세요.")).toBeVisible();
  });

  it("교육경비보조금 진로교육 활성화 예시에 4개 항목과 합계를 보여준다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="구청보조금" onUseExample={vi.fn()} onBack={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "진로교육 활성화");
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));

    expect(screen.getByRole("heading", { name: "진로교육 활성화" })).toBeVisible();
    expect(screen.getAllByText("(보조금)진로교육 활성화사업 지원")).toHaveLength(4);
    expect(screen.getByText("(보조)교재교구비 및 예비비")).toBeVisible();
    expect(screen.getAllByText("35,000원 × 180회")).toHaveLength(3);
    expect(screen.getByText("20,000,000원")).toBeVisible();
  });

  it("영어체험학습 예시에 미래글로벌체험센터 2개 항목과 합계를 보여준다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="구청보조금" onUseExample={vi.fn()} onBack={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "영어체험학습");
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));

    expect(screen.getByRole("heading", { name: "영어체험학습" })).toBeVisible();
    expect(screen.getAllByText("(보조)미래글로벌체험센터 초등 영어체험학습")).toHaveLength(2);
    expect(screen.getByText("(보조)미래글로벌체험센터 초등 영어체험학습 교통비")).toBeVisible();
    expect(screen.getByText("500,000원 × 4학급")).toBeVisible();
    expect(screen.getByText("10,000원 × 100명")).toBeVisible();
    expect(screen.getByText("3,000,000원")).toBeVisible();
    expect(screen.queryByText(/용답/)).not.toBeInTheDocument();
  });

  it("독서교육 및 교육과정 교구 구입 예시에 3개 항목과 합계를 보여준다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="구청보조금" onUseExample={vi.fn()} onBack={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "독서교육 및 교육과정 교구 구입");
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));

    expect(screen.getByRole("heading", { name: "독서교육 및 교육과정 교구 구입" })).toBeVisible();
    expect(screen.getAllByText("(보조금)책향성독서교육")).toHaveLength(3);
    expect(screen.getByText("(보조)1~4학년 교육과정 교구구입")).toBeVisible();
    expect(screen.getByText("1,500,000원 × 4개 학년")).toBeVisible();
    expect(screen.getByText("(보조)운정 북클럽 운영비")).toBeVisible();
    expect(screen.getByText("7,300,000원")).toBeVisible();
  });

  it("방과후학교 수강료 예시에 레고교실 3개 항목과 합계를 보여준다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="수익자부담금" onUseExample={vi.fn()} onBack={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "방과후학교 수강료");
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));

    expect(screen.getByText("운영수당")).toBeVisible();
    expect(screen.getByText("레고교실 강사료")).toBeVisible();
    expect(screen.getByText("30,000원 × 20명")).toBeVisible();
    expect(screen.getByText("일반수용비")).toBeVisible();
    expect(screen.getByText("레고교실 수용비")).toBeVisible();
    expect(screen.getByText("1,500원 × 20명")).toBeVisible();
    expect(screen.getByText("교육운영비")).toBeVisible();
    expect(screen.getByText("레고교실 교재교구구입")).toBeVisible();
    expect(screen.getByText("10,000원 × 20명")).toBeVisible();
    expect(screen.getByText("830,000원")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "기안문 미리보기" })).not.toBeInTheDocument();
    expect(screen.queryByText("방과후학교 수강료 사업비를 교부 목적과 산출근거에 따라 성립전예산으로 편성합니다.")).not.toBeInTheDocument();
    expect(screen.queryByText("교부금액과 편성금액 일치 여부 확인")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "복사 전 꼭 확인하세요" })).not.toBeInTheDocument();
  });

  it("현장체험학습비 예시에 5학년 편성항목과 차감 산출식을 보여준다", async () => {
    const user = userEvent.setup();
    render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="수익자부담금" onUseExample={vi.fn()} onBack={vi.fn()} />);

    await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "현장체험학습비");
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));

    expect(screen.getAllByText("(수) 5학년 현장체험학습")).toHaveLength(3);
    expect(screen.getByText("(수) 교통비")).toBeVisible();
    expect(screen.getByText("32,900원 × 115명")).toBeVisible();
    expect(screen.getByText("(수) 점심식사비")).toBeVisible();
    expect(screen.getByText("9,500원 × 115명")).toBeVisible();
    expect(screen.getByText("(수) 체험활동비")).toBeVisible();
    expect(screen.getByText("2,500원 × 115명 - 1,000원")).toBeVisible();
    expect(screen.getByText("5,164,000원")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "기안문 미리보기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "복사 전 꼭 확인하세요" })).not.toBeInTheDocument();
    expect(screen.queryByText("현장체험학습비 사업비를 교부 목적과 산출근거에 따라 성립전예산으로 편성합니다.")).not.toBeInTheDocument();
  });
});
