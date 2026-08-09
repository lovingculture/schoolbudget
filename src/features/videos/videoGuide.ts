export const VIDEO_GUIDE_CATEGORIES = ["전체", "예산편성", "예산안건", "결산", "추경"] as const;

export type VideoGuideCategory = (typeof VIDEO_GUIDE_CATEGORIES)[number];

export type VideoGuide = {
  id: string;
  title: string;
  category: Exclude<VideoGuideCategory, "전체">;
  description: string;
  thumbnailUrl?: string;
  videoUrl?: string;
};

// Keep the catalog in code until public guide videos are available.
export const videoGuides: readonly VideoGuide[] = [];

export function filterVideoGuides(
  query: string,
  category: VideoGuideCategory,
  guides: readonly VideoGuide[] = videoGuides,
): VideoGuide[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");

  return guides.filter((guide) => (
    (category === "전체" || guide.category === category)
    && (!normalizedQuery || guide.title.toLocaleLowerCase("ko-KR").includes(normalizedQuery))
  ));
}
