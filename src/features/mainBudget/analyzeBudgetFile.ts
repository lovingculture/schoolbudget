import JSZip from "jszip";
import { analyzeMainBudget } from "./analyzeMainBudget";
import type {
  BudgetFileFormat,
  BudgetLogicalRow,
  GeneralBusinessExpense,
  MainBudgetAnalysisResult,
  ParsedMainBudgetInput,
  RevenueFact,
  RevenueFactCollection,
} from "./analysisTypes";
import { extractWorkbookRows } from "./extractWorkbookRows";
import { parseBudgetSummary } from "./parseBudgetSummary";
import { parseExpenditureStatement } from "./parseExpenditureStatement";
import { parseRevenueStatement } from "./parseRevenueStatement";
import { parseDetailWorkbookIdentity } from "./parseDetailWorkbookIdentity";

export type AnalysisProgress = {
  phase: "reading" | "parsing" | "complete";
  completed: number;
  total: number;
};

export type AnalyzeBudgetFileOptions = {
  signal: AbortSignal;
  onProgress: (progress: AnalysisProgress) => void;
  onDiagnostic?: (diagnostic: AnalysisDiagnostic) => void;
};

export type ParserDiagnostic = {
  kind: "parser";
  summary: ReturnType<typeof parseBudgetSummary>;
  revenue: ReturnType<typeof parseRevenueStatement>;
  expenditure: ReturnType<typeof parseExpenditureStatement>;
};

export type AnalysisDiagnostic = ParserDiagnostic;

const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;
const ZIP_MAGICS = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
] as const;

type BudgetSection = "summary" | "revenue" | "expenditure";
type ExplicitMoneyUnit = "won" | "thousand-won" | "million-won";

function abortError(): DOMException {
  return new DOMException("파일 분석이 취소되었습니다.", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isFileLike(value: unknown): value is File {
  return typeof value === "object"
    && value !== null
    && typeof (value as { name?: unknown }).name === "string"
    && (typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
      || typeof (value as { slice?: unknown }).slice === "function");
}

function extensionFormat(fileName: string): BudgetFileFormat | null {
  const match = /\.([^.]+)$/.exec(fileName.trim());
  const extension = match?.[1].toLowerCase();
  if (extension === "xls" || extension === "xlsx") return extension;
  return null;
}

function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
  return magic.every((byte, index) => bytes[index] === byte);
}

function detectedFormat(bytes: Uint8Array): BudgetFileFormat | null {
  if (startsWith(bytes, XLS_MAGIC)) return "xls";
  if (ZIP_MAGICS.some((magic) => startsWith(bytes, magic))) return "xlsx";
  return null;
}

function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal, onAbort?: () => void): Promise<T> {
  throwIfAborted(signal);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", handleAbort);
      callback(value);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", handleAbort);
      reject(error);
    };
    const handleAbort = () => {
      try {
        onAbort?.();
      } finally {
        fail(abortError());
      }
    };
    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) {
      handleAbort();
      return;
    }
    promise.then((value) => finish(resolve, value), fail);
  });
}

async function readFileBytes(file: File, signal: AbortSignal): Promise<Uint8Array> {
  throwIfAborted(signal);
  if (typeof (file as File & { arrayBuffer?: unknown }).arrayBuffer === "function") {
    const buffer = await awaitWithAbort(file.arrayBuffer(), signal);
    throwIfAborted(signal);
    return new Uint8Array(buffer);
  }
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    const cleanup = () => signal.removeEventListener("abort", handleAbort);
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleAbort = () => {
      try {
        reader.abort();
      } finally {
        fail(abortError());
      }
    };
    reader.onerror = () => fail(reader.error ?? new Error("파일을 읽지 못했습니다."));
    reader.onabort = () => fail(abortError());
    reader.onload = () => {
      if (settled) return;
      if (!(reader.result instanceof ArrayBuffer)) {
        fail(new Error("파일을 바이너리로 읽지 못했습니다."));
        return;
      }
      settled = true;
      cleanup();
      resolve(reader.result);
    };
    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) handleAbort();
    else reader.readAsArrayBuffer(file);
  });
  throwIfAborted(signal);
  return new Uint8Array(buffer);
}

function requiredFormat(file: File): BudgetFileFormat {
  const format = extensionFormat(file.name);
  if (!format) {
    throw new Error(`${file.name}: XLS, XLSX 형식의 Excel 파일만 선택해 주세요.`);
  }
  return format;
}

function verifyContent(file: File, format: BudgetFileFormat, bytes: Uint8Array): void {
  const content = detectedFormat(bytes);
  if (!content) throw new Error(`${file.name}: 손상되었거나 지원하지 않는 ${format.toUpperCase()} 파일입니다.`);
  if (content !== format) {
    throw new Error(`${file.name}: 파일 확장자와 내용이 일치하지 않습니다. 올바른 ${content.toUpperCase()} 파일을 선택해 주세요.`);
  }
}

function xmlAttribute(element: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`).exec(element);
  return match?.[2] ?? null;
}

async function validateXlsxPackage(file: File, bytes: Uint8Array, signal: AbortSignal): Promise<void> {
  try {
    const zip = await awaitWithAbort(JSZip.loadAsync(bytes), signal);
    const contentTypesEntry = zip.file("[Content_Types].xml");
    const workbookEntry = zip.file("xl/workbook.xml");
    if (!contentTypesEntry || !workbookEntry) throw new Error("required OOXML spreadsheet parts are missing");
    const contentTypes = await awaitWithAbort(contentTypesEntry.async("string"), signal);
    const isSpreadsheetWorkbook = (contentTypes.match(/<Override\b[^>]*>/g) ?? []).some((override) => (
      xmlAttribute(override, "PartName") === "/xl/workbook.xml"
      && xmlAttribute(override, "ContentType") === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"
    ));
    if (!isSpreadsheetWorkbook) throw new Error("workbook content type is not an XLSX spreadsheet");
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new Error(`${file.name}: 손상되었거나 유효한 Excel OOXML 패키지가 아닙니다.`, { cause: error });
  }
}

function rowText(row: BudgetLogicalRow): string {
  return row.cells.map((cell) => typeof cell === "string" ? cell : "").join("").replace(/[\s\-:()（）\[\]·•・ㆍ]/g, "");
}

function sectionForHeading(row: BudgetLogicalRow): BudgetSection | null {
  const text = rowText(row);
  if (text.includes("세입예산명세서")) return "revenue";
  if (text.includes("세출예산명세서")) return "expenditure";
  if (text.includes("세입세출예산총괄") || (text.includes("세입세출예산서") && !text.includes("명세서"))) return "summary";
  return null;
}

function explicitUnit(value: unknown): ExplicitMoneyUnit | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s/g, "");
  const match = /^[(（]?단위[:：]?(백만원|천원|원)[)）]?$/.exec(normalized);
  if (!match) return null;
  if (match[1] === "원") return "won";
  if (match[1] === "천원") return "thousand-won";
  return "million-won";
}

function sectionUnits(rows: readonly BudgetLogicalRow[]): Partial<Record<BudgetSection, ExplicitMoneyUnit>> {
  const found = new Map<BudgetSection, Set<ExplicitMoneyUnit>>();
  let section: BudgetSection | null = null;
  for (const row of rows) {
    section = sectionForHeading(row) ?? section;
    if (!section) continue;
    const joinedText = row.cells.filter((cell): cell is string => typeof cell === "string").join("");
    for (const cell of [...row.cells, joinedText]) {
      const unit = explicitUnit(cell);
      if (!unit) continue;
      const units = found.get(section) ?? new Set<ExplicitMoneyUnit>();
      units.add(unit);
      found.set(section, units);
    }
  }
  const result: Partial<Record<BudgetSection, ExplicitMoneyUnit>> = {};
  for (const [target, units] of found) {
    if (units.size === 1) result[target] = [...units][0];
  }
  return result;
}

function amountInThousandWon(amount: number | null, unit: ExplicitMoneyUnit | undefined): number | null {
  if (amount === null || unit === undefined) return amount;
  if (unit === "won") return amount / 1_000;
  if (unit === "million-won") return amount * 1_000;
  return amount;
}

function scaledRevenueFact(fact: RevenueFact, unit: ExplicitMoneyUnit | undefined): RevenueFact {
  return { ...fact, amount: amountInThousandWon(fact.amount, unit) };
}

function scaledRevenueCollection(collection: RevenueFactCollection, unit: ExplicitMoneyUnit | undefined): RevenueFactCollection {
  return { ...collection, facts: collection.facts.map((fact) => scaledRevenueFact(fact, unit)) };
}

function scaledExpense(expense: GeneralBusinessExpense, unit: ExplicitMoneyUnit | undefined): GeneralBusinessExpense {
  return { ...expense, amount: amountInThousandWon(expense.amount, unit) };
}

function parsedInput(
  source: ParsedMainBudgetInput["source"],
  rows: BudgetLogicalRow[],
  onDiagnostic?: (diagnostic: AnalysisDiagnostic) => void,
): ParsedMainBudgetInput {
  const summary = parseBudgetSummary(rows);
  const revenue = parseRevenueStatement(rows);
  const expenditure = parseExpenditureStatement(rows);
  const detail = parseDetailWorkbookIdentity(rows, source.fileName);
  onDiagnostic?.({ kind: "parser", summary, revenue, expenditure });
  const missingSections = [
    [revenue.hasValidStructure || revenue.isReviewable, "세입예산명세서"],
    [expenditure.hasValidStructure || expenditure.isReviewable, "세출예산명세서"],
  ].filter(([valid]) => !valid).map(([, label]) => label);
  if (missingSections.length > 0) {
    throw new Error(`${source.fileName}: 필수 예산 구역의 구조를 확인할 수 없습니다 (${missingSections.join(", ")}).`);
  }
  const identity = summary.identity ?? detail.identity;
  if (!identity) {
    const rejectedType = summary.warnings.some((warning) => warning.code === "NON_MAIN_BUDGET_MARKER");
    throw new Error(rejectedType
      ? `${source.fileName}: 본예산이 아닌 문서입니다. 본예산 파일을 선택해 주세요.`
      : `${source.fileName}: 학교명, 회계연도, 본예산 구분을 확인할 수 없습니다.`);
  }
  const units = sectionUnits(rows);
  const summaryWarnings = summary.hasValidStructure || summary.isReviewable ? summary.warnings : [];
  return {
    source,
    identity,
    verificationRevenue: scaledRevenueCollection(revenue.verificationRevenue, units.revenue),
    generalBusinessExpenses: {
      facts: expenditure.expenses.map((expense) => scaledExpense(expense, units.expenditure)),
      isComplete: expenditure.isComplete,
    },
    warnings: [...summaryWarnings, ...detail.warnings, ...revenue.warnings, ...expenditure.warnings],
  };
}

function corruptFileError(file: File, format: BudgetFileFormat, cause: unknown): Error {
  return new Error(`${file.name}: 손상되었거나 지원하지 않는 ${format.toUpperCase()} 파일입니다.`, { cause });
}

export async function analyzeBudgetFile(file: File, options: AnalyzeBudgetFileOptions): Promise<MainBudgetAnalysisResult> {
  if (!isFileLike(file)) throw new Error("분석할 파일을 하나만 선택해 주세요.");
  throwIfAborted(options.signal);
  const format = requiredFormat(file);
  options.onProgress({ phase: "reading", completed: 0, total: 1 });
  const bytes = await readFileBytes(file, options.signal);
  verifyContent(file, format, bytes);
  if (format === "xlsx") await validateXlsxPackage(file, bytes, options.signal);
  let extracted;
  try {
    extracted = await extractWorkbookRows(file, { bytes, signal: options.signal });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw corruptFileError(file, format, error);
  }
  if (extracted.source.sheetCount === 0) {
    throw new Error(`${file.name}: 분석할 수 있는 시트가 없습니다.`);
  }
  throwIfAborted(options.signal);
  options.onProgress({ phase: "reading", completed: 1, total: 1 });
  throwIfAborted(options.signal);
  options.onProgress({ phase: "parsing", completed: 0, total: 1 });
  throwIfAborted(options.signal);
  const result = analyzeMainBudget(parsedInput(extracted.source, extracted.rows, options.onDiagnostic));
  throwIfAborted(options.signal);
  options.onProgress({ phase: "complete", completed: 1, total: 1 });
  throwIfAborted(options.signal);
  return result;
}
