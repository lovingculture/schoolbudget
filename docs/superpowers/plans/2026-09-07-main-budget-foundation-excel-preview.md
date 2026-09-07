# Main Budget Foundation Excel Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Analyze K-에듀파인 Excel budget statements in the browser, render workbook-like previews, and offer generated/output workbook downloads through an accessible modal.

**Architecture:** Add an Excel adapter that converts workbook rows into the existing `FoundationBudgetDocument`, preserving the current validation and workbook generator. Replace the current compressed result grid with sheet-specific preview models and a fixed-width spreadsheet viewport, and isolate download choices in an accessible dialog.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, SheetJS (`xlsx`), ExcelJS, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-09-07-main-budget-foundation-excel-preview-design.md`

## Global Constraints

- Support `.xls` and `.xlsx`; retain `.csv` compatibility.
- Keep all analysis in the browser and do not upload source workbooks.
- Use the existing `FoundationBudgetDocument` as the shared normalized model.
- Preview tabs must be ordered `세입`, `세출(원안)`, `세출(조정안)`, `업무추진비`.
- The macro template must download as an attachment without modification.
- Preserve unrelated working-tree files and existing site capabilities.

---

### Task 1: Excel Budget Statement Adapter

**Files:**
- Create: `src/features/mainBudgetFoundation/parseFoundationExcel.ts`
- Create: `src/features/mainBudgetFoundation/parseFoundationExcel.test.ts`
- Modify: `src/features/mainBudgetFoundation/types.ts`

**Interfaces:**
- Consumes: `ArrayBuffer`, source file name, existing `FoundationBudgetDocument` types.
- Produces: `parseFoundationExcel(buffer: ArrayBuffer, fileName: string): FoundationBudgetDocument`.

- [ ] **Step 1: Write failing tests for workbook sheet/header detection, numeric normalization, fiscal year, revenue totals, and expense totals.** Build in-memory SheetJS workbooks containing representative `세입예산명세서` and `세출예산명세서` rows and assert the normalized fields.
- [ ] **Step 2: Run `npm test -- parseFoundationExcel.test.ts` and verify failures identify the missing adapter.**
- [ ] **Step 3: Implement `parseFoundationExcel` with SheetJS, header alias matching, merged/blank row tolerance, and clear errors when required statement sections are absent.**
- [ ] **Step 4: Run the focused parser tests and the existing CSV parser tests.**
- [ ] **Step 5: Commit the adapter and its tests.**

### Task 2: Excel-first Upload Flow

**Files:**
- Modify: `src/features/mainBudgetFoundation/FoundationCsvUpload.tsx`
- Modify: `src/features/mainBudgetFoundation/MainBudgetFoundationPage.tsx`
- Modify: `src/features/mainBudgetFoundation/MainBudgetFoundationPage.test.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `parseFoundationExcel`, existing `parseFoundationCsv`, validation and storage functions.
- Produces: one file-selection flow accepting `.xls,.xlsx,.csv` and routing by extension.

- [ ] **Step 1: Update component tests to require the Excel-first labels, accepted extensions, exact guide copy, and retained CSV fallback.**
- [ ] **Step 2: Run the focused UI tests and verify they fail against the CSV-only interface.**
- [ ] **Step 3: Update the upload component and page handler to read Excel as `ArrayBuffer`, CSV as text, and show format-specific errors without changing the normalized result state.**
- [ ] **Step 4: Run the focused UI tests and confirm the upload/validation/reset flows pass.**
- [ ] **Step 5: Commit the Excel-first upload flow.**

### Task 3: Workbook-like Preview Tabs

**Files:**
- Create: `src/features/mainBudgetFoundation/FoundationWorkbookPreview.tsx`
- Create: `src/features/mainBudgetFoundation/FoundationWorkbookPreview.test.tsx`
- Modify: `src/features/mainBudgetFoundation/MainBudgetFoundationPage.tsx`
- Modify: `src/features/mainBudgetFoundation/mainBudgetFoundation.css`

**Interfaces:**
- Consumes: `FoundationBudgetDocument` and existing revenue classification/business-expense selection helpers.
- Produces: `FoundationWorkbookPreview({ document }: { document: FoundationBudgetDocument })` with four accessible tabs and Excel-aligned tables.

- [ ] **Step 1: Write failing tests for four tab names, tab order, selected-panel linkage, currency formatting, and representative workbook headers.**
- [ ] **Step 2: Run the preview tests and verify failure because the component does not exist.**
- [ ] **Step 3: Implement preview view models and tables for all four sheets, including title/summary rows and formula-derived display values.**
- [ ] **Step 4: Add fixed column widths, non-collapsing table minimum widths, sticky headers, spreadsheet grid borders, controlled wrapping, and internal scrollbars; retain usable mobile controls.**
- [ ] **Step 5: Run preview and page tests, then commit the workbook-like preview.**

### Task 4: Download Dialog and Macro Template Route

**Files:**
- Create: `src/features/mainBudgetFoundation/FoundationDownloadDialog.tsx`
- Create: `src/features/mainBudgetFoundation/FoundationDownloadDialog.test.tsx`
- Modify: `src/features/mainBudgetFoundation/MainBudgetFoundationPage.tsx`
- Create: `public/download/school-main-budget-foundation-template.xlsm`
- Modify: `server/index.ts`
- Modify: relevant server route test file discovered beside `server/index.ts`

**Interfaces:**
- Consumes: `downloadFoundationWorkbook(document)` and `/download/school-main-budget-foundation-template.xlsm`.
- Produces: accessible modal with `분석 결과 Excel` and `작업용 매크로 양식` actions; attachment response for the template.

- [ ] **Step 1: Write failing dialog tests for open/close, Escape, focusable labels, disabled result download before validation, and both download actions.**
- [ ] **Step 2: Write a failing route test requiring macro-enabled MIME type, attachment disposition, and `nosniff`.**
- [ ] **Step 3: Copy the user-provided `.xlsm` unchanged into the public download path and verify its SHA-256 matches the source.**
- [ ] **Step 4: Implement the dialog and server response headers, then connect the result action to the existing ExcelJS generator.**
- [ ] **Step 5: Run dialog/route tests and commit the download flow.**

### Task 5: Related Copy and Regression Coverage

**Files:**
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/guide/UsageGuidePage.tsx`
- Modify: `src/features/guide/UsageGuidePage.test.tsx`
- Modify: `src/features/mainBudgetFoundation/buildFoundationWorkbook.test.ts`

**Interfaces:**
- Consumes: final user-visible terminology and existing workbook generator.
- Produces: consistent Excel-first copy and regression assertions for generated sheet order/content.

- [ ] **Step 1: Update tests to require Excel-first wording and the four generated sheet names in the approved order.**
- [ ] **Step 2: Run the focused tests and verify the copy assertions fail before edits.**
- [ ] **Step 3: Replace CSV-only home/guide copy while retaining a brief compatibility note; adjust workbook generation only if tests expose a mismatch with the approved template structure.**
- [ ] **Step 4: Run all main-budget-foundation tests and `npm run build`.**
- [ ] **Step 5: Commit copy and regression updates.**

### Task 6: End-to-End Verification and Publishing

**Files:**
- Modify only files required by defects discovered during verification.

**Interfaces:**
- Consumes: completed feature, production build, existing Sites project configuration.
- Produces: verified and deployed site version.

- [ ] **Step 1: Run the full `npm run test:run` suite and fix only failures caused by this feature.**
- [ ] **Step 2: Run `npm run build` and confirm the production bundle completes.**
- [ ] **Step 3: Exercise upload, tab switching, modal download, and reset in the browser using a representative Excel workbook; confirm there are no console errors or broken table wrapping.**
- [ ] **Step 4: Verify the generated `.xlsx` opens with four ordered sheets and verify live response headers for the `.xlsm` template attachment.**
- [ ] **Step 5: Push the completed commits, create and deploy the next Sites version, confirm terminal deployment success, and open the deployed URL for the user.**

