export type BudgetWebtoon = {
  episode: number;
  title: string;
  imageSrc: string;
};

export const budgetWebtoons: readonly BudgetWebtoon[] = [
  { episode: 1, title: "학교예산, 왜 중요할까?", imageSrc: "/webtoons/budget/episode-1.png" },
  { episode: 2, title: "학교예산, 어떻게 편성될까?", imageSrc: "/webtoons/budget/episode-2.png" },
  { episode: 3, title: "성립전예산, 언제 어떻게 편성할까?", imageSrc: "/webtoons/budget/episode-3.png" },
  { episode: 4, title: "성립전예산, 어떻게 편성하지?", imageSrc: "/webtoons/budget/episode-4.png" },
  { episode: 5, title: "추가경정예산(추경)이란?", imageSrc: "/webtoons/budget/episode-5.png" },
  { episode: 6, title: "추경예산, 언제 어떻게 편성할까?", imageSrc: "/webtoons/budget/episode-6.png" },
  { episode: 7, title: "원가통계비목 알아보기", imageSrc: "/webtoons/budget/episode-7.png" },
];
