import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ReferenceSitesPage, type ReferenceSite } from "./ReferenceSitesPage";

const sites: ReferenceSite[] = [
  { id: "sen", title: "서울특별시교육청", category: "교육청", description: "교육 정책과 공지 확인", url: "https://www.sen.go.kr" },
  { id: "work", title: "학교 업무지원", category: "업무지원", description: "학교 업무 참고자료", url: "https://example.com/work" },
];

describe("참고사이트 게시판", () => {
  it("서울시교육청 목적사업비 정산시스템을 교육청 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "서울시교육청 목적사업비 정산시스템 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://mokjeok.sen.go.kr/");
    expect(within(card).getByText("교육청")).toBeVisible();
    expect(within(card).getByText("사이트 바로가기")).toBeVisible();
  });

  it("서울시교육청 예산담당관 부서업무방을 교육청 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "서울시교육청 예산담당관 부서업무방 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://buseo.sen.go.kr/buseo/bu05/user/bbs/BD_selectBbsList.do?q_bbsSn=1199");
    expect(within(card).getByText("교육청")).toBeVisible();
    expect(within(card).getByText("사이트 바로가기")).toBeVisible();
  });

  it("서울시교육청 자치법규 검색을 교육청 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "서울시교육청 자치법규 검색 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://www.sen.go.kr/user/bbs/nowlaw.do");
    expect(within(card).getByText("교육청")).toBeVisible();
    expect(within(card).getByText("사이트 바로가기")).toBeVisible();
    expect(within(card).getByText(/현행 조례·규칙·훈령/)).toBeVisible();
  });

  it("센스쿨을 업무지원 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "센스쿨 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://senedu.kr/");
    expect(within(card).getByText("업무지원")).toBeVisible();
    expect(within(card).getByText("사이트 바로가기")).toBeVisible();
    expect(within(card).getByText("AI 맞춤형 교수·학습 플랫폼으로, 서울시교육청 교직원은 로그인하여 센지피티, 미리캔버스, 캔바 등 교육활동에 필요한 사이트를 이용할 수 있습니다.")).toBeVisible();
  });

  it("공무원연금공단을 업무지원 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "공무원연금공단 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://www.geps.or.kr/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(within(card).getByText("업무지원")).toBeVisible();
    expect(within(card).getByText("공무원 연금·퇴직급여·재해보상·복지서비스와 관련 민원 정보를 확인할 수 있는 공식 사이트입니다.")).toBeVisible();
  });

  it("서울시교육청 전자도서관을 교육청 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "서울시교육청 전자도서관 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://e-lib.sen.go.kr/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(within(card).getByText("교육청")).toBeVisible();
    expect(within(card).getByText("전자책·오디오북·온라인 강좌 등 서울시교육청의 디지털 자료를 이용할 수 있는 전자도서관입니다.")).toBeVisible();
  });

  it("서울시교육청 원격업무지원시스템을 업무지원 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "서울시교육청 원격업무지원시스템(EVPN) 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://evpn.sen.go.kr/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(within(card).getByText("업무지원")).toBeVisible();
    expect(within(card).getByText("서울시교육청 교직원이 외부에서 업무포털·나이스·K-에듀파인 등에 안전하게 접속할 수 있는 원격업무지원시스템입니다.")).toBeVisible();
  });

  it("서울시교육청 계약길잡이와 열린 재정을 교육청 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);

    const contractLink = screen.getByRole("link", { name: "서울시교육청 계약길잡이 바로가기" });
    const contractCard = contractLink.closest("article")!;
    expect(contractLink).toHaveAttribute("href", "https://contract.sen.go.kr/");
    expect(contractLink).toHaveAttribute("target", "_blank");
    expect(within(contractCard).getByText("교육청")).toBeVisible();
    expect(within(contractCard).getByText("서울시교육청의 계약 업무 지침과 관련 자료를 확인할 수 있습니다.")).toBeVisible();

    const financeLink = screen.getByRole("link", { name: "서울시교육청 열린 재정 바로가기" });
    const financeCard = financeLink.closest("article")!;
    expect(financeLink).toHaveAttribute("href", "https://open.sen.go.kr/fus/MI000000000000000509/html/cont0010v.do");
    expect(financeLink).toHaveAttribute("target", "_blank");
    expect(within(financeCard).getByText("교육청")).toBeVisible();
    expect(within(financeCard).getByText("서울교육 재정정보와 예산·결산 자료를 확인할 수 있습니다.")).toBeVisible();
  });

  it("서울교육포털 SSEM 연계자료실을 교육청 링크로 제공한다", () => {
    render(<ReferenceSitesPage />);
    const link = screen.getByRole("link", { name: "서울교육포털(SSEM) 바로가기" });
    const card = link.closest("article")!;

    expect(link).toHaveAttribute("href", "https://www.ssem.or.kr/api/intergrated/tutHpDta/metaSearch/apiBbs/apiBbsList.do?bbsSn=1216");
    expect(within(card).getByText("교육청")).toBeVisible();
    expect(within(card).getByText("사이트 바로가기")).toBeVisible();
    expect(within(card).getByText("서울시교육청 연구정보원에서 만든 사이트로, 서울시교육청 홈페이지와 연동되어 자동으로 업데이트되는 연계자료실을 포함합니다.")).toBeVisible();
  });

  it("유튜브 영상은 참고사이트 목록에 중복해서 표시하지 않는다", () => {
    render(<ReferenceSitesPage />);

    expect(screen.queryByText("[학교회계 - 예산관리] 1장 예산관리개요")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /미리보기/ })).not.toBeInTheDocument();
  });

  it("등록된 링크를 검색하고 분야별로 골라 외부 사이트를 연다", async () => {
    const user = userEvent.setup();
    render(<ReferenceSitesPage sites={sites} />);

    expect(screen.getByRole("heading", { name: "참고사이트" })).toBeVisible();
    await user.type(screen.getByRole("searchbox", { name: "참고사이트 검색" }), "서울");
    expect(screen.getByRole("link", { name: "서울특별시교육청 바로가기" })).toHaveAttribute("href", "https://www.sen.go.kr");
    expect(screen.queryByText("학교 업무지원")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "참고사이트 검색" }));
    await user.click(screen.getByRole("button", { name: "업무지원" }));
    expect(screen.getByText("학교 업무지원")).toBeVisible();
    expect(screen.queryByText("서울특별시교육청")).not.toBeInTheDocument();
  });

  it("등록된 링크가 없으면 추가 예정 안내를 보여준다", () => {
    render(<ReferenceSitesPage sites={[]} />);
    expect(screen.getByText("등록된 참고사이트가 없습니다.")).toBeVisible();
    expect(screen.getByText("링크를 알려주시면 확인 후 게시판에 반영합니다.")).toBeVisible();
  });
});
