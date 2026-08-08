import { describe, expect, it } from "vitest";
import { PREBUDGET_EXAMPLES } from "./data";
import { validatePrebudgetExamples } from "./validateExamples";

describe("초보자용 성립전예산 예시", () => {
  it("승인된 10·3·3 구성의 예시 16종을 제공한다", () => {
    expect(PREBUDGET_EXAMPLES).toHaveLength(16);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "목적사업비")).toHaveLength(10);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "구청보조금")).toHaveLength(3);
    expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "수익자부담금")).toHaveLength(3);
    expect(new Set(PREBUDGET_EXAMPLES.map((item) => item.id)).size).toBe(16);
  });

  it("필수값·금액계산·개인정보 검증을 모두 통과한다", () => {
    expect(validatePrebudgetExamples(PREBUDGET_EXAMPLES)).toEqual([]);
  });
});
