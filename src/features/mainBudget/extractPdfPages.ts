import {
  getDocument,
  GlobalWorkerOptions,
  OPS,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { BudgetLogicalRow } from "./analysisTypes";
import { normalizePdfLines, type PdfLineItem } from "./normalizePdfLines";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type PdfExtractionProgress = {
  phase: "pdf-text";
  completed: number;
  total: number;
};

export type PdfTextPage = {
  pageNumber: number;
  page: PDFPageProxy;
  items: PdfLineItem[];
  rows: BudgetLogicalRow[];
};

export type PdfImagePage = {
  pageNumber: number;
  page: PDFPageProxy;
};

export type PdfExtractionMetadata = {
  fileName: string;
  pageCount: number;
  title?: string;
  author?: string;
};

export type PdfExtractionResult = {
  document: PDFDocumentProxy;
  textPages: PdfTextPage[];
  imagePages: PdfImagePage[];
  metadata: PdfExtractionMetadata;
  requiresOcr: boolean;
  cleanup: () => Promise<void>;
};

export type PdfPageDiagnostic = {
  pageNumber: number;
  classification: "text" | "ocr";
  rowCount: number;
  coverage: TextCoverage;
  hasLargeRaster: boolean | null;
  rows: BudgetLogicalRow[];
};

const budgetTextPattern = /(세입\s*(?:세출\s*)?예산|세출\s*예산|예산\s*(?:총괄|명세서|액|안)|본\s*예산|원가\s*통계\s*비목|목적\s*사업비\s*전입금|수익자\s*부담\s*수입|일반\s*업무\s*추진비)/;

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("PDF extraction was aborted.", "AbortError");
}

function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback(value);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(error);
    };
    const onAbort = () => fail(new DOMException("PDF extraction was aborted.", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    promise.then((value) => finish(resolve, value), fail);
  });
}

type PdfJsTextItem = PdfLineItem & {
  transform: ArrayLike<number>;
  width: number;
  height: number;
};

function isTextItem(item: unknown): item is PdfJsTextItem {
  return typeof item === "object"
    && item !== null
    && typeof (item as { str?: unknown }).str === "string"
    && "transform" in item
    && "width" in item
    && "height" in item;
}

function isBoilerplate(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (/^(?:page\s*)?[-–—]?\s*\d+(?:\s*\/\s*\d+)?\s*[-–—]?(?:\s*쪽)?$/i.test(text)) return true;
  if (/^\d{4}(?:\s*회계연도)?$/.test(text)) return true;
  return /^[가-힣A-Za-z0-9·\s]+(?:유치원|초등학교|중학교|고등학교)$/.test(text);
}

function isBudgetAmount(value: string): boolean {
  return /^\(?-?(?:\d{1,3}(?:,\d{3})+|\d{4,})(?:\.\d+)?\)?$/.test(value.replace(/\s/g, ""));
}

type TextCoverage = {
  hasBudgetSignal: boolean;
  hasLabelAmountRow: boolean;
  meaningfulCellCount: number;
  denseTextLength: number;
};

function textCoverage(rows: readonly BudgetLogicalRow[]): TextCoverage {
  const meaningful = rows.flatMap((row) => row.cells)
    .map((cell) => String(cell).trim())
    .filter((text) => !isBoilerplate(text));
  const combined = meaningful.join(" ");
  const hasLabelAmountRow = rows.some((row) => {
    const cells = row.cells.map((cell) => String(cell).trim()).filter((cell) => !isBoilerplate(cell));
    return cells.some((cell) => /[가-힣]{2,}/.test(cell)) && cells.some(isBudgetAmount);
  });
  return {
    hasBudgetSignal: budgetTextPattern.test(combined.replace(/\s/g, "")),
    hasLabelAmountRow,
    meaningfulCellCount: meaningful.length,
    denseTextLength: combined.replace(/[\s\p{P}\p{S}]/gu, "").length,
  };
}

function hasMeaningfulText(coverage: TextCoverage): boolean {
  return coverage.hasBudgetSignal
    || coverage.hasLabelAmountRow
    || (coverage.meaningfulCellCount >= 4 && coverage.denseTextLength >= 40);
}

function hasDenseTextCoverage(coverage: TextCoverage): boolean {
  return coverage.meaningfulCellCount >= 4 && coverage.denseTextLength >= 40;
}

type PdfOperatorList = {
  fnArray: ArrayLike<number>;
  argsArray?: ArrayLike<unknown>;
};

const rasterOperators = new Set<number>([
  OPS.paintImageMaskXObject,
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
]);

function imageDimensions(args: unknown): { width: number; height: number } | null {
  if (!Array.isArray(args)) return null;
  const object = args.find((value): value is { width: number; height: number } => (
    typeof value === "object" && value !== null
    && typeof (value as { width?: unknown }).width === "number"
    && typeof (value as { height?: unknown }).height === "number"
  ));
  if (object) return { width: object.width, height: object.height };
  const numbers = args.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return numbers.length < 2 ? null : { width: Math.abs(numbers.at(-2)!), height: Math.abs(numbers.at(-1)!) };
}

function hasLargeRaster(operatorList: PdfOperatorList): boolean {
  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    if (!rasterOperators.has(operatorList.fnArray[index])) continue;
    const dimensions = imageDimensions(operatorList.argsArray?.[index]);
    if (dimensions && dimensions.width * dimensions.height >= 200_000) return true;
  }
  return false;
}

function stringMetadata(info: Record<string, unknown>, key: string): Record<string, string> {
  const value = info[key];
  return typeof value === "string" && value.trim() ? { [key.toLowerCase()]: value } : {};
}

export async function extractPdfPages(
  file: File,
  signal: AbortSignal,
  onProgress: (progress: PdfExtractionProgress) => void,
  onDiagnostic?: (diagnostic: PdfPageDiagnostic) => void,
): Promise<PdfExtractionResult> {
  throwIfAborted(signal);
  const source = new Uint8Array(await awaitWithAbort(file.arrayBuffer(), signal));
  throwIfAborted(signal);
  const loadingTask = getDocument({ data: source });
  let cleanupPromise: Promise<void> | undefined;
  const cleanup = () => {
    cleanupPromise ??= loadingTask.destroy();
    return cleanupPromise;
  };
  try {
    const document = await awaitWithAbort(loadingTask.promise, signal);
    throwIfAborted(signal);
    const { info } = await awaitWithAbort(document.getMetadata(), signal);
    const metadata: PdfExtractionMetadata = {
      fileName: file.name,
      pageCount: document.numPages,
      ...stringMetadata(info as Record<string, unknown>, "Title"),
      ...stringMetadata(info as Record<string, unknown>, "Author"),
    };
    const textPages: PdfTextPage[] = [];
    const imagePages: PdfImagePage[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      throwIfAborted(signal);
      const page = await awaitWithAbort(document.getPage(pageNumber), signal);
      const content = await awaitWithAbort(page.getTextContent(), signal);
      const items: PdfLineItem[] = [];
      for (const item of content.items) {
        if (!isTextItem(item)) continue;
        items.push({
          str: item.str,
          transform: item.transform,
          width: item.width,
          height: item.height,
        });
      }
      const rows = normalizePdfLines(items, pageNumber);
      const coverage = textCoverage(rows);
      let sparseRasterPage = false;
      let largeRaster: boolean | null = null;
      if (hasMeaningfulText(coverage) && !hasDenseTextCoverage(coverage)) {
        const operatorList = await awaitWithAbort(page.getOperatorList() as Promise<PdfOperatorList>, signal);
        largeRaster = hasLargeRaster(operatorList);
        sparseRasterPage = largeRaster;
      }
      const classification = hasMeaningfulText(coverage) && !sparseRasterPage ? "text" : "ocr";
      if (classification === "text") {
        textPages.push({ pageNumber, page, items, rows });
      } else {
        imagePages.push({ pageNumber, page });
      }
      onDiagnostic?.({ pageNumber, classification, rowCount: rows.length, coverage, hasLargeRaster: largeRaster, rows });
      onProgress({ phase: "pdf-text", completed: pageNumber, total: document.numPages });
      throwIfAborted(signal);
    }

    return {
      document,
      textPages,
      imagePages,
      metadata,
      requiresOcr: imagePages.length > 0,
      cleanup,
    };
  } catch (error) {
    try {
      void cleanup().catch(() => undefined);
    } catch {
      // Preserve the extraction or abort error when destruction itself fails.
    }
    throw error;
  }
}
