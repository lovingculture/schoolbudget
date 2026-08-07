export type GuidelinePage = {
  page: number;
  text: string;
};

export type GuidelineSearchResult = {
  page: number;
  excerpt: string;
};

export function searchGuideline(
  pages: GuidelinePage[],
  rawQuery: string,
  limit = 50,
): GuidelineSearchResult[] {
  const query = rawQuery.trim().toLocaleLowerCase("ko-KR");
  if (!query) return [];

  return pages
    .flatMap(({ page, text }) => {
      const normalized = text.toLocaleLowerCase("ko-KR");
      const index = normalized.indexOf(query);
      if (index < 0) return [];

      const start = Math.max(0, index - 55);
      const end = Math.min(text.length, index + query.length + 85);
      const excerpt = [
        start > 0 ? "…" : "",
        text.slice(start, end).trim(),
        end < text.length ? "…" : "",
      ].join("");

      return [{ page, excerpt }];
    })
    .slice(0, limit);
}
