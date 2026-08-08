import type { ExampleFundingCategory, PrebudgetExample } from "./types";

export type ExampleSearchScope = ExampleFundingCategory | "전체";
export interface FundingGuideOption { label: string; category?: ExampleFundingCategory; description: string; }

export const FUNDING_GUIDE_OPTIONS: readonly FundingGuideOption[] = [
  { label: "교육청·교육지원청에서 특정 사업을 위해 받았어요", category: "목적사업비", description: "교부공문에 사용 목적이 정해진 사업비예요." },
  { label: "구청이나 지방자치단체에서 지원받았어요", category: "구청보조금", description: "구청 등의 보조금 교부결정에 따른 사업비예요." },
  { label: "학부모가 비용의 전부 또는 일부를 부담해요", category: "수익자부담금", description: "가정통신문과 징수계획에 따라 모으는 경비예요." },
  { label: "잘 모르겠어요", description: "공문 발신기관, 보조금 교부결정서 또는 가정통신문을 확인해 보세요." },
] as const;

const normalize = (value: string) => value.toLocaleLowerCase("ko-KR").replace(/\s+/g, "");

export function searchPrebudgetExamples(examples: readonly PrebudgetExample[], query: string, scope: ExampleSearchScope): PrebudgetExample[] {
  const needle = normalize(query.trim());
  return examples.filter((example) => {
    if (scope !== "전체" && example.fundingCategory !== scope) return false;
    if (!needle) return true;
    const itemText = example.items.flatMap((item) => [item.unitBusiness, item.business, item.detail, item.category, item.description, item.note]);
    return normalize([example.title, example.fundingCategory, example.summary, ...example.searchAliases, ...itemText].filter(Boolean).join(" ")).includes(needle);
  });
}
