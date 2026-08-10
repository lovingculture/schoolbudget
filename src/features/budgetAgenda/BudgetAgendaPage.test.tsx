import { fireEvent, render, screen } from "@testing-library/react";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { BudgetAgendaPage } from "./BudgetAgendaPage";

describe("예산 안건설명서 화면", () => {
  it("에듀파인 파일 불러오기 절차를 안내한다", () => {
    render(<BudgetAgendaPage />);
    expect(screen.getByRole("heading", { level: 1 }).closest(".portal-workspace")).not.toBeNull();
    expect(screen.getByText(/에듀파인 예산현황의 세입세출총괄표를 다운로드한 후/)).toBeInTheDocument();
    expect(screen.getByText(/자동으로 만들어지는 입력 화면에서 안건번호/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "세입세출총괄표 불러오기" })).toBeInTheDocument();
  });

  it("총괄표를 올리면 편집 화면과 미리보기를 만든다", async () => {
    const rows: unknown[][] = Array.from({ length: 11 }, () => Array(20).fill(""));
    rows[1][6] = "세입 세출 예산 총괄";
    rows[3][0] = "회계연도 : 2026\n예산구분 : 추경1회\n학 교 명 : 서울옥정초등학교";
    rows[4][0] = "예산구분"; rows[6][0] = "추경1회"; rows[6][2] = 100; rows[6][5] = 50; rows[6][13] = 50; rows[6][17] = 100;
    rows[8][0] = "장"; rows[8][1] = "관"; rows[8][3] = "금회"; rows[8][4] = "누계"; rows[8][9] = "구성비(%)";
    rows[8][10] = "정책사업"; rows[8][14] = "금회"; rows[8][16] = "누계"; rows[8][18] = "구성비(%)";
    rows[9][0] = "이전수입"; rows[9][1] = "교부금"; rows[9][3] = 50; rows[9][4] = 100; rows[9][9] = 100;
    rows[9][10] = "학교운영"; rows[9][14] = 50; rows[9][16] = 100; rows[9][18] = 100;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "세입세출예산총괄");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "budget.xlsx");
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(bytes) });
    render(<BudgetAgendaPage />);
    fireEvent.change(document.querySelector("input[type=file]")!, { target: { files: [file] } });
    const agendaNumber = await screen.findByLabelText("안건번호");
    expect(agendaNumber).toBeInTheDocument();
    const workspace = agendaNumber.closest(".budget-agenda-workspace");
    expect(workspace).toHaveClass("budget-agenda-workspace-vertical");
    expect(workspace?.querySelector(".budget-agenda-editor")?.nextElementSibling).toHaveClass("budget-agenda-preview");
    expect(document.querySelector(".budget-agenda-a4-page")?.classList.contains("portal-workspace")).toBe(false);
    expect(screen.getByRole("heading", { name: "2026학년도 서울옥정초등학교 회계 1차 추경예산(안)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "한글(HWPX) 내려받기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PDF 내려받기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Word 내려받기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excel 내려받기" })).not.toBeInTheDocument();
  });

  it("큰 점선 업로드 상자에 총괄표를 놓으면 파일을 불러온다", async () => {
    const rows: unknown[][] = Array.from({ length: 11 }, () => Array(20).fill(""));
    rows[1][6] = "세입 세출 예산 총괄";
    rows[3][0] = "회계연도 : 2026\n예산구분 : 추경1회\n학 교 명 : 서울옥정초등학교";
    rows[4][0] = "예산구분"; rows[6][0] = "추경1회"; rows[6][2] = 100; rows[6][5] = 50; rows[6][13] = 50; rows[6][17] = 100;
    rows[8][0] = "장"; rows[8][1] = "관"; rows[8][3] = "금회"; rows[8][4] = "누계"; rows[8][9] = "구성비(%)";
    rows[8][10] = "정책사업"; rows[8][14] = "금회"; rows[8][16] = "누계"; rows[8][18] = "구성비(%)";
    rows[9][0] = "이전수입"; rows[9][1] = "교부금"; rows[9][3] = 50; rows[9][4] = 100; rows[9][9] = 100;
    rows[9][10] = "학교운영"; rows[9][14] = 50; rows[9][16] = 100; rows[9][18] = 100;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "세입세출예산총괄");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "budget.xlsx");
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(bytes) });

    const { container } = render(<BudgetAgendaPage />);
    fireEvent.drop(container.querySelector(".budget-agenda-upload")!, { dataTransfer: { files: [file] } });

    expect(await screen.findByLabelText("안건번호")).toBeInTheDocument();
  });
});
