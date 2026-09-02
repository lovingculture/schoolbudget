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
    pdfJsMock.getDocument.mockReturnValue({ promise: Promise.resolve(documentHandle) });
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

  it("retains a budget heading split across individual PDF text items", async () => {
    const splitHeadingPage = page("세입예산명세서".split("").map((character, index) => (
      textItem(character, 100 + (index * 12), 780, 10)
    )));
    const documentHandle = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(splitHeadingPage),
      getMetadata: vi.fn().mockResolvedValue({ info: {}, metadata: null }),
    };
    pdfJsMock.getDocument.mockReturnValue({ promise: Promise.resolve(documentHandle) });

    const result = await extractPdfPages(pdfFile(), new AbortController().signal, () => undefined);

    expect(result.textPages).toHaveLength(1);
    expect(result.imagePages).toHaveLength(0);
    expect(result.requiresOcr).toBe(false);
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
    pdfJsMock.getDocument.mockReturnValue({ promise: Promise.resolve(documentHandle) });

    const extraction = extractPdfPages(pdfFile(), controller.signal, () => controller.abort());

    await expect(extraction).rejects.toMatchObject({ name: "AbortError" });
    expect(pageReads).toBe(1);
  });
});
