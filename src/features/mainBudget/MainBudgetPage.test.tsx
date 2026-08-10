import * as XLSX from "xlsx";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MainBudgetPage } from "./MainBudgetPage";

const headers = ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감"];
function expenditureFile(name: string, department: string): File {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, [department, "교육과정", "교재", "교육운영비", "교재", "100000*2", 200000, "김담당", "100000", 100000, 100000]]), "세출예산서식");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], name);
}

describe("본예산 세출 통합 화면", () => {
  beforeEach(() => localStorage.clear());
  it("renders the budget workflow in the shared workspace", () => {
    const { container } = render(<MainBudgetPage />);

    expect(container.querySelector(".content.main-budget-page.portal-workspace")).not.toBeNull();
  });
  it("부서별 파일을 여러 개 올려 합계와 행을 수합한다", async () => {
    const user = userEvent.setup();
    render(<MainBudgetPage />);
    const input = screen.getByLabelText("부서별 세출 요구자료 선택");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", ".xls,.xlsx");
    await user.upload(input, [expenditureFile("교육부.xlsx", "교육부"), expenditureFile("행정실.xlsx", "행정실")]);
    await waitFor(() => expect(screen.getByText("400,000원")).toBeVisible());
    expect(screen.getByText("교육부.xlsx")).toBeVisible();
    expect(screen.getByText("행정실.xlsx")).toBeVisible();
    expect(screen.getByText("2건 조회")).toBeVisible();
  });

  it("세입 탭을 열어도 세출 결과를 유지하고 3% 자료 요건을 안내한다", async () => {
    const user = userEvent.setup();
    render(<MainBudgetPage />);
    await user.upload(screen.getByLabelText("부서별 세출 요구자료 선택"), expenditureFile("교육부.xlsx", "교육부"));
    await screen.findByText("교육부.xlsx");
    await user.click(screen.getByRole("tab", { name: "세입자료·3% 검토" }));
    expect(screen.getByText("세입자료를 등록하면 업무추진비 3% 한도를 계산할 수 있습니다.")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "세출자료 통합·검토" }));
    expect(screen.getByText("교육부.xlsx")).toBeVisible();
  });
});
