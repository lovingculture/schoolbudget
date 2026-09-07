# Main Budget OCR Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three residual release blockers: hybrid PDF pages skipping OCR, supplemental-budget titles bypassing identity checks, and supplied scanned PDFs failing to reach a safe reviewable analysis result.

**Architecture:** Preserve the existing adapter/parser/analyzer architecture. First instrument the real scanned-file pipeline without changing production behavior, then add focused failing regressions and minimal fixes at the boundary where data is lost. Hybrid pages select one source per page, identity remains fail-closed, and OCR uncertainty produces reviewable facts rather than invented values.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, PDF.js 6.3.289, Tesseract.js 7.0.0.

**Spec:** `docs/superpowers/specs/2026-09-02-main-budget-pdf-analysis-design.md`

## Global Constraints

- Never weaken exact inclusion of `일반업무추진비` or silently invent a monetary value.
- Reject known 추경/성립전/결산 documents even when legal boilerplate contains similar phrases.
- Choose direct text or OCR once per PDF page; never double-count both representations.
- A scanned file may produce `확인 필요` values with source evidence, but missing required document sections remains fatal.
- Keep source files/page images browser-only and unpersisted.
- Preserve reference XLS/XLSX/text-PDF results: 803,573천원 / 23,020천원 / 2.86%.
- Keep the two unrelated untracked directories untouched.

---

### Task 1: Diagnose supplied scan failures at component boundaries

**Files:**
- Create: `scripts/diagnose-main-budget-ocr.mjs`
- Create: `scripts/diagnose-main-budget-ocr.test.ts`
- Create: `.superpowers/sdd/2026-09-03-main-budget-ocr-remediation/root-cause.md` (ignored diagnostic report)

**Interfaces:**
- Consumes file paths from CLI only; never hardcodes or copies user files.
- Produces per-page classification, OCR row counts/confidence, normalized heading candidates, parser section-found/completeness state, and fatal reason. Monetary row text is truncated in console output.

- [ ] Write a failing script-contract test proving paths are CLI-only and JSON output has `pages`, `summary`, `revenue`, `expenditure`, and `fatalReason`.
- [ ] Run the test and capture RED.
- [ ] Implement the smallest Vite-SSR/browser-harness diagnostic wrapper around production functions; add optional diagnostic callbacks rather than duplicating parser logic.
- [ ] Run both supplied scan PDFs and record exact failure boundary/evidence in `root-cause.md`.
- [ ] State one root-cause hypothesis per failure and test it with the smallest fixture or trace; do not change production classification/parsing yet.
- [ ] Run the contract test and TypeScript; commit diagnostic support.

### Task 2: Fix hybrid-page selection and budget identity bypass

**Files:**
- Modify: `src/features/mainBudget/extractPdfPages.ts`
- Modify: `src/features/mainBudget/pdfExtraction.test.ts`
- Modify: `src/features/mainBudget/parseBudgetSummary.ts`
- Modify: `src/features/mainBudget/budgetParsers.test.ts`
- Modify: `src/features/mainBudget/analyzeBudgetFile.test.ts`

**Interfaces:**
- Consumes the existing `PdfExtractionResult` and parser contracts.
- Produces safe page classification and explicit non-main identity rejection without changing downstream APIs unnecessarily.

- [ ] Add a RED regression for a page with one selectable label+amount row plus raster table operators; assert it is selected for OCR once.
- [ ] Add a RED regression for `2026학년도 제1회 추가경정예산안 추가경정예산의 성립 이전`; assert non-main rejection.
- [ ] Implement image-operator-aware coverage classification. A meaningful sparse text page remains direct only when it is not image-backed; a low-coverage image-backed page is OCR.
- [ ] Evaluate non-main markers independently of legal-boilerplate exemptions; an exemption may suppress only that exact phrase, never the whole title candidate.
- [ ] Run PDF/parser/dispatcher tests and TypeScript; commit.

### Task 3: Recover reviewable sections from supplied scanned PDFs

**Files:**
- Modify only the production OCR normalization/parser files identified by Task 1 evidence.
- Modify their focused tests.
- Create compact synthetic OCR fixtures that reproduce the observed spacing/glyph/order issue; do not commit source PDFs.

**Interfaces:**
- Preserves `BudgetLogicalRow`, parser fact, warning, and result contracts.
- Produces either a completed result or a structurally valid `needs-review` result for each supplied scanned PDF; never a falsely confident amount.

- [ ] Convert the confirmed root cause into the smallest failing synthetic OCR/parser test and capture RED.
- [ ] Implement one minimal correction at the identified source boundary (OCR line grouping, heading normalization, coordinate grid, or parser alias); do not broadly lower confidence/identity gates.
- [ ] Run the focused test and then both supplied scans. If a fix fails, return to diagnosis and form a new single hypothesis; after three failed fixes, stop and report the architectural blocker.
- [ ] Assert extracted warnings include page/location/source text for uncertain required values.
- [ ] Run all main-budget tests, TypeScript, the three reference samples, and both scans; commit.

### Task 4: Final verification and review

**Files:**
- Modify: `README_최종소스.txt` only if observed OCR limitations or supported scan behavior changed.

- [ ] Run `git diff --check`, all main-budget tests, `npx tsc -b --pretty false`, `npm run build`, and the three reference sample verifier.
- [ ] Browser-test text PDF, XLSX, both scans, cancellation, result/reset, and 390×844 layout; stop all processes.
- [ ] Record exact scan outcomes and never claim full OCR success if either remains fatal.
- [ ] Request a whole-remediation review against this plan and the original spec; fix Critical/Important findings through the normal review loop.
- [ ] Invoke `superpowers:verification-before-completion`, then `superpowers:finishing-a-development-branch`.
