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
    expect(screen.getByRole("heading", { name: "독서교육·도서구입" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "자세히 보기" }));
    expect(screen.getByRole("heading", { name: "작성 전에 준비하세요" })).toBeInTheDocument();
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
});
