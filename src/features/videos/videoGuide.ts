export const VIDEO_GUIDE_CATEGORIES = ["전체", "예산편성", "예산안건", "결산", "추경"] as const;

export type VideoGuideCategory = (typeof VIDEO_GUIDE_CATEGORIES)[number];

export type VideoGuide = {
  id: string;
  title: string;
  category: Exclude<VideoGuideCategory, "전체">;
  description: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  localVideoUrl?: string;
  posterUrl?: string;
  featured?: boolean;
};

export const videoGuides: readonly VideoGuide[] = [
  {
    id: "yegamday-intro",
    title: "학교예산 한눈에 소개",
    category: "예산편성",
    description: "배우는 AI에서 실제로 일하는 AI로. 학교 예산 분석과 예산 자료 작성을 더 쉽고 빠르게 돕는 웹앱을 35초로 만나보세요.",
    localVideoUrl: "/videos/yegamday-intro-35s.mp4",
    posterUrl: "/videos/yegamday-intro-poster.webp",
    featured: true,
  },
  {
    id: "k-edufine-main-budget-training-2025-11-20",
    title: "(25.11.20.) K-에듀파인 학교회계 예산관리(본예산편성) 대표강사 교육영상",
    category: "예산편성",
    description: "K-에듀파인 학교회계 본예산 편성 절차를 안내하는 대표강사 교육영상입니다.",
    thumbnailUrl: "https://i.ytimg.com/vi/4eQjyipBuEM/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=4eQjyipBuEM&t=1s",
  },
  {
    id: "k-edufine-budget-closing-training-2026-02-12",
    title: "(26.02.12) K-에듀파인 학교회계 예산결산 사용자 교육",
    category: "결산",
    description: "K-에듀파인 학교회계 예산·결산 업무를 안내하는 사용자 교육영상입니다.",
    thumbnailUrl: "https://i.ytimg.com/vi/J9wdZZCYYVk/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=J9wdZZCYYVk",
  },
  {
    id: "k-edufine-supplementary-budget-training-2025-03-20",
    title: "('25.03.20.) K-에듀파인 학교회계 예산관리(성립전예산 및 추가경정예산) 대표강사 교육",
    category: "추경",
    description: "성립전예산과 추가경정예산의 편성·관리 절차를 안내하는 대표강사 교육영상입니다.",
    thumbnailUrl: "https://i.ytimg.com/vi/q73d3QkwmP4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=q73d3QkwmP4",
  },
  {
    id: "k-edufine-budget-management-chapter-1",
    title: "[학교회계 - 예산관리] 1장 예산관리 개요",
    category: "예산편성",
    description: "K-에듀파인 학교회계 예산관리의 기본 개념과 업무 흐름을 안내하는 교육영상입니다.",
    thumbnailUrl: "https://i.ytimg.com/vi/dr-dxp9UCLE/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dr-dxp9UCLE&list=PLnNTGUWLwu1sBH5y4_WZV05q5U_UD7wB1",
  },
  {
    id: "k-edufine-budget-management-chapter-2",
    title: "[학교회계 - 예산관리] 2장 예산편성 사전작업",
    category: "예산편성",
    description: "K-에듀파인에서 예산을 편성하기 전에 필요한 사전작업을 안내하는 교육영상입니다.",
    thumbnailUrl: "https://i.ytimg.com/vi/a5VfrWqDcNo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=a5VfrWqDcNo&t=20s",
  },
  {
    id: "k-edufine-budget-management-chapter-3",
    title: "[학교회계 - 예산관리] 3장 본예산관리",
    category: "예산편성",
    description: "K-에듀파인 학교회계 본예산 편성과 관리 방법을 안내하는 교육영상입니다.",
    thumbnailUrl: "https://i.ytimg.com/vi/zaMVS8WLWTo/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=zaMVS8WLWTo&t=16s",
  },
  {
    id: "job-cock-main-budget-adjustment-meeting",
    title: "[직무콕] 한눈에 쏙 들어오는 본예산 조정회의 자료 만들기",
    category: "예산편성",
    description: "본예산 조정회의에 필요한 자료를 한눈에 보기 좋게 정리하는 방법을 안내하는 교육영상입니다.",
    thumbnailUrl: "https://i.ytimg.com/vi/5epYRQu4Ov4/hqdefault.jpg",
    videoUrl: "https://www.youtube.com/watch?v=5epYRQu4Ov4",
  },
];

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
