import type { MainBudgetExpenditureRow, ReviewIssue } from "./types";
import type { ExpenditureFileStatus } from "./ExpenditureUploadPanel";

const KEY = "school-budget:main-budget:expenditures:v1";
export interface MainBudgetStoredState { rows: MainBudgetExpenditureRow[]; files: ExpenditureFileStatus[]; }

const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const numberValue = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
function issues(value: unknown): ReviewIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    if (!(["error", "warning", "review"] as unknown[]).includes(item.level)) return [];
    return [{ code: stringValue(item.code), level: item.level as ReviewIssue["level"], message: stringValue(item.message), basis: stringValue(item.basis) }];
  });
}
function row(value: unknown): MainBudgetExpenditureRow | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!stringValue(item.id) || !stringValue(item.sourceFile)) return null;
  return {
    id: stringValue(item.id), sourceFile: stringValue(item.sourceFile), sourceSheet: stringValue(item.sourceSheet), sourceRow: numberValue(item.sourceRow) ?? 0,
    department: stringValue(item.department), business: stringValue(item.business), detail: stringValue(item.detail), costCategory: stringValue(item.costCategory),
    description: stringValue(item.description), expression: stringValue(item.expression), originalRequestedAmount: numberValue(item.originalRequestedAmount), requestedAmount: numberValue(item.requestedAmount),
    manager: stringValue(item.manager), priorExpression: stringValue(item.priorExpression), priorRequestedAmount: numberValue(item.priorRequestedAmount), originalVariance: numberValue(item.originalVariance), variance: numberValue(item.variance), issues: issues(item.issues),
  };
}
function file(value: unknown): ExpenditureFileStatus | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const status = item.status;
  if (!stringValue(item.name) || !(["success", "error", "empty"] as unknown[]).includes(status)) return null;
  return { name: stringValue(item.name), status: status as ExpenditureFileStatus["status"], rowCount: numberValue(item.rowCount) ?? 0, total: numberValue(item.total) ?? 0, message: stringValue(item.message) };
}

export const mainBudgetStorage = {
  load(): MainBudgetStoredState | null {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return { rows: Array.isArray(parsed.rows) ? parsed.rows.map(row).filter((item): item is MainBudgetExpenditureRow => item !== null) : [], files: Array.isArray(parsed.files) ? parsed.files.map(file).filter((item): item is ExpenditureFileStatus => item !== null) : [] };
    } catch {
      localStorage.removeItem(KEY);
      return null;
    }
  },
  save(state: MainBudgetStoredState) { localStorage.setItem(KEY, JSON.stringify(state)); },
  clear() { localStorage.removeItem(KEY); },
};
