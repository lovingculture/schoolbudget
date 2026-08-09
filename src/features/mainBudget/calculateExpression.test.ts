import { describe, expect, it } from "vitest";
import { calculateBudgetExpression } from "./calculateExpression";

describe("본예산 산출식 계산", () => {
  it("금액과 한글 단위를 제거하고 곱셈을 계산한다", () => {
    expect(calculateBudgetExpression("100,000원 × 3명 × 2회")).toEqual({ ok: true, value: 600000 });
  });

  it("덧셈과 곱셈의 우선순위를 적용한다", () => {
    expect(calculateBudgetExpression("50,000*2 + 30,000")).toEqual({ ok: true, value: 130000 });
  });

  it("빈 산출식은 확인 필요 사유를 반환한다", () => {
    expect(calculateBudgetExpression("")).toEqual({ ok: false, reason: "산출식이 비어 있습니다." });
  });

  it("함수와 셀 참조를 실행하지 않는다", () => {
    expect(calculateBudgetExpression("SUM(A1:A3)")).toEqual({ ok: false, reason: "지원하지 않는 산출식입니다." });
  });

  it("0으로 나눈 결과를 거부한다", () => {
    expect(calculateBudgetExpression("100 / 0").ok).toBe(false);
  });
});
