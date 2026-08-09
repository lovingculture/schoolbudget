import { beforeEach, describe, expect, it } from "vitest";
import { mainBudgetStorage } from "./storage";

describe("본예산 세출 브라우저 임시저장", () => {
  beforeEach(() => localStorage.clear());

  it("세출 행과 파일 현황을 저장하고 복원한다", () => {
    mainBudgetStorage.save({ rows: [{ id: "1", sourceFile: "a.xls", sourceSheet: "세출예산서식", sourceRow: 2, department: "교육부", business: "사업", detail: "항목", costCategory: "교육운영비", description: "교재", expression: "100", requestedAmount: 100, manager: "김", priorExpression: "", issues: [] }], files: [{ name: "a.xls", status: "success", rowCount: 1, total: 100, message: "정상 인식" }] });
    expect(mainBudgetStorage.load()?.rows[0].department).toBe("교육부");
  });

  it("손상된 저장값은 제거하고 빈 상태를 반환한다", () => {
    localStorage.setItem("school-budget:main-budget:expenditures:v1", "{");
    expect(mainBudgetStorage.load()).toBeNull();
    expect(localStorage.getItem("school-budget:main-budget:expenditures:v1")).toBeNull();
  });

  it("세출 저장값만 초기화한다", () => {
    localStorage.setItem("school-budget:main-budget:expenditures:v1", "{}");
    localStorage.setItem("school-budget:main-budget:revenue:v1", "kept");
    mainBudgetStorage.clear();
    expect(localStorage.getItem("school-budget:main-budget:expenditures:v1")).toBeNull();
    expect(localStorage.getItem("school-budget:main-budget:revenue:v1")).toBe("kept");
  });
});
