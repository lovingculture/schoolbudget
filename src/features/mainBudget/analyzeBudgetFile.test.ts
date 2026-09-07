import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetLogicalRow, MainBudgetAnalysisResult } from "./analysisTypes";

const adapterMocks = vi.hoisted(() => ({
  extractWorkbookRows: vi.fn(),
  extractPdfPages: vi.fn(),
  ocrPdfPages: vi.fn(),
}));

const parserMocks = vi.hoisted(() => ({
  parseBudgetSummary: vi.fn(),
  parseRevenueStatement: vi.fn(),
  parseExpenditureStatement: vi.fn(),
  parseDetailWorkbookIdentity: vi.fn(),
  analyzeMainBudget: vi.fn(),
}));

vi.mock("./extractWorkbookRows", () => ({ extractWorkbookRows: adapterMocks.extractWorkbookRows }));
vi.mock("./extractPdfPages", () => ({ extractPdfPages: adapterMocks.extractPdfPages }));
vi.mock("./ocrPdfPages", () => ({ ocrPdfPages: adapterMocks.ocrPdfPages }));
vi.mock("./parseBudgetSummary", () => ({ parseBudgetSummary: parserMocks.parseBudgetSummary }));
vi.mock("./parseRevenueStatement", () => ({ parseRevenueStatement: parserMocks.parseRevenueStatement }));
vi.mock("./parseExpenditureStatement", () => ({ parseExpenditureStatement: parserMocks.parseExpenditureStatement }));
vi.mock("./parseDetailWorkbookIdentity", () => ({ parseDetailWorkbookIdentity: parserMocks.parseDetailWorkbookIdentity }));
vi.mock("./analyzeMainBudget", () => ({ analyzeMainBudget: parserMocks.analyzeMainBudget }));

import { analyzeBudgetFile } from "./analyzeBudgetFile";

const pdfMagic = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const xlsMagic = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const xlsxMagic = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00];

function budgetFile(name: string, bytes: number[], type = "") {
  return new File([new Uint8Array(bytes)], name, { type });
}

function byteBackedFile(name: string, bytes: Uint8Array, type = "") {
  const file = new File([bytes], name, { type });
  const start = bytes.byteOffset;
  const end = start + bytes.byteLength;
  const arrayBuffer = vi.fn(async () => bytes.buffer.slice(start, end) as ArrayBuffer);
  Object.defineProperty(file, "arrayBuffer", { value: arrayBuffer });
  return { file, arrayBuffer };
}

async function xlsxPackage(contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml") {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override ContentType="${contentType}" PartName="/xl/workbook.xml"/>
      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
    </Types>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8"?>
    <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
    </workbook>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
    </Relationships>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
    </Relationships>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>`);
  return zip.generateAsync({ type: "uint8array" });
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

function resultFor(format: "pdf" | "xls" | "xlsx", fileName = `budget.${format}`): MainBudgetAnalysisResult {
  return {
    source: { fileName, format },
    identity: { schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" },
    revenueBaseline: 1_000,
    verificationRevenue: { facts: [], isComplete: true },
    verificationRevenueTotal: 1_000,
    generalBusinessExpenses: [],
    generalBusinessExpenseFacts: { facts: [], isComplete: true },
    generalBusinessExpenseTotal: 0,
    ratio: 0,
    warnings: [],
  };
}

const summary = {
  identity: { schoolName: "가람초등학교", accountingYear: 2026, budgetType: "본예산" as const },
  budgetTypeEvidence: "explicit" as const,
  hasValidStructure: true,
  totalRevenue: { label: "세입예산총액", amount: 1_000 },
  isComplete: true,
  warnings: [],
};
const revenue = {
  purposeRevenue: { label: "목적사업비전입금", amount: 0 },
  beneficiaryRevenue: { label: "수익자부담수입", amount: 0 },
  verificationRevenue: { facts: [], isComplete: true },
  hasValidStructure: true,
  warnings: [],
};
const expenditure = { expenses: [], isComplete: true, hasValidStructure: true, warnings: [] };

function installSuccessfulParsers(result: MainBudgetAnalysisResult) {
  parserMocks.parseBudgetSummary.mockReturnValue(summary);
  parserMocks.parseRevenueStatement.mockReturnValue(revenue);
  parserMocks.parseExpenditureStatement.mockReturnValue(expenditure);
  parserMocks.parseDetailWorkbookIdentity.mockReturnValue({
    identity: summary.identity,
    hasRevenueSection: true,
    hasExpenditureSection: true,
    warnings: [],
  });
  parserMocks.analyzeMainBudget.mockReturnValue(result);
}

function pdfExtraction(overrides: Record<string, unknown> = {}) {
  return {
    document: { kind: "pdf-document-handle" },
    textPages: [],
    imagePages: [],
    metadata: { fileName: "budget.pdf", pageCount: 3 },
    requiresOcr: false,
    cleanup: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("analyzeBudgetFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adapterMocks.ocrPdfPages.mockResolvedValue([]);
  });

  it("routes XLS by case-insensitive extension and matching OLE magic bytes", async () => {
    const name = "BUDGET.XLS";
    const bytes = xlsMagic;
    const type = "application/vnd.ms-excel";
    const format = "xls" as const;
    const file = budgetFile(name, bytes, type);
    const rows: BudgetLogicalRow[] = [{ cells: ["본예산"], sourceSheet: "표지", sourceRow: 1 }];
    adapterMocks.extractWorkbookRows.mockResolvedValue({ source: { fileName: name, format }, rows });
    const analyzed = resultFor(format, name);
    installSuccessfulParsers(analyzed);

    await expect(analyzeBudgetFile(file, { signal: new AbortController().signal, onProgress: vi.fn() }))
      .resolves.toBe(analyzed);

    expect(adapterMocks.extractWorkbookRows).toHaveBeenCalledWith(file, {
      bytes: expect.any(Uint8Array),
      signal: expect.any(AbortSignal),
    });
    expect(adapterMocks.extractPdfPages).not.toHaveBeenCalled();
    expect(parserMocks.parseBudgetSummary).toHaveBeenCalledWith(rows);
    expect(parserMocks.parseRevenueStatement).toHaveBeenCalledWith(rows);
    expect(parserMocks.parseExpenditureStatement).toHaveBeenCalledWith(rows);
    expect(parserMocks.analyzeMainBudget).toHaveBeenCalledWith(expect.objectContaining({
      source: { fileName: name, format },
      identity: summary.identity,
      verificationRevenue: revenue.verificationRevenue,
      generalBusinessExpenses: { facts: [], isComplete: true },
    }));
  });

  it("routes a real minimal XLSX package and reuses its single byte read for workbook parsing", async () => {
    const name = "BUDGET.XLSX";
    const { file, arrayBuffer } = byteBackedFile(
      name,
      await xlsxPackage(),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const rows: BudgetLogicalRow[] = [{ cells: ["본예산"], sourceSheet: "표지", sourceRow: 1 }];
    adapterMocks.extractWorkbookRows.mockResolvedValue({ source: { fileName: name, format: "xlsx" }, rows });
    const analyzed = resultFor("xlsx", name);
    installSuccessfulParsers(analyzed);
    const signal = new AbortController().signal;

    await expect(analyzeBudgetFile(file, { signal, onProgress: vi.fn() })).resolves.toBe(analyzed);

    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    expect(adapterMocks.extractWorkbookRows).toHaveBeenCalledWith(file, {
      bytes: expect.any(Uint8Array),
      signal,
    });
  });

  it("rejects a renamed arbitrary ZIP before the workbook adapter", async () => {
    const zip = new JSZip();
    zip.file("notes.txt", "not an Excel workbook");
    const { file } = byteBackedFile("renamed.xlsx", await zip.generateAsync({ type: "uint8array" }));

    await expect(analyzeBudgetFile(file, {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toThrow(/Excel OOXML/);

    expect(adapterMocks.extractWorkbookRows).not.toHaveBeenCalled();
  });

  it("rejects OOXML-shaped ZIP content whose workbook content type is not a spreadsheet", async () => {
    const { file } = byteBackedFile(
      "document.xlsx",
      await xlsxPackage("application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"),
    );

    await expect(analyzeBudgetFile(file, {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toThrow(/Excel OOXML/);
    expect(adapterMocks.extractWorkbookRows).not.toHaveBeenCalled();
  });

  it.each(["pdf", "xlsx"] as const)("rejects promptly when %s signature bytes are still being read", async (format) => {
    const read = deferred<ArrayBuffer>();
    const controller = new AbortController();
    const arrayBuffer = vi.fn(() => read.promise);
    const file = {
      name: `budget.${format}`,
      type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      arrayBuffer,
    } as unknown as File;

    const pending = analyzeBudgetFile(file, { signal: controller.signal, onProgress: vi.fn() });
    await vi.waitFor(() => expect(arrayBuffer).toHaveBeenCalledTimes(1));
    controller.abort();

    expect(await settleWithin(pending)).toMatchObject({
      status: "rejected",
      error: { name: "AbortError" },
    });
    expect(adapterMocks.extractPdfPages).not.toHaveBeenCalled();
    expect(adapterMocks.extractWorkbookRows).not.toHaveBeenCalled();

    read.resolve(Uint8Array.from(format === "pdf" ? pdfMagic : xlsxMagic).buffer);
  });

  it("OCRs only image pages, merges direct and OCR rows in source order, and always cleans a successful PDF", async () => {
    const file = budgetFile("Budget.PdF", pdfMagic, "application/pdf");
    const directPage1 = { cells: ["direct-1"], sourcePage: 1, sourceRow: 1 };
    const directPage3 = { cells: ["direct-3"], sourcePage: 3, sourceRow: 1 };
    const ocrPage2 = { cells: ["ocr-2"], sourcePage: 2, sourceRow: 1 };
    const imagePage = { pageNumber: 2, page: { kind: "image-page" } };
    const extraction = pdfExtraction({
      textPages: [
        { pageNumber: 3, page: { kind: "text-page-3" }, items: [], rows: [directPage3] },
        { pageNumber: 1, page: { kind: "text-page-1" }, items: [], rows: [directPage1] },
      ],
      imagePages: [imagePage],
      requiresOcr: true,
    });
    adapterMocks.extractPdfPages.mockResolvedValue(extraction);
    adapterMocks.ocrPdfPages.mockResolvedValue([ocrPage2]);
    const analyzed = resultFor("pdf", file.name);
    installSuccessfulParsers(analyzed);
    const progress = vi.fn();
    const signal = new AbortController().signal;

    await expect(analyzeBudgetFile(file, { signal, onProgress: progress })).resolves.toBe(analyzed);

    expect(adapterMocks.extractPdfPages).toHaveBeenCalledWith(file, signal, progress);
    expect(adapterMocks.ocrPdfPages).toHaveBeenCalledWith([imagePage], signal, progress);
    expect(parserMocks.parseBudgetSummary).toHaveBeenCalledWith([directPage1, ocrPage2, directPage3]);
    expect(parserMocks.analyzeMainBudget).toHaveBeenCalledWith(expect.objectContaining({
      source: { fileName: file.name, format: "pdf", pageCount: 3 },
    }));
    expect(extraction.cleanup).toHaveBeenCalledTimes(1);
  });

  it("uses the OCR representation exclusively for a hybrid page so a recovered expense is not duplicated", async () => {
    const file = budgetFile("hybrid.pdf", pdfMagic, "application/pdf");
    const directHeading = { cells: ["세출예산명세서"], sourcePage: 5, sourceRow: 1 };
    const hiddenDirectExpense = { cells: ["일반업무추진비", 100], sourcePage: 5, sourceRow: 2 };
    const ocrHeading = { cells: ["세출예산명세서"], sourcePage: 5, sourceRow: 1, confidence: 0.95 };
    const recoveredExpense = { cells: ["일반업무추진비", 100], sourcePage: 5, sourceRow: 2, confidence: 0.95 };
    const imagePage = { pageNumber: 5, page: { kind: "hybrid-page" } };
    const extraction = pdfExtraction({
      textPages: [{ pageNumber: 5, page: imagePage.page, items: [], rows: [directHeading, hiddenDirectExpense] }],
      imagePages: [imagePage],
      requiresOcr: true,
    });
    adapterMocks.extractPdfPages.mockResolvedValue(extraction);
    adapterMocks.ocrPdfPages.mockResolvedValue([ocrHeading, recoveredExpense]);
    installSuccessfulParsers(resultFor("pdf", file.name));

    await analyzeBudgetFile(file, { signal: new AbortController().signal, onProgress: vi.fn() });

    expect(parserMocks.parseExpenditureStatement).toHaveBeenCalledWith([ocrHeading, recoveredExpense]);
    const parsedRows = parserMocks.parseExpenditureStatement.mock.calls[0][0] as BudgetLogicalRow[];
    expect(parsedRows.filter((row) => row.cells.includes("일반업무추진비"))).toEqual([recoveredExpense]);
  });

  it("does not invoke OCR for a text-only PDF", async () => {
    const extraction = pdfExtraction({
      textPages: [{ pageNumber: 1, page: {}, items: [], rows: [{ cells: ["본예산"], sourcePage: 1 }] }],
    });
    adapterMocks.extractPdfPages.mockResolvedValue(extraction);
    installSuccessfulParsers(resultFor("pdf"));

    await analyzeBudgetFile(budgetFile("budget.pdf", pdfMagic), {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });

    expect(adapterMocks.ocrPdfPages).not.toHaveBeenCalled();
    expect(extraction.cleanup).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["OCR", () => adapterMocks.ocrPdfPages.mockRejectedValue(new Error("OCR failed"))],
    ["parser", () => parserMocks.parseBudgetSummary.mockImplementation(() => { throw new Error("parser failed"); })],
    ["analyzer", () => parserMocks.analyzeMainBudget.mockImplementation(() => { throw new Error("analyzer failed"); })],
  ])("cleans the PDF when %s fails", async (_label, fail) => {
    const extraction = pdfExtraction({
      imagePages: [{ pageNumber: 1, page: {} }],
      requiresOcr: true,
    });
    adapterMocks.extractPdfPages.mockResolvedValue(extraction);
    installSuccessfulParsers(resultFor("pdf"));
    fail();

    await expect(analyzeBudgetFile(budgetFile("budget.pdf", pdfMagic), {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toThrow(/failed/);

    expect(extraction.cleanup).toHaveBeenCalledTimes(1);
  });

  it("cleans the PDF and preserves AbortError when OCR is aborted", async () => {
    const abortError = new DOMException("cancelled", "AbortError");
    const extraction = pdfExtraction({ imagePages: [{ pageNumber: 1, page: {} }], requiresOcr: true });
    adapterMocks.extractPdfPages.mockResolvedValue(extraction);
    adapterMocks.ocrPdfPages.mockRejectedValue(abortError);
    installSuccessfulParsers(resultFor("pdf"));

    await expect(analyzeBudgetFile(budgetFile("budget.pdf", pdfMagic), {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toBe(abortError);
    expect(extraction.cleanup).toHaveBeenCalledTimes(1);
  });

  it("cleans and stops before parsing when the parsing progress callback aborts", async () => {
    const controller = new AbortController();
    const extraction = pdfExtraction({
      textPages: [{ pageNumber: 1, page: {}, items: [], rows: [{ cells: ["본예산"], sourcePage: 1 }] }],
    });
    adapterMocks.extractPdfPages.mockResolvedValue(extraction);
    installSuccessfulParsers(resultFor("pdf"));

    await expect(analyzeBudgetFile(budgetFile("budget.pdf", pdfMagic), {
      signal: controller.signal,
      onProgress: (progress) => {
        if (progress.phase === "parsing") controller.abort();
      },
    })).rejects.toMatchObject({ name: "AbortError" });

    expect(parserMocks.parseBudgetSummary).not.toHaveBeenCalled();
    expect(parserMocks.analyzeMainBudget).not.toHaveBeenCalled();
    expect(extraction.cleanup).toHaveBeenCalledTimes(1);
  });

  it("normalizes explicit won detail sections to thousand-won values", async () => {
    const summaryHeading = { cells: ["세입세출예산총괄"] };
    const wonUnit = { cells: ["(단위:", "원)"] };
    const summaryRow = { cells: ["세입예산총액", 1_000_000] };
    const revenueHeading = { cells: ["세입예산명세서"] };
    const purposeRow = { cells: ["목적사업비전입금", 200_000] };
    const expenditureHeading = { cells: ["세출예산명세서"] };
    const expenseRow = { cells: ["일반업무추진비", 30_000] };
    const rows = [summaryHeading, wonUnit, summaryRow, revenueHeading, purposeRow, expenditureHeading, expenseRow];
    adapterMocks.extractWorkbookRows.mockResolvedValue({
      source: { fileName: "budget.xlsx", format: "xlsx", sheetCount: 1 },
      rows,
    });
    parserMocks.parseBudgetSummary.mockReturnValue({
      identity: summary.identity,
      budgetTypeEvidence: "explicit",
      hasValidStructure: true,
      totalRevenue: { label: "세입예산총액", amount: 1_000_000, row: summaryRow }, isComplete: true, warnings: [],
    });
    parserMocks.parseRevenueStatement.mockReturnValue({
      purposeRevenue: { label: "목적사업비전입금", amount: 200_000, row: purposeRow },
      beneficiaryRevenue: { label: "수익자부담수입", amount: 0, row: purposeRow },
      verificationRevenue: { facts: [{ label: "이자수입", amount: 1_000, row: purposeRow }], isComplete: true },
      hasValidStructure: true,
      warnings: [],
    });
    parserMocks.parseExpenditureStatement.mockReturnValue({
      expenses: [{ id: "expense", policy: "", unit: "", business: "", detail: "", costItem: "일반업무추진비", amount: 30_000, row: expenseRow }],
      isComplete: true,
      hasValidStructure: true,
      warnings: [],
    });
    parserMocks.analyzeMainBudget.mockReturnValue(resultFor("xlsx"));

    await analyzeBudgetFile(budgetFile("budget.xls", xlsMagic), {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    });

    expect(parserMocks.analyzeMainBudget).toHaveBeenCalledWith(expect.objectContaining({
      verificationRevenue: expect.objectContaining({ facts: [expect.objectContaining({ amount: 1_000 })] }),
      generalBusinessExpenses: expect.objectContaining({ facts: [expect.objectContaining({ amount: 30_000 })] }),
    }));
  });

  it.each([
    ["unsupported extension", budgetFile("budget.csv", [0x31, 0x2c, 0x32]), /지원하지 않는 파일 형식/],
    ["extension/content mismatch", budgetFile("budget.pdf", xlsxMagic), /확장자와 내용이 일치하지/],
    ["corrupt workbook", budgetFile("budget.xlsx", [0x31, 0x32, 0x33]), /손상되었거나/],
  ])("rejects $s clearly before invoking an adapter", async (_label, file, message) => {
    await expect(analyzeBudgetFile(file, { signal: new AbortController().signal, onProgress: vi.fn() }))
      .rejects.toThrow(message);
    expect(adapterMocks.extractWorkbookRows).not.toHaveBeenCalled();
    expect(adapterMocks.extractPdfPages).not.toHaveBeenCalled();
  });

  it("rejects an unsupported extension before starting any byte read", async () => {
    const arrayBuffer = vi.fn().mockRejectedValue(new Error("reader must not run"));
    const file = { name: "budget.zip", type: "application/zip", arrayBuffer } as unknown as File;

    await expect(analyzeBudgetFile(file, {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toThrow("지원하지 않는 파일 형식");

    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(adapterMocks.extractPdfPages).not.toHaveBeenCalled();
    expect(adapterMocks.extractWorkbookRows).not.toHaveBeenCalled();
  });

  it("rejects multiple files passed across the single-file API boundary", async () => {
    const files = [budgetFile("one.pdf", pdfMagic), budgetFile("two.pdf", pdfMagic)];
    await expect(analyzeBudgetFile(files as unknown as File, {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toThrow("파일을 하나만 선택");
  });

  it.each([
    ["revenue", { summary: true, revenue: false, expenditure: true }, "세입예산명세서"],
    ["expenditure", { summary: true, revenue: true, expenditure: false }, "세출예산명세서"],
  ])("rejects a workbook with an invalid %s section before analysis", async (_label, validity, expectedSection) => {
    const file = budgetFile("budget.xls", xlsMagic);
    adapterMocks.extractWorkbookRows.mockResolvedValue({
      source: { fileName: file.name, format: "xls", sheetCount: 1 },
      rows: [{ cells: ["본예산"] }],
    });
    installSuccessfulParsers(resultFor("xls"));
    parserMocks.parseBudgetSummary.mockReturnValue({ ...summary, hasValidStructure: validity.summary });
    parserMocks.parseRevenueStatement.mockReturnValue({ ...revenue, hasValidStructure: validity.revenue });
    parserMocks.parseExpenditureStatement.mockReturnValue({ ...expenditure, hasValidStructure: validity.expenditure });

    await expect(analyzeBudgetFile(file, {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toThrow(expectedSection);
    expect(parserMocks.analyzeMainBudget).not.toHaveBeenCalled();
  });

  it("analyzes a combined detail workbook without a summary section", async () => {
    const file = budgetFile("옥정.xls", xlsMagic);
    const rows = [{ cells: ["2026학년도 세입예산명세서"] }, { cells: ["세출예산명세서"] }];
    const analyzed = resultFor("xls", file.name);
    adapterMocks.extractWorkbookRows.mockResolvedValue({
      source: { fileName: file.name, format: "xls", sheetCount: 1 },
      rows,
    });
    installSuccessfulParsers(analyzed);
    parserMocks.parseBudgetSummary.mockReturnValue({
      ...summary,
      identity: null,
      hasValidStructure: false,
      isReviewable: false,
      warnings: [{ code: "BUDGET_SUMMARY_SECTION", message: "총괄표 없음", severity: "error" }],
    });

    await expect(analyzeBudgetFile(file, {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).resolves.toBe(analyzed);

    expect(parserMocks.analyzeMainBudget).toHaveBeenCalledWith(expect.objectContaining({
      identity: summary.identity,
      verificationRevenue: revenue.verificationRevenue,
      generalBusinessExpenses: { facts: [], isComplete: true },
      warnings: [],
    }));
  });

  it("rejects a zero-sheet workbook before parsing or persistence can treat it as complete", async () => {
    const file = budgetFile("empty.xls", xlsMagic);
    adapterMocks.extractWorkbookRows.mockResolvedValue({
      source: { fileName: file.name, format: "xls", sheetCount: 0 },
      rows: [],
    });

    await expect(analyzeBudgetFile(file, {
      signal: new AbortController().signal,
      onProgress: vi.fn(),
    })).rejects.toThrow("시트");
    expect(parserMocks.parseBudgetSummary).not.toHaveBeenCalled();
    expect(parserMocks.analyzeMainBudget).not.toHaveBeenCalled();
  });
});
