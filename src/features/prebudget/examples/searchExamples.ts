import type { ExampleFundingCategory, PrebudgetExample } from "./types";

export type ExampleSearchScope = ExampleFundingCategory | "전체";

export interface FundingGuideOption {
  title: string;
  label: string;
  category?: ExampleFundingCategory;
  description?: string;
  examples?: string;
}

export const FUNDING_GUIDE_OPTIONS: readonly FundingGuideOption[] = [
  {
    title: "① 목적사업비",
    label: "교육청·교육지원청에서 특정 사업을 위해 받았어요",
    category: "목적사업비",
    description: "교부공문에 사용 목적이 정해진 사업비예요.",
    examples: "예시) 돌봄교실운영비, 방과후교실사업비, 기초학력책임지도예산 등",
  },
  {
    title: "② 보조금",
    label: "구청이나 지방자치단체에서 지원받았어요",
    category: "구청보조금",
    description: "구청 등의 보조금 교부결정에 따른 사업비예요.",
    examples: "예시) 치아건강사업, 새내기학습준비지원, 예체능교육지원 등",
  },
  {
    title: "③ 수익자부담경비",
    label: "학부모가 비용의 전부 또는 일부를 부담해요",
    category: "수익자부담금",
    examples: "예시) 현장학습비, 졸업앨범비, 돌봄중식비 등",
  },
  {
    title: "④ 잘 모르겠어요",
    label: "잘 모르겠어요",
    description: "공문 발신기관(교육지원청 초등교육과, 구청 교육지원과 등)을 확인해보세요.",
  },
] as const;

const normalize = (value: string) => value.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");

export function searchPrebudgetExamples(examples: readonly PrebudgetExample[], query: string, scope: ExampleSearchScope): PrebudgetExample[] {
  const needle = normalize(query.trim());
  return examples.filter((example) => {
    if (scope !== "전체" && example.fundingCategory !== scope) return false;
    if (!needle) return true;
    const itemText = example.items.flatMap((item) => [item.unitBusiness, item.business, item.detail, item.category, item.description, item.note]);
    const searchable = [example.title, example.fundingCategory, example.summary, ...example.searchAliases];
    if (needle.length > 1) searchable.push(...itemText.filter((value): value is string => Boolean(value)));
    return normalize(searchable.join(" ")).includes(needle);
  });
}
