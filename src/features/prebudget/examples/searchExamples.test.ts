import { describe, expect, it } from "vitest";
import { PREBUDGET_EXAMPLES } from "./data";
import { searchPrebudgetExamples } from "./searchExamples";

describe("성립전예산 예시 쉬운 검색", () => {
  it("선택한 재원구분의 예시만 보여준다", () => {
    expect(searchPrebudgetExamples(PREBUDGET_EXAMPLES, "", "구청보조금").map((item) => item.id)).toEqual(["district-facility", "district-curriculum", "district-welfare"]);
  });

  it("초보자용 동의어로 전체 예시를 찾는다", () => {
    expect(searchPrebudgetExamples(PREBUDGET_EXAMPLES, "책", "전체").map((item) => item.id)).toEqual(["purpose-reading-books"]);
    expect(searchPrebudgetExamples(PREBUDGET_EXAMPLES, "학부모 부담", "전체").every((item) => item.fundingCategory === "수익자부담금")).toBe(true);
  });
});
