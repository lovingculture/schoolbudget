import type {
  FoundationBudgetDocument,
  FoundationDraft,
  FoundationExpenseRow,
  FoundationRevenueRow,
  FoundationWarning,
} from "./types";

const STORAGE_KEY = "school-budget:main-budget-foundation:v1";
const SCHEMA_VERSION = 1;
type RecordValue = Record<string, unknown>;

const record = (value: unknown): RecordValue | null => typeof value === "object" && value !== null && !Array.isArray(value) ? value as RecordValue : null;
const text = (value: unknown): value is string => typeof value === "string";
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function source(value: unknown) {
  const item = record(value);
  return item && number(item.line) && text(item.raw) ? { line: item.line, raw: item.raw } : null;
}

function warning(value: unknown): FoundationWarning | null {
  const item = record(value);
  if (!item || !text(item.code) || !text(item.message) || !["warning", "error"].includes(String(item.severity))) return null;
  if (item.line !== undefined && !number(item.line)) return null;
  return { code: item.code, message: item.message, severity: item.severity as FoundationWarning["severity"], ...(item.line === undefined ? {} : { line: item.line as number }) };
}

function revenue(value: unknown): FoundationRevenueRow | null {
  const item = record(value);
  const location = item && source(item.source);
  if (!item || !location || ![item.chapter, item.division, item.section, item.item, item.costItem, item.calculationBasis].every(text)
    || ![item.currentAmount, item.priorAmount, item.changeAmount].every(number)
    || !(item.calculationAmount === null || number(item.calculationAmount))) return null;
  return {
    chapter: item.chapter as string, division: item.division as string, section: item.section as string,
    item: item.item as string, costItem: item.costItem as string, currentAmount: item.currentAmount as number,
    priorAmount: item.priorAmount as number, changeAmount: item.changeAmount as number,
    calculationBasis: item.calculationBasis as string, calculationAmount: item.calculationAmount as number | null, source: location,
  };
}

function expense(value: unknown): FoundationExpenseRow | null {
  const item = record(value);
  const location = item && source(item.source);
  if (!item || !location || ![item.policy, item.unit, item.business, item.detail, item.costItem, item.calculationBasis, item.department, item.manager].every(text)
    || ![item.currentAmount, item.priorAmount, item.changeAmount].every(number)
    || !(item.calculationAmount === null || number(item.calculationAmount))) return null;
  return {
    policy: item.policy as string, unit: item.unit as string, business: item.business as string,
    detail: item.detail as string, costItem: item.costItem as string, currentAmount: item.currentAmount as number,
    priorAmount: item.priorAmount as number, changeAmount: item.changeAmount as number,
    calculationBasis: item.calculationBasis as string, calculationAmount: item.calculationAmount as number | null,
    department: item.department as string, manager: item.manager as string, source: location,
  };
}

function document(value: unknown): FoundationBudgetDocument | null {
  const item = record(value);
  if (!item || !text(item.fileName) || !["utf-8", "euc-kr"].includes(String(item.encoding)) || !number(item.fiscalYear)
    || !text(item.budgetType) || item.unit !== "천원" || !number(item.sourceRevenueTotal) || !number(item.sourceExpenseTotal)
    || !Array.isArray(item.revenueRows) || !Array.isArray(item.expenseRows) || !Array.isArray(item.warnings)) return null;
  const revenueRows = item.revenueRows.map(revenue);
  const expenseRows = item.expenseRows.map(expense);
  const warnings = item.warnings.map(warning);
  if (revenueRows.some((row) => !row) || expenseRows.some((row) => !row) || warnings.some((itemWarning) => !itemWarning)) return null;
  return {
    fileName: item.fileName,
    encoding: item.encoding as FoundationBudgetDocument["encoding"],
    fiscalYear: item.fiscalYear,
    budgetType: item.budgetType,
    unit: "천원",
    sourceRevenueTotal: item.sourceRevenueTotal,
    sourceExpenseTotal: item.sourceExpenseTotal,
    revenueRows: revenueRows as FoundationRevenueRow[],
    expenseRows: expenseRows as FoundationExpenseRow[],
    warnings: warnings as FoundationWarning[],
  };
}

function sanitize(value: unknown): FoundationDraft | null {
  const item = record(value);
  const parsedDocument = item && document(item.document);
  const edits = item && record(item.edits);
  if (!item || !parsedDocument || !edits || !Object.values(edits).every((entry) => text(entry) || number(entry))) return null;
  return { document: parsedDocument, edits: edits as FoundationDraft["edits"] };
}

function remove(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* browser storage can be unavailable */ }
}

export const foundationStorage = {
  load(): FoundationDraft | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const envelope = record(JSON.parse(raw));
      if (!envelope || envelope.schemaVersion !== SCHEMA_VERSION) { remove(); return null; }
      const draft = sanitize(envelope);
      if (!draft) remove();
      return draft;
    } catch {
      remove();
      return null;
    }
  },
  save(value: FoundationDraft): boolean {
    const draft = sanitize(value);
    if (!draft) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...draft }));
      return true;
    } catch {
      return false;
    }
  },
  clear(): void { remove(); },
};
