import { calculateRequestedAmount } from "../../domain/prebudget";
import { activePrebudgetItems } from "./draft";
import type { PrebudgetFormDraft, PrebudgetValidationIssue } from "./types";

export function validatePrebudgetForm(draft: PrebudgetFormDraft): PrebudgetValidationIssue[] {
  const issues: PrebudgetValidationIssue[] = [];
  const reviewLabels: Record<string, string> = { officialDocument: "관련 공문" };
  const seenReviewFields = new Set<string>();
  for (const field of draft.reviewRequiredFields) {
    if (seenReviewFields.has(field)) continue;
    seenReviewFields.add(field);
    issues.push({ field, message: `${reviewLabels[field] ?? field} 확인 필요` });
  }
  const required: [keyof PrebudgetFormDraft, string][] = [["title", "문서 제목을 입력하세요."], ["department", "부서명을 입력하세요."], ["requester", "사업담당자를 입력하세요."], ["officialDocument", "관련 공문을 입력하세요."]];
  required.forEach(([field, message]) => { if (!String(draft[field] ?? "").trim()) issues.push({ field, message }); });
  draft.items.forEach((item, index) => {
    if (!activePrebudgetItems([item]).length) return;
    const add = (field: string, message: string) => issues.push({ field, itemIndex: index, message: `${index + 1}번 항목: ${message}` });
    if (!item.unitBusiness?.trim()) add("unitBusiness", "단위사업을 선택하세요.");
    if (!item.business?.trim()) add("business", "세부사업을 선택하세요.");
    if (!item.detail?.trim()) add("detail", "세부항목을 입력하세요.");
    if (!item.category?.trim()) add("category", "원가통계비목을 선택하세요.");
    if (!item.description?.trim()) add("description", "산출내역을 입력하세요.");
    if (calculateRequestedAmount(item) <= 0) add("amount", "요구금액은 0원보다 커야 합니다.");
  });
  if (!activePrebudgetItems(draft.items).length) issues.push({ field: "items", message: "예산항목을 1개 이상 입력하세요." });
  return issues;
}
