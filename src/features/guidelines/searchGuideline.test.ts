import { describe, expect, it } from "vitest";
import { searchGuideline } from "./searchGuideline";

describe("예산편성지침 검색", () => {
  const pages = [
    { page: 23, text: "학교회계 예산편성 기본지침의 성격" },
    { page: 61, text: "학교회계 예산 편성 및 집행 시 유의사항" },
  ];

  it("본문 키워드와 주변 문장을 페이지별로 반환한다", () => {
    expect(searchGuideline(pages, "집행")).toEqual([
      expect.objectContaining({
        page: 61,
        excerpt: expect.stringContaining("집행"),
      }),
    ]);
  });

  it("공백 검색은 결과를 반환하지 않는다", () => {
    expect(searchGuideline(pages, "   ")).toEqual([]);
  });

  it("검색 결과는 기본 50개로 제한한다", () => {
    const manyPages = Array.from({ length: 70 }, (_, index) => ({
      page: index + 1,
      text: "예산",
    }));

    expect(searchGuideline(manyPages, "예산")).toHaveLength(50);
  });

  it("검색은 한글 대소문자와 영문 대소문자를 구분하지 않는다", () => {
    expect(searchGuideline([{ page: 5, text: "PDF 안내" }], "pdf")).toEqual([
      expect.objectContaining({ page: 5 }),
    ]);
  });
});
