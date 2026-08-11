import type { DraftItem } from "../../domain/prebudget";
import type { PrebudgetFormDraft, PrebudgetSource } from "./types";

export const createBlankPrebudgetItem = (): DraftItem => ({ id: crypto.randomUUID(), unitBusiness: "", business: "", detail: "", category: "일반수용비", description: "", unitPrice: 0, quantity: 0, count: 0, note: "" });

export function createPrebudgetDraft(initialSchoolName: string): PrebudgetFormDraft {
  return { schoolName: initialSchoolName === "○○초등학교" ? "" : initialSchoolName, fiscalYear: 2026, source: "목적사업비(교육청)", title: "", department: "체육안전교육부", requester: "김담당", approvalGranter: "", officialDocument: "", items: Array.from({ length: 5 }, createBlankPrebudgetItem), schoolLevel: "공통", reviewRequiredFields: [] };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const stringProperty = (value: Record<string, unknown>, key: string) => typeof value[key] === "string" ? value[key] : undefined;
const numberProperty = (value: Record<string, unknown>, key: string) => typeof value[key] === "number" ? value[key] : undefined;
const PREBUDGET_SOURCES: readonly PrebudgetSource[] = ["보조금(구청)", "목적사업비(교육청)", "수익자부담경비(학부모)"];
const isPrebudgetSource = (value: unknown): value is PrebudgetSource => typeof value === "string" && PREBUDGET_SOURCES.includes(value as PrebudgetSource);

function normalizePrebudgetItem(value: unknown): DraftItem {
  const item = createBlankPrebudgetItem();
  if (!isRecord(value)) return item;
  for (const key of ["id", "unitBusiness", "business", "detail", "category", "description", "note"] as const) {
    const property = stringProperty(value, key);
    if (property !== undefined) item[key] = property;
  }
  for (const key of ["unitPrice", "quantity", "count", "manualAmount"] as const) {
    const property = numberProperty(value, key);
    if (property !== undefined) item[key] = property;
  }
  return item;
}

export function normalizePrebudgetDraft(value: unknown, initialSchoolName = ""): PrebudgetFormDraft {
  const draft = createPrebudgetDraft(initialSchoolName);
  if (!isRecord(value)) return draft;
  for (const key of ["schoolName", "title", "department", "requester", "approvalGranter", "officialDocument"] as const) {
    const property = stringProperty(value, key);
    if (property !== undefined) draft[key] = property;
  }
  if (draft.schoolName === "학교예산 업무공간" || draft.schoolName === "○○초등학교") draft.schoolName = "";
  if (draft.title === "안전인력 봉사비 성립전예산" || draft.title === "안전인력봉사비 성립전예산 편성 요청") draft.title = "";
  const fiscalYear = value.fiscalYear;
  const normalizedFiscalYear = typeof fiscalYear === "number" ? fiscalYear : typeof fiscalYear === "string" && fiscalYear.trim() ? Number(fiscalYear) : Number.NaN;
  if (Number.isFinite(normalizedFiscalYear)) draft.fiscalYear = normalizedFiscalYear;
  if (isPrebudgetSource(value.source)) draft.source = value.source;
  const schoolLevel = stringProperty(value, "schoolLevel");
  if (schoolLevel === "초등학교" || schoolLevel === "중학교" || schoolLevel === "고등학교" || schoolLevel === "공통") draft.schoolLevel = schoolLevel;
  const exampleSourceId = stringProperty(value, "exampleSourceId");
  if (exampleSourceId !== undefined) draft.exampleSourceId = exampleSourceId;
  const savedAt = stringProperty(value, "savedAt");
  if (savedAt !== undefined) draft.savedAt = savedAt;
  if (Array.isArray(value.items)) draft.items = value.items.map(normalizePrebudgetItem);
  if (Array.isArray(value.reviewRequiredFields)) {
    draft.reviewRequiredFields = value.reviewRequiredFields.filter((field): field is string => field === "officialDocument");
  }
  return draft;
}

export function isBlankPrebudgetItem(item: DraftItem) { return !item.unitBusiness?.trim() && !item.business?.trim() && !item.detail?.trim() && !item.description?.trim() && !(item.unitPrice ?? 0) && !(item.quantity ?? 0) && !(item.count ?? 0) && !(item.manualAmount ?? 0); }
export const activePrebudgetItems = (items: DraftItem[]) => items.filter((item) => !isBlankPrebudgetItem(item));
