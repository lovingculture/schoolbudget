import { beforeEach, describe, expect, it, vi } from "vitest";

const tesseractMock = vi.hoisted(() => ({
  createWorker: vi.fn(),
}));

vi.mock("tesseract.js", () => ({
  createWorker: tesseractMock.createWorker,
}));

import type { PdfImagePage } from "./extractPdfPages";
import {
  OCR_ASSET_LOAD_ERROR_MESSAGE,
  ocrPdfPages,
  type OcrProgress,
} from "./ocrPdfPages";
import { isReliableBudgetRow } from "./parseBudgetSummary";

type Logger = (message: {
  jobId: string;
  progress: number;
  status: string;
  userJobId: string;
  workerId: string;
}) => void;

type TestCanvas = HTMLCanvasElement & { context: CanvasRenderingContext2D };

function loggerMessage(progress: number, status = "recognizing text") {
  return {
    jobId: "job-1",
    progress,
    status,
    userJobId: "user-job-1",
    workerId: "worker-1",
  };
}

function ocrPage(words: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }>) {
  return {
    jobId: "job-1",
    data: {
      blocks: [{
        paragraphs: [{
          lines: [{
            words,
            text: words.map(({ text }) => text).join(" "),
            confidence: Math.min(...words.map(({ confidence }) => confidence)),
            bbox: words.reduce((bbox, word) => ({
              x0: Math.min(bbox.x0, word.bbox.x0),
              y0: Math.min(bbox.y0, word.bbox.y0),
              x1: Math.max(bbox.x1, word.bbox.x1),
              y1: Math.max(bbox.y1, word.bbox.y1),
            }), { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }),
            baseline: { x0: 0, y0: 0, x1: 0, y1: 0 },
            rowAttributes: { ascenders: 0, descenders: 0, rowHeight: 0 },
          }],
          text: "",
          confidence: 90,
          bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
          is_ltr: true,
        }],
        text: "",
        confidence: 90,
        bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
        blocktype: "FLOWING_TEXT",
        page: null,
      }],
      text: "",
      confidence: 90,
    },
  };
}

function pdfImagePage(pageNumber: number, events: string[], renderPromise: Promise<void> = Promise.resolve()) {
  const cleanup = vi.fn(() => events.push(`cleanup-${pageNumber}`));
  const cancel = vi.fn();
  const render = vi.fn(() => {
    events.push(`render-${pageNumber}`);
    return { promise: renderPromise, cancel };
  });
  const page = {
    getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: 300 * scale, height: 400 * scale, scale })),
    render,
    cleanup,
  };
  return { imagePage: { pageNumber, page } as unknown as PdfImagePage, page, cleanup, render, cancel };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function installCanvasFactory() {
  const canvases: TestCanvas[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
    if (tagName.toLowerCase() !== "canvas") return originalCreateElement(tagName, options);
    const canvas = originalCreateElement("canvas") as TestCanvas;
    const context = { canvas } as unknown as CanvasRenderingContext2D;
    canvas.context = context;
    vi.spyOn(canvas, "getContext").mockReturnValue(context);
    canvases.push(canvas);
    return canvas;
  }) as typeof document.createElement);
  return canvases;
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs = 100) {
  return Promise.race([
    promise.then(
      (value) => ({ status: "resolved" as const, value }),
      (error: unknown) => ({ status: "rejected" as const, error }),
    ),
    new Promise<{ status: "timeout" }>((resolve) => {
      setTimeout(() => resolve({ status: "timeout" }), timeoutMs);
    }),
  ]);
}

describe("ocrPdfPages", () => {
  beforeEach(() => {
    tesseractMock.createWorker.mockReset();
    vi.restoreAllMocks();
  });

  it("does not load Tesseract when there are no image pages", async () => {
    const rows = await ocrPdfPages([], new AbortController().signal, vi.fn());

    expect(rows).toEqual([]);
    expect(tesseractMock.createWorker).not.toHaveBeenCalled();
  });

  it("uses the Tesseract 7 worker contract, renders pages sequentially, and emits stable positioned rows", async () => {
    const events: string[] = [];
    const canvases = installCanvasFactory();
    const first = pdfImagePage(2, events);
    const second = pdfImagePage(5, events);
    let logger: Logger = () => undefined;
    const terminate = vi.fn(async () => {
      events.push("terminate");
      return { jobId: "terminate", data: {} };
    });
    const recognize = vi.fn(async (
      canvas: HTMLCanvasElement,
      _options?: object,
      _output?: object,
    ) => {
      const call = recognize.mock.calls.length;
      events.push(`recognize-${call}`);
      logger(loggerMessage(0));
      logger(loggerMessage(call === 1 ? 0.6 : 0.25));
      logger(loggerMessage(1));
      if (call === 1) {
        return ocrPage([
          { text: "목적사업비전입금", confidence: 92, bbox: { x0: 20, y0: 40, x1: 180, y1: 60 } },
          { text: "1,000", confidence: 68, bbox: { x0: 400, y0: 40, x1: 470, y1: 60 } },
        ]);
      }
      expect(canvas).toBe(canvases[1]);
      return ocrPage([
        { text: "세출합계", confidence: 95, bbox: { x0: 20, y0: 100, x1: 100, y1: 120 } },
        { text: "1,000", confidence: 94, bbox: { x0: 400, y0: 100, x1: 470, y1: 120 } },
      ]);
    });
    tesseractMock.createWorker.mockImplementation(async (languages, oem, options) => {
      events.push("create-worker");
      expect(languages).toBe("kor+eng");
      expect(oem).toBeUndefined();
      expect(options).toEqual({ logger: expect.any(Function) });
      logger = options.logger;
      logger(loggerMessage(0, "loading tesseract core"));
      logger(loggerMessage(1, "loading tesseract core"));
      logger(loggerMessage(0, "loading language traineddata"));
      logger(loggerMessage(1, "loading language traineddata"));
      logger(loggerMessage(0, "initializing api"));
      logger(loggerMessage(1, "initialized api"));
      return { recognize, terminate };
    });
    const progress: OcrProgress[] = [];

    const rows = await ocrPdfPages(
      [first.imagePage, second.imagePage],
      new AbortController().signal,
      (update) => progress.push(update),
    );

    expect(tesseractMock.createWorker).toHaveBeenCalledTimes(1);
    expect(recognize).toHaveBeenCalledTimes(2);
    expect(recognize.mock.calls.map(([, options, output]) => [options, output])).toEqual([
      [{}, { blocks: true }],
      [{}, { blocks: true }],
    ]);
    expect(events).toEqual([
      "create-worker",
      "render-2",
      "recognize-1",
      "cleanup-2",
      "render-5",
      "recognize-2",
      "cleanup-5",
      "terminate",
    ]);
    expect(rows).toEqual([
      {
        cells: ["목적사업비전입금", "1,000"],
        sourcePage: 2,
        sourceRow: 1,
        confidence: 0.68,
        coordinates: [
          { x: 10, y: 370, width: 80, height: 10 },
          { x: 200, y: 370, width: 35, height: 10 },
        ],
      },
      {
        cells: ["세출합계", "1,000"],
        sourcePage: 5,
        sourceRow: 1,
        confidence: 0.94,
        coordinates: [
          { x: 10, y: 340, width: 40, height: 10 },
          { x: 200, y: 340, width: 35, height: 10 },
        ],
      },
    ]);
    expect(isReliableBudgetRow(rows[0])).toBe(false);
    expect(isReliableBudgetRow(rows[1])).toBe(true);
    const initialization = progress.filter(({ phase }) => phase === "ocr-initializing");
    expect(initialization.map(({ status }) => status)).toEqual([
      "loading OCR worker",
      "loading tesseract core",
      "loading tesseract core",
      "loading language traineddata",
      "loading language traineddata",
      "initializing api",
      "initialized api",
    ]);
    expect(initialization.every(({ completed }) => completed < 1)).toBe(true);
    expect(progress).toEqual(expect.arrayContaining([
      { phase: "ocr-recognizing", status: "recognizing text", completed: 0.1, total: 2 },
      { phase: "ocr-recognizing", status: "recognizing text", completed: 0.64, total: 2 },
      { phase: "ocr-recognizing", status: "recognizing text", completed: 1, total: 2 },
      { phase: "ocr-recognizing", status: "recognizing text", completed: 1.25, total: 2 },
      { phase: "ocr-recognizing", status: "page complete", completed: 2, total: 2 },
    ]));
    expect(progress.every((update, index) => index === 0 || update.completed >= progress[index - 1].completed)).toBe(true);
    expect(first.cleanup).toHaveBeenCalledTimes(1);
    expect(second.cleanup).toHaveBeenCalledTimes(1);
    expect(canvases).toHaveLength(2);
    expect(canvases.every((canvas) => canvas.width === 0 && canvas.height === 0)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("image");
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("cleans the current page and terminates the worker once when recognition fails", async () => {
    const events: string[] = [];
    const canvases = installCanvasFactory();
    const failed = pdfImagePage(3, events);
    const recognitionError = new Error("OCR failed");
    const terminate = vi.fn().mockResolvedValue({ jobId: "terminate", data: {} });
    tesseractMock.createWorker.mockResolvedValue({
      recognize: vi.fn().mockRejectedValue(recognitionError),
      terminate,
    });

    await expect(ocrPdfPages([failed.imagePage], new AbortController().signal, vi.fn()))
      .rejects.toBe(recognitionError);

    expect(failed.cleanup).toHaveBeenCalledTimes(1);
    expect(canvases[0]).toMatchObject({ width: 0, height: 0 });
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("cleans the page and worker when a canvas context cannot be acquired", async () => {
    const events: string[] = [];
    const unavailable = pdfImagePage(4, events);
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(null);
    vi.spyOn(document, "createElement").mockReturnValue(canvas);
    const terminate = vi.fn().mockResolvedValue({ jobId: "terminate", data: {} });
    tesseractMock.createWorker.mockResolvedValue({ recognize: vi.fn(), terminate });

    await expect(ocrPdfPages([unavailable.imagePage], new AbortController().signal, vi.fn()))
      .rejects.toThrow("Canvas 2D context is unavailable for OCR.");

    expect(unavailable.cleanup).toHaveBeenCalledTimes(1);
    expect(canvas).toMatchObject({ width: 0, height: 0 });
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("aborts a pending recognition promptly, skips later pages, and terminates exactly once", async () => {
    const events: string[] = [];
    const canvases = installCanvasFactory();
    const first = pdfImagePage(1, events);
    const second = pdfImagePage(2, events);
    const controller = new AbortController();
    const recognize = vi.fn(() => new Promise(() => undefined));
    const terminate = vi.fn().mockResolvedValue({ jobId: "terminate", data: {} });
    tesseractMock.createWorker.mockResolvedValue({ recognize, terminate });

    const pending = ocrPdfPages([first.imagePage, second.imagePage], controller.signal, vi.fn());
    await vi.waitFor(() => expect(recognize).toHaveBeenCalledTimes(1));
    controller.abort();

    const outcome = await settleWithin(pending);
    expect(outcome).toMatchObject({ status: "rejected", error: { name: "AbortError" } });
    expect(first.cleanup).toHaveBeenCalledTimes(1);
    expect(second.render).not.toHaveBeenCalled();
    expect(canvases[0]).toMatchObject({ width: 0, height: 0 });
    expect(terminate).toHaveBeenCalledTimes(1);
  });

  it("rejects promptly when aborted while worker creation is still pending", async () => {
    const events: string[] = [];
    const imagePage = pdfImagePage(1, events);
    const creation = deferred<never>();
    const controller = new AbortController();
    tesseractMock.createWorker.mockReturnValue(creation.promise);

    const pending = ocrPdfPages([imagePage.imagePage], controller.signal, vi.fn());
    await vi.waitFor(() => expect(tesseractMock.createWorker).toHaveBeenCalledTimes(1));
    controller.abort();

    expect(await settleWithin(pending)).toMatchObject({
      status: "rejected",
      error: { name: "AbortError" },
    });
    expect(imagePage.render).not.toHaveBeenCalled();
  });

  it("terminates a worker exactly once when creation resolves after an abort", async () => {
    const events: string[] = [];
    const imagePage = pdfImagePage(1, events);
    const creation = deferred<{ recognize: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }>();
    const controller = new AbortController();
    const terminate = vi.fn().mockResolvedValue({ jobId: "terminate", data: {} });
    const lateWorker = { recognize: vi.fn(), terminate };
    tesseractMock.createWorker.mockReturnValue(creation.promise);

    const pending = ocrPdfPages([imagePage.imagePage], controller.signal, vi.fn());
    await vi.waitFor(() => expect(tesseractMock.createWorker).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });

    creation.resolve(lateWorker);
    await vi.waitFor(() => expect(terminate).toHaveBeenCalledTimes(1));
    expect(imagePage.render).not.toHaveBeenCalled();
  });

  it("handles a delayed worker-creation rejection after abort without replacing AbortError", async () => {
    const events: string[] = [];
    const imagePage = pdfImagePage(1, events);
    const creation = deferred<never>();
    const controller = new AbortController();
    tesseractMock.createWorker.mockReturnValue(creation.promise);

    const pending = ocrPdfPages([imagePage.imagePage], controller.signal, vi.fn());
    await vi.waitFor(() => expect(tesseractMock.createWorker).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });

    creation.reject(new Error("late asset failure"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(imagePage.render).not.toHaveBeenCalled();
  });

  it("surfaces an actionable network message when worker assets fail to load", async () => {
    const events: string[] = [];
    const imagePage = pdfImagePage(1, events);
    const assetError = new Error("failed to fetch traineddata");
    tesseractMock.createWorker.mockRejectedValue(assetError);

    const pending = ocrPdfPages([imagePage.imagePage], new AbortController().signal, vi.fn());

    await expect(pending).rejects.toMatchObject({
      message: OCR_ASSET_LOAD_ERROR_MESSAGE,
      cause: assetError,
    });
    expect(imagePage.render).not.toHaveBeenCalled();
  });

  it("cancels a pending render and preserves AbortError when cancellation rejects the render", async () => {
    const events: string[] = [];
    const render = deferred<void>();
    const imagePage = pdfImagePage(1, events, render.promise);
    imagePage.cancel.mockImplementation(() => render.reject(new Error("render cancelled")));
    installCanvasFactory();
    const controller = new AbortController();
    const terminate = vi.fn().mockResolvedValue({ jobId: "terminate", data: {} });
    const recognize = vi.fn();
    tesseractMock.createWorker.mockResolvedValue({ recognize, terminate });

    const pending = ocrPdfPages([imagePage.imagePage], controller.signal, vi.fn());
    await vi.waitFor(() => expect(imagePage.render).toHaveBeenCalledTimes(1));
    controller.abort();

    expect(await settleWithin(pending)).toMatchObject({
      status: "rejected",
      error: { name: "AbortError" },
    });
    expect(imagePage.cancel).toHaveBeenCalledTimes(1);
    expect(imagePage.cleanup).toHaveBeenCalledTimes(1);
    expect(recognize).not.toHaveBeenCalled();
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
