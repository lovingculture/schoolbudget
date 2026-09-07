# Main Budget PDF·Excel Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing department expenditure consolidation screen with a browser-only PDF/XLS/XLSX analyzer that calculates the revenue baseline, the exact `일반업무추진비` total, and their ratio.

**Architecture:** File-specific adapters convert text PDFs, OCR PDFs, and Excel workbooks into a shared logical-row model. Shared section parsers then extract revenue and expenditure facts, and a pure analyzer computes totals, comparison status, warnings, and display-ready detail rows. The React page owns only file selection, progress/cancellation, local persistence, and rendering.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, PDF.js (`pdfjs-dist` 6.3.289), Tesseract.js 7.0.0, SheetJS `xlsx` 0.18.5, localStorage.

**Spec:** `docs/superpowers/specs/2026-09-02-main-budget-pdf-analysis-design.md`

## Global Constraints

- Accept exactly one `.pdf`, `.xls`, or `.xlsx` file per analysis.
- Process source files and OCR page images only in the browser; never upload or persist source bytes.
- Store only the validated analysis result, source filename, and source format under `school-budget:main-budget:file-analysis:v1`.
- Calculate `세입 기준금액 = 세입예산총액 - (목적사업비전입금 + 수익자부담수입)`.
- Sum rows whose normalized cost item is exactly `일반업무추진비`; exclude `목적사업업무추진비`.
- Display monetary values in 천원 and 원; retain unrounded numbers for calculations and show the ratio to two decimal places.
- Preserve the existing route key `budget`, portal colors, typography, character imagery, and responsive behavior.
- Never silently replace missing required values or low-confidence OCR values with zero.
- Keep the unrelated untracked directories `.superpowers/brainstorm/` and `.tmp-spreadsheet-analysis/` untouched.

---

## File Structure

Create focused modules under `src/features/mainBudget/`:

- `analysisTypes.ts`: shared rows, source metadata, progress, warnings, and result types.
- `normalizeBudgetValue.ts`: text and number normalization shared by all adapters.
- `analyzeMainBudget.ts`: pure totals, comparison status, and ratio calculation.
- `extractWorkbookRows.ts`: `.xls`/`.xlsx` workbook-to-logical-row adapter.
- `extractPdfPages.ts`: PDF.js text extraction and text-density classification.
- `ocrPdfPages.ts`: lazy browser OCR adapter with progress and abort support.
- `normalizePdfLines.ts`: position-aware PDF/OCR item grouping.
- `parseBudgetSummary.ts`: summary-section extraction.
- `parseRevenueStatement.ts`: revenue hierarchy extraction.
- `parseExpenditureStatement.ts`: expenditure hierarchy and exact cost-item extraction.
- `analyzeBudgetFile.ts`: unified file dispatcher and orchestration.
- `analysisStorage.ts`: versioned local result persistence and old-key cleanup.
- `MainBudgetUpload.tsx`, `MainBudgetProgress.tsx`, `MainBudgetSummary.tsx`, `RevenueBreakdownTable.tsx`, `GeneralBusinessExpenseTable.tsx`: presentation components.

Replace `MainBudgetPage.tsx`, `MainBudgetPage.test.tsx`, and `mainBudget.css`. Delete the retired consolidation-only modules and tests after all imports are removed: `calculateExpression*`, `ExpenditureUploadPanel.tsx`, `ExpenditureTable.tsx`, `exportExpenditures*`, `parseExpenditureWorkbook*`, `reviewExpenditures*`, `storage*`, `summarizeExpenditures*`, and old `types.ts`.

---

### Task 1: Shared domain model and calculation rules

**Files:**
- Create: `src/features/mainBudget/analysisTypes.ts`
- Create: `src/features/mainBudget/normalizeBudgetValue.ts`
- Create: `src/features/mainBudget/normalizeBudgetValue.test.ts`
- Create: `src/features/mainBudget/analyzeMainBudget.ts`
- Create: `src/features/mainBudget/analyzeMainBudget.test.ts`

**Interfaces:**
- Produces: `BudgetLogicalRow`, `BudgetSource`, `RevenueFact`, `GeneralBusinessExpense`, `AnalysisWarning`, `MainBudgetAnalysisResult`.
- Produces: `normalizeLabel(value: unknown): string`, `parseBudgetNumber(value: unknown): number | null`, `stripHierarchyPrefix(value: string): string`.
- Produces: `analyzeMainBudget(input: ParsedMainBudgetInput): MainBudgetAnalysisResult`.

- [ ] **Step 1: Write failing normalization tests**

```ts
expect(parseBudgetNumber("1,010,749")).toBe(1010749);
expect(parseBudgetNumber("-6,660")).toBe(-6660);
expect(stripHierarchyPrefix("4.일반업무추진비")).toBe("일반업무추진비");
expect(normalizeLabel("세입 예산 명세서")).toBe("세입예산명세서");
```

- [ ] **Step 2: Run normalization tests and confirm failure**

Run: `npm run test:run -- src/features/mainBudget/normalizeBudgetValue.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the shared types and normalizers**

Define logical rows with `cells`, `sourcePage`, `sourceSheet`, `sourceRow`, optional coordinates and confidence. Parse only finite integers after removing commas, `원`, `천원`, whitespace, and a trailing `=`; return `null` for blanks and nonnumeric text.

- [ ] **Step 4: Write failing calculation tests**

```ts
const result = analyzeMainBudget({
  source: { fileName: "sample.xlsx", format: "xlsx" },
  totalRevenue: 1010749,
  purposeRevenue: 0,
  beneficiaryRevenue: 207176,
  verificationRevenue: {
    학교운영비전입금: 721573, 사용료: 0, 수수료: 0, 자산매각대: 0,
    지난년도수입: 0, 이자수입: 2000, 기타행정활동수입: 0, 순세계잉여금: 80000,
  },
  generalBusinessExpenses: Array.from({ length: 18 }, (_, index) => ({
    id: String(index), policy: "", unit: "", business: "", detail: "", amount: index === 0 ? 23020 : 0,
  })),
  warnings: [],
});
expect(result.revenueBaseline).toBe(803573);
expect(result.generalBusinessExpenseTotal).toBe(23020);
expect(result.ratio).toBeCloseTo(2.8647, 4);
expect(result.comparison.status).toBe("match");
```

- [ ] **Step 5: Implement calculation and warning rules**

Return `status: "match" | "mismatch" | "needs-review"`; propagate missing facts rather than coercing them; refuse the ratio when the denominator is zero or unknown; keep `ratio` unrounded.

- [ ] **Step 6: Run both test files**

Run: `npm run test:run -- src/features/mainBudget/normalizeBudgetValue.test.ts src/features/mainBudget/analyzeMainBudget.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/features/mainBudget/analysisTypes.ts src/features/mainBudget/normalizeBudgetValue.ts src/features/mainBudget/normalizeBudgetValue.test.ts src/features/mainBudget/analyzeMainBudget.ts src/features/mainBudget/analyzeMainBudget.test.ts
git commit -m "feat: add main budget analysis domain"
```

### Task 2: Excel input adapter for merged single-sheet budgets

**Files:**
- Create: `src/features/mainBudget/extractWorkbookRows.ts`
- Create: `src/features/mainBudget/extractWorkbookRows.test.ts`
- Create: `src/features/mainBudget/__fixtures__/mainBudgetWorkbook.ts`

**Interfaces:**
- Consumes: `BudgetLogicalRow`, `parseBudgetNumber`, `normalizeLabel`.
- Produces: `extractWorkbookRows(file: File): Promise<{ source: BudgetSource; rows: BudgetLogicalRow[] }>`.

- [ ] **Step 1: Build compact XLS and XLSX fixtures and failing tests**

Create both formats with a single `표지` sheet, merged cells, a one-row offset, string and numeric money cells, income headers, and two expenditure rows (`일반업무추진비` and `목적사업업무추진비`). Assert both formats produce equivalent logical rows and retain sheet/row provenance.

- [ ] **Step 2: Run the adapter test and confirm failure**

Run: `npm run test:run -- src/features/mainBudget/extractWorkbookRows.test.ts`

Expected: FAIL because `extractWorkbookRows` is missing.

- [ ] **Step 3: Implement workbook extraction**

Use `XLSX.read(await file.arrayBuffer(), { type: "array" })`, expand merged anchors only when the target cell is empty, normalize displayed and raw numeric values, drop fully blank rows, and never assume the sheet is named `표지` or starts on row 1.

- [ ] **Step 4: Run the adapter tests**

Run: `npm run test:run -- src/features/mainBudget/extractWorkbookRows.test.ts`

Expected: PASS for `.xls` and `.xlsx` cases.

- [ ] **Step 5: Commit**

```powershell
git add src/features/mainBudget/extractWorkbookRows.ts src/features/mainBudget/extractWorkbookRows.test.ts src/features/mainBudget/__fixtures__/mainBudgetWorkbook.ts
git commit -m "feat: read main budget Excel workbooks"
```

### Task 3: Section parsers shared by PDF and Excel

**Files:**
- Create: `src/features/mainBudget/parseBudgetSummary.ts`
- Create: `src/features/mainBudget/parseRevenueStatement.ts`
- Create: `src/features/mainBudget/parseExpenditureStatement.ts`
- Create: `src/features/mainBudget/budgetParsers.test.ts`
- Create: `src/features/mainBudget/__fixtures__/logicalBudgetRows.ts`

**Interfaces:**
- Consumes: normalized `BudgetLogicalRow[]`.
- Produces: `parseBudgetSummary(rows)`, `parseRevenueStatement(rows)`, `parseExpenditureStatement(rows)` returning facts plus `AnalysisWarning[]`.

- [ ] **Step 1: Write failing parser tests**

Cover spaced headings, `2026회계연도 예산안`, numbered item prefixes, absent optional categories, duplicated parent/child beneficiary labels, page/row hierarchy carry-forward, and exact exclusion of `목적사업업무추진비`.

```ts
expect(expenditure.expenses).toHaveLength(2);
expect(expenditure.expenses.every((row) => row.costItem === "일반업무추진비")).toBe(true);
expect(expenditure.expenses.reduce((sum, row) => sum + row.amount, 0)).toBe(23020);
```

- [ ] **Step 2: Run parser tests and confirm failure**

Run: `npm run test:run -- src/features/mainBudget/budgetParsers.test.ts`

Expected: FAIL because parser modules are missing.

- [ ] **Step 3: Implement heading and section-boundary detection**

Recognize normalized variants of `세입세출예산총괄`, `세입예산명세서`, `세출예산명세서`, and `예산안`; detect current-budget columns from each section header instead of absolute indexes.

- [ ] **Step 4: Implement revenue and expenditure hierarchy parsing**

Track policy, unit, business, and detail labels until replaced; extract the first value in the detected current-budget column; distinguish a missing row from a present row with value zero.

- [ ] **Step 5: Run parser and domain tests**

Run: `npm run test:run -- src/features/mainBudget/budgetParsers.test.ts src/features/mainBudget/analyzeMainBudget.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudget/parseBudgetSummary.ts src/features/mainBudget/parseRevenueStatement.ts src/features/mainBudget/parseExpenditureStatement.ts src/features/mainBudget/budgetParsers.test.ts src/features/mainBudget/__fixtures__/logicalBudgetRows.ts
git commit -m "feat: parse main budget statements"
```

### Task 4: PDF text extraction and line normalization

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/mainBudget/extractPdfPages.ts`
- Create: `src/features/mainBudget/normalizePdfLines.ts`
- Create: `src/features/mainBudget/pdfExtraction.test.ts`

**Interfaces:**
- Produces: `extractPdfPages(file, signal, onProgress): Promise<PdfExtractionResult>`.
- Produces: `normalizePdfLines(items, pageNumber): BudgetLogicalRow[]`.
- `PdfExtractionResult` reports `textPages`, `imagePages`, metadata, and whether OCR is required.

- [ ] **Step 1: Install PDF.js explicitly**

Run: `npm install pdfjs-dist@6.3.289`

Expected: `package.json` and `package-lock.json` contain the exact version.

- [ ] **Step 2: Write failing coordinate-grouping and text-density tests**

Use synthetic text items with close y coordinates and shuffled x coordinates. Assert that a page with no meaningful text is classified as image-only, while a page containing budget headings is retained as text.

- [ ] **Step 3: Run the PDF extraction test and confirm failure**

Run: `npm run test:run -- src/features/mainBudget/pdfExtraction.test.ts`

Expected: FAIL because extractor modules are missing.

- [ ] **Step 4: Implement PDF.js worker configuration and extraction**

Import the worker URL using Vite (`pdfjs-dist/build/pdf.worker.min.mjs?url`), call `getDocument({ data })`, group text items by page, report `{ phase: "pdf-text", completed, total }`, and check `AbortSignal` before each page.

- [ ] **Step 5: Run the PDF extraction tests**

Run: `npm run test:run -- src/features/mainBudget/pdfExtraction.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json src/features/mainBudget/extractPdfPages.ts src/features/mainBudget/normalizePdfLines.ts src/features/mainBudget/pdfExtraction.test.ts
git commit -m "feat: extract main budget PDF text"
```

### Task 5: Browser OCR fallback with progress and cancellation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/mainBudget/ocrPdfPages.ts`
- Create: `src/features/mainBudget/ocrPdfPages.test.ts`

**Interfaces:**
- Consumes: PDF document/page handles and `AbortSignal`.
- Produces: `ocrPdfPages(pages, signal, onProgress): Promise<BudgetLogicalRow[]>`.

- [ ] **Step 1: Install Tesseract.js explicitly**

Run: `npm install tesseract.js@7.0.0`

Expected: exact dependency and lockfile entries are added.

- [ ] **Step 2: Write failing OCR orchestration tests with mocked worker**

Assert lazy worker creation, `kor+eng` language initialization, sequential page rendering, progress mapping, worker termination on success/error/abort, and `AbortError` when cancellation occurs.

- [ ] **Step 3: Run OCR tests and confirm failure**

Run: `npm run test:run -- src/features/mainBudget/ocrPdfPages.test.ts`

Expected: FAIL because `ocrPdfPages` is missing.

- [ ] **Step 4: Implement lazy OCR orchestration**

Use dynamic `import("tesseract.js")`; render only image pages to canvas at an analysis scale; call the worker with Korean and English recognition; convert word bounding boxes and confidence into positioned rows; mark required facts below the chosen confidence threshold as review candidates; always terminate the worker in `finally`.

- [ ] **Step 5: Run OCR and PDF tests**

Run: `npm run test:run -- src/features/mainBudget/ocrPdfPages.test.ts src/features/mainBudget/pdfExtraction.test.ts`

Expected: PASS, including cancellation cleanup.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json src/features/mainBudget/ocrPdfPages.ts src/features/mainBudget/ocrPdfPages.test.ts
git commit -m "feat: add browser OCR for scanned budgets"
```

### Task 6: Unified file dispatcher and versioned persistence

**Files:**
- Create: `src/features/mainBudget/analyzeBudgetFile.ts`
- Create: `src/features/mainBudget/analyzeBudgetFile.test.ts`
- Create: `src/features/mainBudget/analysisStorage.ts`
- Create: `src/features/mainBudget/analysisStorage.test.ts`

**Interfaces:**
- Produces: `analyzeBudgetFile(file: File, options: { signal: AbortSignal; onProgress: (progress: AnalysisProgress) => void }): Promise<MainBudgetAnalysisResult>`.
- Produces: `mainBudgetAnalysisStorage.load/save/clear/migrateLegacy`.

- [ ] **Step 1: Write failing dispatcher tests**

Mock each adapter and assert MIME/extension routing for PDF, XLS, XLSX; automatic OCR only for image pages; rejection of multiple/unsupported or corrupt files; and a final shared analyzer call for every accepted format.

- [ ] **Step 2: Write failing storage validation tests**

Cover valid restore, malformed JSON removal, schema-version mismatch removal, no source bytes in stored JSON, and cleanup of `school-budget:main-budget:expenditures:v1` plus the obsolete PDF-only key.

- [ ] **Step 3: Run tests and confirm failure**

Run: `npm run test:run -- src/features/mainBudget/analyzeBudgetFile.test.ts src/features/mainBudget/analysisStorage.test.ts`

Expected: FAIL because the modules are missing.

- [ ] **Step 4: Implement dispatcher and storage guards**

Perform extension plus magic-byte checks, combine direct and OCR rows in page order, run all parsers, and validate persisted nested arrays/numbers/warning enums before returning them to React.

- [ ] **Step 5: Run the dispatcher, storage, and parser tests**

Run: `npm run test:run -- src/features/mainBudget/analyzeBudgetFile.test.ts src/features/mainBudget/analysisStorage.test.ts src/features/mainBudget/budgetParsers.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudget/analyzeBudgetFile.ts src/features/mainBudget/analyzeBudgetFile.test.ts src/features/mainBudget/analysisStorage.ts src/features/mainBudget/analysisStorage.test.ts
git commit -m "feat: orchestrate and save budget analysis"
```

### Task 7: Replace the 본예산 page and build responsive results

**Files:**
- Replace: `src/features/mainBudget/MainBudgetPage.tsx`
- Replace: `src/features/mainBudget/MainBudgetPage.test.tsx`
- Replace: `src/features/mainBudget/mainBudget.css`
- Create: `src/features/mainBudget/MainBudgetUpload.tsx`
- Create: `src/features/mainBudget/MainBudgetProgress.tsx`
- Create: `src/features/mainBudget/MainBudgetSummary.tsx`
- Create: `src/features/mainBudget/RevenueBreakdownTable.tsx`
- Create: `src/features/mainBudget/GeneralBusinessExpenseTable.tsx`

**Interfaces:**
- Consumes: `analyzeBudgetFile`, `mainBudgetAnalysisStorage`, `MainBudgetAnalysisResult`, `AnalysisProgress`.
- Produces: accessible upload, progress/cancel, warnings, summaries, details, and reset interactions.

- [ ] **Step 1: Replace page tests with failing user-flow tests**

Assert an empty initial screen, `accept=".pdf,.xls,.xlsx"`, no `multiple`, progress/cancel visibility, result restore, `다른 파일 분석`, mismatch/low-confidence warnings, exact 803,573/23,020/2.86 display, and absence of old tabs/download buttons.

- [ ] **Step 2: Run the page test and confirm failure**

Run: `npm run test:run -- src/features/mainBudget/MainBudgetPage.test.tsx`

Expected: FAIL against the old consolidation page.

- [ ] **Step 3: Implement upload, orchestration, abort, and persistence state**

Use one `AbortController` per run; disable replacement upload while parsing; abort on explicit cancel and component unmount; save only successful results; surface actionable Korean error messages.

- [ ] **Step 4: Implement summary and detail components**

Render three summary cards, comparison badge and difference, eight revenue verification rows, provenance in the expenditure table, 천원/원 conversions, and `확인 필요` states without fake zeros.

- [ ] **Step 5: Implement responsive CSS**

Use the existing teal/navy variables and portal workspace; three desktop cards collapse to one column below 760px; keep tables compact at desktop widths and horizontally scroll only on small screens; provide visible keyboard focus.

- [ ] **Step 6: Run page and accessibility-oriented tests**

Run: `npm run test:run -- src/features/mainBudget/MainBudgetPage.test.tsx`

Expected: PASS with no unhandled promise or act warnings.

- [ ] **Step 7: Commit**

```powershell
git add src/features/mainBudget/MainBudgetPage.tsx src/features/mainBudget/MainBudgetPage.test.tsx src/features/mainBudget/mainBudget.css src/features/mainBudget/MainBudgetUpload.tsx src/features/mainBudget/MainBudgetProgress.tsx src/features/mainBudget/MainBudgetSummary.tsx src/features/mainBudget/RevenueBreakdownTable.tsx src/features/mainBudget/GeneralBusinessExpenseTable.tsx
git commit -m "feat: replace main budget analysis screen"
```

### Task 8: Remove retired consolidation code and update portal copy

**Files:**
- Delete: `src/features/mainBudget/calculateExpression.ts`
- Delete: `src/features/mainBudget/calculateExpression.test.ts`
- Delete: `src/features/mainBudget/ExpenditureUploadPanel.tsx`
- Delete: `src/features/mainBudget/ExpenditureTable.tsx`
- Delete: `src/features/mainBudget/exportExpenditures.ts`
- Delete: `src/features/mainBudget/exportExpenditures.test.ts`
- Delete: `src/features/mainBudget/parseExpenditureWorkbook.ts`
- Delete: `src/features/mainBudget/parseExpenditureWorkbook.test.ts`
- Delete: `src/features/mainBudget/reviewExpenditures.ts`
- Delete: `src/features/mainBudget/reviewExpenditures.test.ts`
- Delete: `src/features/mainBudget/storage.ts`
- Delete: `src/features/mainBudget/storage.test.ts`
- Delete: `src/features/mainBudget/summarizeExpenditures.ts`
- Delete: `src/features/mainBudget/summarizeExpenditures.test.ts`
- Delete: `src/features/mainBudget/types.ts`
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/guide/UsageGuidePage.tsx`
- Modify: `src/features/guide/UsageGuidePage.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/features/guidelines/buildExpenditureTemplate.test.ts`

**Interfaces:**
- Keeps: route key `budget` and `MainBudgetPage` export.
- Removes: all imports and UI copy referring to department consolidation, review spreadsheets, and the old 3% placeholder tab.

- [ ] **Step 1: Update failing copy/navigation assertions**

Change expected heading to `본예산 PDF·Excel 자동 계산`; assert home and guide descriptions say that users upload a K-에듀파인 budget PDF or Excel file and receive revenue/business-expense calculations. Change the guideline template test to validate the generated workbook directly instead of importing the retired parser.

- [ ] **Step 2: Run affected tests and confirm old-copy failures**

Run: `npm run test:run -- src/App.test.tsx src/features/home/HomePage.test.tsx src/features/guide/UsageGuidePage.test.tsx src/features/guidelines/buildExpenditureTemplate.test.ts`

Expected: FAIL until production copy is updated.

- [ ] **Step 3: Update production copy and remove retired files**

Use `본예산서를 불러오면 세입 기준금액과 일반업무추진비 편성 비율을 자동으로 계산합니다.` consistently. Keep the standalone downloadable guideline template available, but remove its obsolete round-trip dependency on the deleted parser.

- [ ] **Step 4: Run all main-budget and affected portal tests**

Run: `npm run test:run -- src/features/mainBudget src/App.test.tsx src/features/home/HomePage.test.tsx src/features/guide/UsageGuidePage.test.tsx src/features/guidelines/buildExpenditureTemplate.test.ts`

Expected: PASS and no imports of retired modules (`rg "parseExpenditureWorkbook|ExpenditureUploadPanel|세출자료 통합·검토" src` returns no matches except historical documentation, if any).

- [ ] **Step 5: Commit**

```powershell
git add -A src/features/mainBudget src/features/home src/features/guide src/features/guidelines/buildExpenditureTemplate.test.ts src/App.test.tsx
git commit -m "refactor: retire main budget consolidation workflow"
```

### Task 9: Sample-file integration, build, and browser verification

**Files:**
- Create: `scripts/verify-main-budget-samples.mjs`
- Modify: `README_최종소스.txt`

**Interfaces:**
- Consumes local sample paths passed as CLI arguments; does not copy or commit user source files.
- Uses Vite's programmatic SSR loader to load the TypeScript analysis modules from the `.mjs` script.
- Produces a concise per-file report containing source type, extracted totals, warnings, and PASS/FAIL.

- [ ] **Step 1: Add the sample verification script**

Make the script accept paths after `--`, create a middleware-mode Vite server, load `analyzeBudgetFile.ts` with `ssrLoadModule`, and compare the two Excel files plus the text-layer reference PDF against `{ revenueBaseline: 803573, generalBusinessExpenseTotal: 23020, ratioRounded: 2.86 }`. Close the Vite server in `finally`. Scanned-PDF OCR remains a browser verification because its canvas and worker runtime are browser-only.

- [ ] **Step 2: Run all automated tests**

Run: `npm run test:run`

Expected: all Vitest suites pass.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully; OCR is split into a lazy chunk; Sites preparation completes.

- [ ] **Step 4: Run local integration against the supplied XLS, XLSX, and text PDF**

Run:

```powershell
node scripts/verify-main-budget-samples.mjs -- "C:\Users\User\Desktop\예산서\2026예산서.xls" "C:\Users\User\Desktop\예산서\2026예산서1.xlsx" "C:\Users\User\Desktop\예산서\2026 본예산(초등)(이름없음).pdf"
```

Expected: each file reports 803,573천원, 23,020천원, 2.86%, with no fatal warning.

- [ ] **Step 5: Start the preview and verify the complete flow in a browser**

Run: `npm run dev -- --host 127.0.0.1`

Verify desktop and mobile widths: empty initial state, Excel upload/result/reset, text PDF upload, scanned-PDF OCR progress/cancel, restored result after reload, no console errors, and no old tabs.

- [ ] **Step 6: Update the source README**

Document accepted formats, browser-only processing, OCR wait expectations, local restore behavior, calculation formula, and the fact that source files are not saved.

- [ ] **Step 7: Run final diff and regression checks**

Run:

```powershell
git diff --check
npm run test:run
npm run build
```

Expected: no whitespace errors, all tests pass, build exits zero.

- [ ] **Step 8: Commit**

```powershell
git add scripts/verify-main-budget-samples.mjs README_최종소스.txt
git commit -m "test: verify main budget file analysis"
```

### Task 10: Review and deployment handoff

**Files:**
- No source changes unless review finds a defect.

- [ ] **Step 1: Invoke the required review skill**

Use `superpowers:requesting-code-review` to inspect the complete branch against the specification and this plan.

- [ ] **Step 2: Fix any confirmed findings with targeted tests**

For each finding, first add or adjust a test that reproduces it, run that test to confirm failure, make the minimal fix, and rerun the affected suite.

- [ ] **Step 3: Invoke verification-before-completion**

Use `superpowers:verification-before-completion`; rerun the full test suite, production build, sample integration command, and browser smoke test using fresh output.

- [ ] **Step 4: Inspect git state**

Run: `git status --short` and `git log --oneline --decorate -10`.

Expected: only the pre-existing unrelated untracked directories remain; implementation commits are present on `codex/fix-closing-xlsx`.

- [ ] **Step 5: Present deployment choice**

Use `superpowers:finishing-a-development-branch`. Do not push, merge, or deploy until the user selects that outcome. If deployment is selected, follow `sites:sites-hosting`, publish the built site, verify the public URL, then push the approved commit to GitHub.
