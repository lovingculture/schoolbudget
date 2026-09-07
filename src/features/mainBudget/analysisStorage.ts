import type {
  AnalysisWarning,
  BudgetCellCoordinate,
  BudgetDocumentIdentity,
  BudgetLogicalRow,
  BudgetSource,
  GeneralBusinessExpense,
  GeneralBusinessExpenseCollection,
  MainBudgetAnalysisResult,
  RevenueFact,
  RevenueFactCollection,
} from "./analysisTypes";

const STORAGE_KEY = "school-budget:main-budget:file-analysis:v1";
const SCHEMA_VERSION = 4;
const LEGACY_KEYS = [
  "school-budget:main-budget:expenditures:v1",
  "school-budget:main-budget:pdf-analysis:v1",
] as const;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || finiteNumber(value);
}

function optionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || finiteNumber(value);
}

function optionalInteger(value: unknown): value is number | undefined {
  return value === undefined || (Number.isInteger(value) && (value as number) >= 0);
}

function optionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function coordinate(value: unknown): BudgetCellCoordinate | null {
  const item = record(value);
  if (!item || !finiteNumber(item.x) || !finiteNumber(item.y)
    || !optionalFiniteNumber(item.width) || !optionalFiniteNumber(item.height)) return null;
  return {
    x: item.x,
    y: item.y,
    ...(item.width === undefined ? {} : { width: item.width }),
    ...(item.height === undefined ? {} : { height: item.height }),
  };
}

function safeCell(value: unknown): string | number | null {
  if (typeof value === "string" || value === null) return value;
  return finiteNumber(value) ? value : null;
}

function logicalRow(value: unknown): BudgetLogicalRow | null {
  const item = record(value);
  if (!item || !Array.isArray(item.cells)
    || !item.cells.every((cell) => typeof cell === "string" || finiteNumber(cell) || cell === null)
    || !optionalInteger(item.sourcePage)
    || (item.sourceSheet !== undefined && typeof item.sourceSheet !== "string")
    || !optionalInteger(item.sourceRow)
    || !optionalFiniteNumber(item.confidence)) return null;

  let coordinates: BudgetCellCoordinate[] | undefined;
  if (item.coordinates !== undefined) {
    if (!Array.isArray(item.coordinates)) return null;
    const sanitized = item.coordinates.map(coordinate);
    if (sanitized.some((candidate) => candidate === null)) return null;
    coordinates = sanitized as BudgetCellCoordinate[];
  }

  return {
    cells: item.cells.map(safeCell),
    ...(item.sourcePage === undefined ? {} : { sourcePage: item.sourcePage }),
    ...(item.sourceSheet === undefined ? {} : { sourceSheet: item.sourceSheet }),
    ...(item.sourceRow === undefined ? {} : { sourceRow: item.sourceRow }),
    ...(coordinates === undefined ? {} : { coordinates }),
    ...(item.confidence === undefined ? {} : { confidence: item.confidence }),
  };
}

function optionalRow(value: unknown): BudgetLogicalRow | undefined | null {
  return value === undefined ? undefined : logicalRow(value);
}

function source(value: unknown): BudgetSource | null {
  const item = record(value);
  if (!item || typeof item.fileName !== "string" || !["xls", "xlsx"].includes(String(item.format))
    || !optionalInteger(item.pageCount) || !optionalInteger(item.sheetCount)) return null;
  if (!Number.isInteger(item.sheetCount) || (item.sheetCount as number) < 1) return null;
  return {
    fileName: item.fileName,
    format: item.format as BudgetSource["format"],
    ...(item.pageCount === undefined ? {} : { pageCount: item.pageCount }),
    ...(item.sheetCount === undefined ? {} : { sheetCount: item.sheetCount }),
  };
}

function identity(value: unknown): BudgetDocumentIdentity | null {
  const item = record(value);
  if (!item || typeof item.schoolName !== "string" || !item.schoolName.trim()
    || !Number.isInteger(item.accountingYear) || (item.accountingYear as number) < 1900
    || (item.accountingYear as number) > 2200 || item.budgetType !== "본예산") return null;
  return {
    schoolName: item.schoolName,
    accountingYear: item.accountingYear as number,
    budgetType: "본예산",
  };
}

function revenueFact(value: unknown): RevenueFact | null {
  const item = record(value);
  if (!item || typeof item.label !== "string" || !nullableNumber(item.amount)
    || !optionalBoolean(item.inferredAbsent)) return null;
  const row = optionalRow(item.row);
  if (row === null) return null;
  return {
    label: item.label,
    amount: item.amount,
    ...(row === undefined ? {} : { row }),
    ...(item.inferredAbsent === undefined ? {} : { inferredAbsent: item.inferredAbsent }),
  };
}

function revenueCollection(value: unknown): RevenueFactCollection | null {
  const item = record(value);
  if (!item || !Array.isArray(item.facts) || typeof item.isComplete !== "boolean") return null;
  const facts = item.facts.map(revenueFact);
  if (facts.some((fact) => fact === null)) return null;
  return { facts: facts as RevenueFact[], isComplete: item.isComplete };
}

function expense(value: unknown): GeneralBusinessExpense | null {
  const item = record(value);
  if (!item || ![item.id, item.policy, item.unit, item.business, item.detail, item.costItem]
    .every((field) => typeof field === "string") || !nullableNumber(item.amount)) return null;
  const row = optionalRow(item.row);
  if (row === null) return null;
  return {
    id: item.id as string,
    policy: item.policy as string,
    unit: item.unit as string,
    business: item.business as string,
    detail: item.detail as string,
    costItem: item.costItem as string,
    amount: item.amount,
    ...(row === undefined ? {} : { row }),
  };
}

function expenseArray(value: unknown): GeneralBusinessExpense[] | null {
  if (!Array.isArray(value)) return null;
  const facts = value.map(expense);
  return facts.some((fact) => fact === null) ? null : facts as GeneralBusinessExpense[];
}

function expenseCollection(value: unknown): GeneralBusinessExpenseCollection | null {
  const item = record(value);
  if (!item || typeof item.isComplete !== "boolean") return null;
  const facts = expenseArray(item.facts);
  return facts === null ? null : { facts, isComplete: item.isComplete };
}

function warning(value: unknown): AnalysisWarning | null {
  const item = record(value);
  if (!item || typeof item.code !== "string" || typeof item.message !== "string"
    || (item.severity !== "warning" && item.severity !== "error")) return null;
  const row = optionalRow(item.row);
  if (row === null) return null;
  return {
    code: item.code,
    message: item.message,
    severity: item.severity,
    ...(row === undefined ? {} : { row }),
  };
}

function warningArray(value: unknown): AnalysisWarning[] | null {
  if (!Array.isArray(value)) return null;
  const warnings = value.map(warning);
  return warnings.some((candidate) => candidate === null) ? null : warnings as AnalysisWarning[];
}

function analysisResult(value: unknown): MainBudgetAnalysisResult | null {
  const item = record(value);
  if (!item || !nullableNumber(item.revenueBaseline)
    || !nullableNumber(item.verificationRevenueTotal)
    || !nullableNumber(item.generalBusinessExpenseTotal)
    || !nullableNumber(item.ratio)) return null;

  const safeSource = source(item.source);
  const safeIdentity = identity(item.identity);
  const verificationRevenue = revenueCollection(item.verificationRevenue);
  const generalBusinessExpenses = expenseArray(item.generalBusinessExpenses);
  const generalBusinessExpenseFacts = expenseCollection(item.generalBusinessExpenseFacts);
  const warnings = warningArray(item.warnings);
  if (!safeSource || !safeIdentity || !verificationRevenue
    || !generalBusinessExpenses || !generalBusinessExpenseFacts || !warnings) return null;

  return {
    source: safeSource,
    identity: safeIdentity,
    revenueBaseline: item.revenueBaseline,
    verificationRevenue,
    verificationRevenueTotal: item.verificationRevenueTotal,
    generalBusinessExpenses,
    generalBusinessExpenseFacts,
    generalBusinessExpenseTotal: item.generalBusinessExpenseTotal,
    ratio: item.ratio,
    warnings,
  };
}

function removeValue(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export const mainBudgetAnalysisStorage = {
  load(): MainBudgetAnalysisResult | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      const envelope = record(JSON.parse(raw));
      if (!envelope || envelope.schemaVersion !== SCHEMA_VERSION) {
        removeValue(STORAGE_KEY);
        return null;
      }
      const result = analysisResult(envelope.result);
      if (!result) removeValue(STORAGE_KEY);
      return result;
    } catch {
      removeValue(STORAGE_KEY);
      return null;
    }
  },

  save(result: MainBudgetAnalysisResult): boolean {
    const sanitized = analysisResult(result);
    if (!sanitized) throw new TypeError("저장할 본예산 분석 결과가 올바르지 않습니다.");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, result: sanitized }));
      return true;
    } catch {
      return false;
    }
  },

  clear(): boolean {
    return removeValue(STORAGE_KEY);
  },

  migrateLegacy(): boolean {
    let migrated = true;
    for (const key of LEGACY_KEYS) {
      migrated = removeValue(key) && migrated;
    }
    return migrated;
  },
};
