import type { DraftItem } from "../../domain/prebudget";
import type { PrebudgetFormDraft } from "./types";

export const createBlankPrebudgetItem = (): DraftItem => ({ id: crypto.randomUUID(), unitBusiness: "", business: "", detail: "", category: "일반수용비", description: "", unitPrice: 0, quantity: 0, count: 0, note: "" });
export function createPrebudgetDraft(initialSchoolName: string): PrebudgetFormDraft { return { schoolName: initialSchoolName, fiscalYear: 2026, source: "목적사업비(교육청)", title: "안전인력 봉사비 성립전예산", department: "체육안전교육부", requester: "김담당", officialDocument: "", items: Array.from({ length: 5 }, createBlankPrebudgetItem) }; }
export function isBlankPrebudgetItem(item: DraftItem) { return !item.unitBusiness?.trim() && !item.business?.trim() && !item.detail?.trim() && !item.description?.trim() && !(item.unitPrice ?? 0) && !(item.quantity ?? 0) && !(item.count ?? 0) && !(item.manualAmount ?? 0); }
export const activePrebudgetItems = (items: DraftItem[]) => items.filter((item) => !isBlankPrebudgetItem(item));
