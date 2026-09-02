import type { BudgetLogicalRow } from "./analysisTypes";
import type { PdfImagePage } from "./extractPdfPages";
import { normalizePdfLines, type PdfLineItem } from "./normalizePdfLines";

export type OcrProgress = {
  phase: "ocr";
  completed: number;
  total: number;
};

type TesseractModule = typeof import("tesseract.js");
type TesseractWorker = Awaited<ReturnType<TesseractModule["createWorker"]>>;

const ANALYSIS_SCALE = 2;

function abortError(): DOMException {
  return new DOMException("OCR was aborted.", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
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
): Promise<BudgetLogicalRow[]> {
  throwIfAborted(signal);
  if (pages.length === 0) return [];

  let completedPages = 0;
  let lastProgress = -1;
  const report = (completed: number) => {
    const bounded = Math.min(pages.length, Math.max(0, completed));
    if (bounded <= lastProgress) return;
    lastProgress = bounded;
    onProgress({ phase: "ocr", completed: bounded, total: pages.length });
  };
  report(0);
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
      logger: ({ progress }) => {
        if (!Number.isFinite(progress)) return;
        report(completedPages + Math.min(1, Math.max(0, progress)));
      },
    });
    try {
      worker = await awaitWithAbort(workerPromise, signal);
    } catch (error) {
      if (signal.aborted) {
        void workerPromise.then((lateWorker) => terminateOnce(lateWorker)).catch(() => undefined);
      }
      throw error;
    }

    const rows: BudgetLogicalRow[] = [];
    for (const { pageNumber, page } of pages) {
      throwIfAborted(signal);
      let canvas: HTMLCanvasElement | undefined;
      try {
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
        rows.push(...wordsFromResult(result, pageNumber, viewport.height));
        completedPages += 1;
        report(completedPages);
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
