import type { ExampleValidationIssue, PrebudgetExample } from "./types";

export function validatePrebudgetExamples(examples: readonly PrebudgetExample[]): ExampleValidationIssue[] {
  const issues: ExampleValidationIssue[] = [];
  const add = (exampleId: string, field: string, message: string) => issues.push({ exampleId, field, message });
  const counts = { 목적사업비: 0, 구청보조금: 0, 수익자부담금: 0 };
  if (examples.length !== 13) add("catalogue", "length", "예시는 13종이어야 합니다.");
  const ids = new Set<string>();
  for (const example of examples) {
    counts[example.fundingCategory] += 1;
    if (ids.has(example.id)) add(example.id, "id", "ID가 중복됩니다.");
    ids.add(example.id);
    for (const field of ["id", "title", "summary", "documentTitle", "officialDocument"] as const) if (!example[field].trim()) add(example.id, field, "필수값이 비어 있습니다.");
    if (!example.items.length) add(example.id, "items", "예산항목이 필요합니다.");
    for (const item of example.items) {
      if (!item.formulaText && (item.unitPrice ?? 0) * (item.quantity ?? 0) * (item.count ?? 0) !== item.manualAmount) {
        add(example.id, "items", "금액 계산이 일치하지 않습니다.");
      }
    }
    const text = JSON.stringify(example);
    if (/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b|01[016789]-?\d{3,4}-?\d{4}|\d{6}-?[1-4]\d{6}/.test(text)) add(example.id, "privacy", "개인정보 패턴이 포함되었습니다.");
    if (/[○]|0000|20XX/.test(example.officialDocument) && !example.reviewRequiredFields.includes("officialDocument")) add(example.id, "officialDocument", "확인 필요 필드에 등록해야 합니다.");
  }
  if (counts.목적사업비 !== 7 || counts.구청보조금 !== 3 || counts.수익자부담금 !== 3) add("catalogue", "fundingCategory", "분류별 개수는 7·3·3이어야 합니다.");
  return issues;
}
