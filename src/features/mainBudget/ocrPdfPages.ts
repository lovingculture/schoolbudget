import type { BudgetLogicalRow } from "./analysisTypes";
import type { PdfImagePage } from "./extractPdfPages";
import { normalizePdfLines, type PdfLineItem } from "./normalizePdfLines";

export type OcrProgress = {
  phase: "ocr-initializing" | "ocr-rendering" | "ocr-recognizing";
  status: string;
  completed: number;
  total: number;
};

export type OcrPageDiagnostic = {
  pageNumber: number;
  rowCount: number;
  averageConfidence: number | null;
  rows: BudgetLogicalRow[];
};

export const OCR_ASSET_LOAD_ERROR_MESSAGE = "OCR 파일을 불러오지 못했습니다. 인터넷 연결 또는 네트워크 권한을 확인해 주세요.";

type TesseractModule = typeof import("tesseract.js");
type TesseractWorker = Awaited<ReturnType<TesseractModule["createWorker"]>>;

const ANALYSIS_SCALE = 2;
const INITIALIZATION_PROGRESS_CEILING = 0.1;

function abortError(): DOMException {
  return new DOMException("OCR was aborted.", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
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

function wordsFromResult(
  result: Awaited<ReturnType<TesseractWorker["recognize"]>>,
  pageNumber: number,
  viewportHeight: number,
): BudgetLogicalRow[] {
  const items: PdfLineItem[] = [];
  for (const block of result.data.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          const text = word.text.trim();
          if (!text) continue;
          const { x0, y0, x1, y1 } = word.bbox;
          items.push({
            str: text,
            x: x0 / ANALYSIS_SCALE,
            y: (viewportHeight - y1) / ANALYSIS_SCALE,
            width: Math.max(0, x1 - x0) / ANALYSIS_SCALE,
            height: Math.max(0, y1 - y0) / ANALYSIS_SCALE,
            confidence: word.confidence,
          });
        }
      }
    }
  }
  return normalizePdfLines(items, pageNumber);
}

export async function ocrPdfPages(
  pages: readonly PdfImagePage[],
  signal: AbortSignal,
  onProgress: (progress: OcrProgress) => void,
  onDiagnostic?: (diagnostic: OcrPageDiagnostic) => void,
): Promise<BudgetLogicalRow[]> {
  throwIfAborted(signal);
  if (pages.length === 0) return [];

  let completedPages = 0;
  let activePageIndex: number | undefined;
  let initializationStage = -1;
  let initializationStatus = "";
  let lastProgress: OcrProgress | undefined;
  const report = (phase: OcrProgress["phase"], status: string, completed: number) => {
    const bounded = Math.min(pages.length, Math.max(0, completed));
    const monotonicCompleted = Math.max(lastProgress?.completed ?? 0, bounded);
    if (lastProgress?.completed === monotonicCompleted
      && lastProgress.phase === phase
      && lastProgress.status === status) return;
    lastProgress = { phase, status, completed: monotonicCompleted, total: pages.length };
    onProgress(lastProgress);
  };
  report("ocr-initializing", "loading OCR worker", 0);
  throwIfAborted(signal);

  let worker: TesseractWorker | undefined;
  let termination: Promise<unknown> | undefined;
  let primaryError: unknown;
  const terminateOnce = (target: TesseractWorker) => {
    termination ??= Promise.resolve(target.terminate());
    return termination;
  };

  try {
    const tesseract = await awaitWithAbort(import("tesseract.js"), signal);
    const workerPromise = tesseract.createWorker("kor+eng", undefined, {
      logger: ({ progress, status }) => {
        if (!Number.isFinite(progress)) return;
        const fraction = Math.min(1, Math.max(0, progress));
        if (activePageIndex === undefined) {
          if (status !== initializationStatus) {
            initializationStatus = status;
            initializationStage += 1;
          }
          const stageStart = INITIALIZATION_PROGRESS_CEILING * (1 - (2 ** -initializationStage));
          const stageEnd = INITIALIZATION_PROGRESS_CEILING * (1 - (2 ** -(initializationStage + 1)));
          report("ocr-initializing", status, stageStart + ((stageEnd - stageStart) * fraction));
          return;
        }
        const pageProgress = activePageIndex === 0
          ? INITIALIZATION_PROGRESS_CEILING + (fraction * (1 - INITIALIZATION_PROGRESS_CEILING))
          : activePageIndex + fraction;
        report("ocr-recognizing", status, pageProgress);
      },
    });
    try {
      worker = await awaitWithAbort(workerPromise, signal);
    } catch (error) {
      if (isAbortError(error)) {
        // Tesseract exposes no worker handle until createWorker resolves. This guarded
        // continuation is the earliest possible point to terminate a late worker and
        // also consumes a late creation rejection so it cannot become unhandled.
        void workerPromise.then(
          (lateWorker) => terminateOnce(lateWorker),
          () => undefined,
        ).catch(() => undefined);
        throw error;
      }
      throw new Error(OCR_ASSET_LOAD_ERROR_MESSAGE, { cause: error });
    }

    const rows: BudgetLogicalRow[] = [];
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const { pageNumber, page } = pages[pageIndex];
      throwIfAborted(signal);
      let canvas: HTMLCanvasElement | undefined;
      try {
        activePageIndex = pageIndex;
        const pageStart = pageIndex === 0 ? INITIALIZATION_PROGRESS_CEILING : pageIndex;
        report("ocr-rendering", "rendering page", pageStart);
        const viewport = page.getViewport({ scale: ANALYSIS_SCALE });
        canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) throw new Error("Canvas 2D context is unavailable for OCR.");
        const renderTask = page.render({ canvas, canvasContext, viewport });
        await awaitWithAbort(renderTask.promise, signal, () => renderTask.cancel());
        throwIfAborted(signal);
        const result = await awaitWithAbort(worker.recognize(canvas, {}, { blocks: true }), signal);
        const pageRows = wordsFromResult(result, pageNumber, viewport.height);
        rows.push(...pageRows);
        const confidences = pageRows.map((row) => row.confidence).filter((value): value is number => value !== undefined);
        onDiagnostic?.({
          pageNumber,
          rowCount: pageRows.length,
          averageConfidence: confidences.length === 0
            ? null
            : confidences.reduce((sum, value) => sum + value, 0) / confidences.length,
          rows: pageRows,
        });
        completedPages += 1;
        report("ocr-recognizing", "page complete", completedPages);
        throwIfAborted(signal);
      } finally {
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        page.cleanup();
      }
    }
    return rows;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (worker) {
      try {
        await terminateOnce(worker);
      } catch (error) {
        if (primaryError === undefined) throw error;
      }
    }
  }
}
