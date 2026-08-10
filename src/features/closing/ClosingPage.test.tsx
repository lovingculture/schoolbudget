import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { ClosingPage } from "./ClosingPage";

function createValidClosingXlsx() {
  const rows: unknown[][] = Array.from({ length: 30 }, () => Array(24).fill(""));
  rows[0][8] = "2025년도 학교회계 결산총괄표";
  rows[3][0] = "예산액"; rows[3][3] = "예산현액"; rows[3][6] = "세입결산액(A)"; rows[3][10] = "세출결산액(B)"; rows[3][14] = "세계잉여금(A-B)";
  rows[4][0] = "2,727,447,000"; rows[4][3] = "2,730,444,440"; rows[4][6] = "2,724,818,217"; rows[4][10] = "2,698,568,069"; rows[4][14] = "26,250,148";
  rows[6][15] = "보조금반환\n확정액"; rows[6][20] = "순세계잉여금";
  rows[7][4] = "명시"; rows[7][8] = "사고"; rows[7][11] = "계속비";
  rows[8][4] = "4,466,880"; rows[8][8] = "0"; rows[8][11] = "0"; rows[8][15] = "0"; rows[8][20] = "15,000,000"; rows[8][21] = "6,783,268"; rows[8][23] = "21,783,268";
  rows[11][0] = "장"; rows[11][6] = "관"; rows[11][16] = "결산액";
  rows[12][0] = "이전수입"; rows[12][6] = "지방교육행정기관이전수입"; rows[12][16] = "2,724,818,217";
  rows[13][0] = "합계";
  rows[21][0] = "정책사업"; rows[21][16] = "결산액";
  rows[22][0] = "학교 일반운영"; rows[22][16] = "2,698,568,069";
  rows[23][0] = "합계";
  rows[24][19] = "서울특별시교육청 서울옥정초등학교";
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  return XLSX.write(
    { SheetNames: ["세입세출결산총괄표"], Sheets: { 세입세출결산총괄표: sheet } },
    { type: "array", bookType: "xlsx" },
  ) as ArrayBuffer;
}

function fileWithArrayBuffer(name: string, data: ArrayBuffer) {
  const file = new File([new Uint8Array(data)], name);
  Object.defineProperty(file, "arrayBuffer", { value: async () => data });
  return file;
}

describe("결산설명서 업로드 화면", () => {
  it("에듀파인 다운로드 경로와 두 가지 업로드 방법을 안내한다", () => {
    render(<ClosingPage />);
    expect(screen.getByText(/세입세출결산총괄표.*끌어다 놓으세요/)).toBeVisible();
    expect(screen.getByText(/학교회계 → 예산결산 → 결산서 → 결산서 일괄 출력/)).toBeVisible();
    expect(screen.getByRole("button", { name: "파일 선택" })).toBeVisible();
    expect(screen.getByText(/지원 파일.*\.xls.*\.xlsx/)).toBeVisible();
  });

  it("지원하지 않는 파일은 에듀파인 원본 안내와 함께 거절한다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ClosingPage />);
    const input = screen.getByLabelText("세입세출결산총괄표 파일");
    await user.upload(input, new File(["bad"], "다른보고서.csv", { type: "text/csv" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "에듀파인 세입세출결산총괄표 엑셀 파일만 사용할 수 있습니다.",
    );
  });

  it("쉼표 문자열 금액의 xlsx 업로드 후 편집 화면을 표시한다", async () => {
    const user = userEvent.setup();
    render(<ClosingPage />);
    expect(screen.getByRole("heading", { level: 1 }).closest(".portal-workspace")).not.toBeNull();
    const file = fileWithArrayBuffer("세입세출결산총괄표.xlsx", createValidClosingXlsx());

    await user.upload(screen.getByLabelText("세입세출결산총괄표 파일"), file);

    expect(await screen.findByText("서울옥정초등학교")).toBeVisible();
    expect(screen.getAllByText("2,724,818,217원").length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(document.querySelector(".closing-a4-page")?.classList.contains("portal-workspace")).toBe(false);
  });

  it("확장자만 xlsx인 파일에 실제 형식 오류를 표시한다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<ClosingPage />);
    const invalid = new TextEncoder().encode("not excel").buffer;
    await user.upload(
      screen.getByLabelText("세입세출결산총괄표 파일"),
      fileWithArrayBuffer("세입세출결산총괄표.xlsx", invalid),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "실제 파일 형식이 올바르지 않습니다",
    );
  });
});
