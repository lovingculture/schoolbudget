import { beforeEach, describe, expect, it, vi } from "vitest";

const pdfJsMock = vi.hoisted(() => ({
  getDocument: vi.fn(),
  workerOptions: { workerSrc: "" },
}));

vi.mock("pdfjs-dist", () => ({
  getDocument: pdfJsMock.getDocument,
  GlobalWorkerOptions: pdfJsMock.workerOptions,
}));

import { extractPdfPages } from "./extractPdfPages";
import { normalizePdfLines, type PdfLineItem } from "./normalizePdfLines";
import { parseBudgetSummary } from "./parseBudgetSummary";
import { parseRevenueStatement } from "./parseRevenueStatement";

function textItem(
  str: string,
  x: number,
  y: number,
  width = 30,
  height = 10,
  confidence?: number,
): PdfLineItem {
  return {
    str,
    transform: [1, 0, 0, height, x, y],
    width,
    height,
    confidence,
  };
}

function page(items: PdfLineItem[]) {
  return {
    getTextContent: vi.fn().mockResolvedValue({ items, styles: new Map(), lang: null }),
  };
}

function pdfFile(bytes = [37, 80, 68, 70]): File {
  return {
    name: "2026-budget.pdf",
    type: "application/pdf",
    arrayBuffer: vi.fn().mockResolvedValue(Uint8Array.from(bytes).buffer),
  } as unknown as File;
}

function loadingTask(documentPromise: Promise<unknown>) {
  return {
    promise: documentPromise,
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs = 50) {
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

describe("normalizePdfLines", () => {
  it("groups nearby baselines, orders cells by x, and preserves coordinates and confidence", () => {
    const rows = normalizePdfLines([
      textItem("1,000", 160, 500.4, 32, 10, 0.91),
      textItem("다음 행", 30, 470, 44, 11, 0.88),
      textItem("예산액", 80, 500, 42, 10, 0.97),
      textItem("  ", 220, 500, 5, 10, 0.2),
    ], 7);

    expect(rows).toEqual([
      {
        cells: ["예산액", "1,000"],
        sourcePage: 7,
        sourceRow: 1,
        confidence: 0.91,
        coordinates: [
          { x: 80, y: 500, width: 42, height: 10 },
          { x: 160, y: 500.4, width: 32, height: 10 },
        ],
      },
      {
        cells: ["다음 행"],
        sourcePage: 7,
        sourceRow: 2,
        confidence: 0.88,
        coordinates: [{ x: 30, y: 470, width: 44, height: 11 }],
      },
    ]);
  });

  it("aligns omitted PDF cells to the header grid so shared parsers keep column indices", () => {
    const rows = normalizePdfLines([
      textItem("세입예산명세서", 40, 800, 100),
      textItem("목", 40, 760, 20),
      textItem("원가통계비목", 140, 760, 90),
      textItem("예산액", 300, 760, 45),
      textItem("전년도예산액", 400, 760, 85),
      textItem("목적사업비전입금", 140, 720, 120),
      textItem("1,000", 300, 720, 45),
      textItem("900", 400, 720, 30),
      textItem("세입합계", 140, 680, 60),
      textItem("1,000", 300, 680, 45),
    ], 3);

    expect(rows[2].cells).toEqual(["", "목적사업비전입금", "1,000", "900"]);
    expect(rows[2].coordinates).toEqual([
      { x: 40, y: 720, width: 0, height: 0 },
      { x: 140, y: 720, width: 120, height: 10 },
      { x: 300, y: 720, width: 45, height: 10 },
      { x: 400, y: 720, width: 30, height: 10 },
    ]);
    expect(parseRevenueStatement(rows).purposeRevenue.amount).toBe(1000);
  });

  it("builds one column grid from a PDF header split across nearby rows", () => {
    const rows = normalizePdfLines([
      textItem("세입예산명세서", 40, 800, 100),
      textItem("목", 40, 760, 20),
      textItem("원가통계비목", 140, 760, 90),
      textItem("예산액", 300, 748, 45),
      textItem("전년도예산액", 400, 748, 85),
      textItem("목적사업비전입금", 140, 710, 120),
      textItem("1,000", 300, 710, 45),
      textItem("900", 400, 710, 30),
      textItem("세입합계", 140, 680, 60),
      textItem("1,000", 300, 680, 45),
    ], 3);

    expect(rows[1].cells).toEqual(["목", "원가통계비목", "", ""]);
    expect(rows[2].cells).toEqual(["", "", "예산액", "전년도예산액"]);
    expect(rows[3].cells).toEqual(["", "목적사업비전입금", "1,000", "900"]);
    expect(parseRevenueStatement(rows).purposeRevenue.amount).toBe(1000);
  });

  it("extends the header grid with a label column connected by an amount coordinate", () => {
    const rows = normalizePdfLines([
      textItem("본예산", 40, 820, 50),
      textItem("세입세출예산총괄", 40, 800, 120),
      textItem("예산액", 300, 760, 45),
      textItem("전년도예산액", 400, 760, 85),
      textItem("세입예산총액", 40, 720, 90),
      textItem("1,000", 300, 720, 45),
      textItem("900", 400, 720, 30),
    ], 2);

    expect(rows[2].cells).toEqual(["", "예산액", "전년도예산액"]);
    expect(rows[3].cells).toEqual(["세입예산총액", "1,000", "900"]);
    expect(parseBudgetSummary(rows).totalRevenue.amount).toBe(1000);
  });
});

describe("extractPdfPages", () => {
  beforeEach(() => {
    pdfJsMock.getDocument.mockReset();
  });

  it("routes boilerplate-only pages to OCR while retaining pages with budget headings", async () => {
    const boilerplatePage = page([
      textItem("2026", 260, 780),
      textItem("- 1 -", 280, 30),
      textItem("가람초등학교", 230, 800),
    ]);
    const budgetPage = page([
      textItem("세입예산명세서", 140, 780, 100),
      textItem("예산액", 320, 730, 42),
      textItem("목적사업비전입금", 80, 690, 120),
    ]);
    const documentHandle = {
      numPages: 2,
      getPage: vi.fn()
        .mockResolvedValueOnce(boilerplatePage)
        .mockResolvedValueOnce(budgetPage),
      getMetadata: vi.fn().mockResolvedValue({
        info: { Title: "2026 본예산", Author: "가람초등학교" },
        metadata: null,
      }),
    };
    pdfJsMock.getDocument.mockReturnValue(loadingTask(Promise.resolve(documentHandle)));
    const progress: unknown[] = [];

    const result = await extractPdfPages(pdfFile(), new AbortController().signal, (update) => progress.push(update));

    expect(result.document).toBe(documentHandle);
    expect(result.textPages.map(({ pageNumber, rows }) => ({ pageNumber, rows }))).toEqual([
      {
        pageNumber: 2,
        rows: [
          expect.objectContaining({ cells: ["세입예산명세서"], sourcePage: 2, confidence: 1 }),
          expect.objectContaining({ cells: ["예산액"], sourcePage: 2, confidence: 1 }),
          expect.objectContaining({ cells: ["목적사업비전입금"], sourcePage: 2, confidence: 1 }),
        ],
      },
    ]);
    expect(result.imagePages).toEqual([{ pageNumber: 1, page: boilerplatePage }]);
    expect(result.requiresOcr).toBe(true);
    expect(result.metadata).toEqual({
      fileName: "2026-budget.pdf",
      pageCount: 2,
      title: "2026 본예산",
      author: "가람초등학교",
    });
    expect(progress).toEqual([
      { phase: "pdf-text", completed: 1, total: 2 },
      { phase: "pdf-text", completed: 2, total: 2 },
    ]);
  });

  it("retains a coordinate-shuffled budget heading split across individual PDF text items", async () => {
    const splitHeadingPage = page("세입예산명세서".split("").map((character, index) => (
      textItem(character, 100 + (index * 12), 780, 10)
    )).reverse());
    const documentHandle = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(splitHeadingPage),
      getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
    };
    pdfJsMock.getDocument.mockReturnValue(loadingTask(Promise.resolve(documentHandle)));

    const result = await extractPdfPages(pdfFile(), new AbortController().signal, () => undefined);

    expect(result.textPages).toHaveLength(1);
    expect(result.imagePages).toHaveLength(0);
    expect(result.requiresOcr).toBe(false);
  });

  it("retains a sparse continuation row containing a Korean label and budget-formatted amount", async () => {
    const sparsePage = page([
      textItem("교육활동지원", 80, 720, 90),
      textItem("1,234,000", 320, 720, 70),
    ]);
    const documentHandle = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(sparsePage),
      getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
    };
    pdfJsMock.getDocument.mockReturnValue(loadingTask(Promise.resolve(documentHandle)));

    const result = await extractPdfPages(pdfFile(), new AbortController().signal, () => undefined);

    expect(result.textPages).toHaveLength(1);
    expect(result.imagePages).toHaveLength(0);
  });

  it("stops before reading the next page when the signal is aborted", async () => {
    const controller = new AbortController();
    let pageReads = 0;
    const documentHandle = {
      numPages: 2,
      getPage: vi.fn(async () => {
        pageReads += 1;
        return page([textItem("세출예산명세서", 120, 780, 100)]);
      }),
      getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
    };
    const task = loadingTask(Promise.resolve(documentHandle));
    pdfJsMock.getDocument.mockReturnValue(task);

    const extraction = extractPdfPages(pdfFile(), controller.signal, () => controller.abort());

    await expect(extraction).rejects.toMatchObject({ name: "AbortError" });
    expect(pageReads).toBe(1);
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });

  it("rejects promptly and destroys the loading task once when aborted during document loading", async () => {
    const controller = new AbortController();
    const task = loadingTask(new Promise(() => undefined));
    pdfJsMock.getDocument.mockReturnValue(task);

    const extraction = extractPdfPages(pdfFile(), controller.signal, () => undefined);
    await vi.waitFor(() => expect(pdfJsMock.getDocument).toHaveBeenCalledTimes(1));
    controller.abort();

    const outcome = await settleWithin(extraction);
    expect(outcome).toMatchObject({ status: "rejected", error: { name: "AbortError" } });
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });

  it("rejects promptly and destroys the loading task once when aborted during page extraction", async () => {
    const controller = new AbortController();
    const textContentPromise = new Promise(() => undefined);
    const pendingPage = { getTextContent: vi.fn(() => textContentPromise) };
    const documentHandle = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(pendingPage),
      getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
    };
    const task = loadingTask(Promise.resolve(documentHandle));
    pdfJsMock.getDocument.mockReturnValue(task);
    const extraction = extractPdfPages(pdfFile(), controller.signal, () => undefined);
    await vi.waitFor(() => expect(pendingPage.getTextContent).toHaveBeenCalledTimes(1));

    controller.abort();

    const outcome = await settleWithin(extraction);
    expect(outcome).toMatchObject({ status: "rejected", error: { name: "AbortError" } });
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys the loading task once when PDF.js rejects a corrupt document", async () => {
    const corruptError = new Error("Invalid PDF structure");
    const task = loadingTask(Promise.reject(corruptError));
    pdfJsMock.getDocument.mockReturnValue(task);

    await expect(extractPdfPages(pdfFile(), new AbortController().signal, () => undefined))
      .rejects.toBe(corruptError);
    expect(task.destroy).toHaveBeenCalledTimes(1);
  });

  it("transfers exactly-once cleanup ownership to a successful result", async () => {
    const documentHandle = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(page([textItem("세출예산명세서", 80, 720, 100)])),
      getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
    };
    const task = loadingTask(Promise.resolve(documentHandle));
    pdfJsMock.getDocument.mockReturnValue(task);

    const result = await extractPdfPages(pdfFile(), new AbortController().signal, () => undefined);
    expect(task.destroy).not.toHaveBeenCalled();

    await result.cleanup();
    await result.cleanup();

    expect(task.destroy).toHaveBeenCalledTimes(1);
  });
});
