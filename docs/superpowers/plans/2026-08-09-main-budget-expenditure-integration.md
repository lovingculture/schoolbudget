# 본예산 세출 요구자료 통합·검토 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부서별 본예산 세출 요구자료 `.xls`·`.xlsx` 여러 파일을 브라우저에서 통합하고, 산출식·금액·누락·중복을 검토해 화면과 다운로드에 동일한 결과를 제공한다.

**Architecture:** `mainBudget` 기능 폴더 안에서 파일 파싱, 안전한 산출식 계산, 검토 규칙, 통합 요약, 저장, 내보내기를 각각 독립 모듈로 둔다. UI는 `세출자료 통합·검토`와 `세입자료·3% 검토` 두 탭을 제공하되 이번 구현에서는 세출 전체 흐름과 세입자료 미등록 안내만 완성한다. 세출 통합 행은 후속 3% 계산기가 원가통계비목별 요구액을 집계할 수 있는 공통 데이터 계약으로 유지한다.

**Tech Stack:** React 19, TypeScript 5.8, SheetJS `xlsx` 0.18.5, ExcelJS 4.4, Vitest, Testing Library, Vite

## Global Constraints

- 부서별 다중 업로드는 세출 요구자료에만 적용한다.
- `.xls`와 `.xlsx`를 모두 지원하고 확장자 외 실제 통합문서 구조를 검증한다.
- VBA, `eval`, `Function` 생성 또는 외부 서버 전송을 사용하지 않는다.
- 해석 불가 산출식과 불확실한 분류는 추측하지 않고 `확인 필요`로 표시한다.
- 세입자료 없이 세출 통합·검토·다운로드가 독립적으로 작동해야 한다.
- 세입 탭은 세출 상태와 분리하며 세입 표본 수령 전에는 자료 미등록 안내를 표시한다.
- 모든 금액은 숫자로 보관하고 화면과 다운로드에는 천 단위 쉼표를 적용한다.
- 기존 결산·추경·성립전예산·안건설명서 기능을 변경하거나 깨뜨리지 않는다.

---

### Task 1: 세출 통합 데이터 계약과 안전한 산출식 계산기

**Files:**
- Create: `src/features/mainBudget/types.ts`
- Create: `src/features/mainBudget/calculateExpression.ts`
- Test: `src/features/mainBudget/calculateExpression.test.ts`

**Interfaces:**
- Produces: `MainBudgetExpenditureRow`, `ReviewIssue`, `ReviewLevel`, `ExpressionResult`
- Produces: `calculateBudgetExpression(expression: string): ExpressionResult`

- [ ] **Step 1: Write the failing calculation tests**

```ts
expect(calculateBudgetExpression("100,000원 × 3명 × 2회")).toEqual({ ok: true, value: 600000 });
expect(calculateBudgetExpression("50,000*2 + 30,000")).toEqual({ ok: true, value: 130000 });
expect(calculateBudgetExpression("")).toEqual({ ok: false, reason: "산출식이 비어 있습니다." });
expect(calculateBudgetExpression("SUM(A1:A3)").ok).toBe(false);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd run test:run -- src/features/mainBudget/calculateExpression.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Define the shared row and issue types**

```ts
export type ReviewLevel = "error" | "warning" | "review";
export interface ReviewIssue { code: string; level: ReviewLevel; message: string; basis: string; }
export interface MainBudgetExpenditureRow {
  id: string; sourceFile: string; sourceSheet: string; sourceRow: number;
  department: string; business: string; detail: string; costCategory: string;
  description: string; expression: string; originalRequestedAmount?: number;
  requestedAmount?: number; manager: string; priorExpression: string;
  priorRequestedAmount?: number; variance?: number; issues: ReviewIssue[];
}
export type ExpressionResult = { ok: true; value: number } | { ok: false; reason: string };
```

- [ ] **Step 4: Implement a token-based arithmetic parser**

Normalize commas, Korean counting units, `×`, `x`, and `X`; accept only numbers, decimal points, `+`, `-`, `*`, `/`, and parentheses. Parse tokens with operator precedence and reject identifiers, cell references, unbalanced parentheses, non-finite results, and division by zero.

- [ ] **Step 5: Run calculation tests**

Run: `npm.cmd run test:run -- src/features/mainBudget/calculateExpression.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudget/types.ts src/features/mainBudget/calculateExpression.ts src/features/mainBudget/calculateExpression.test.ts
git commit -m "feat: calculate main budget expenditure formulas"
```

### Task 2: `.xls`·`.xlsx` 세출 요구서 파서

**Files:**
- Create: `src/features/mainBudget/parseExpenditureWorkbook.ts`
- Test: `src/features/mainBudget/parseExpenditureWorkbook.test.ts`
- Test fixture: `src/features/mainBudget/__fixtures__/buildWorkbook.ts`

**Interfaces:**
- Consumes: `calculateBudgetExpression`, `MainBudgetExpenditureRow`
- Produces: `parseExpenditureWorkbook(file: File): Promise<ParsedExpenditureFile>`
- Produces: `ParsedExpenditureFile { fileName, sheetName, rows, originalTotal, warnings }`

- [ ] **Step 1: Write failing parser tests**

Create in-memory workbooks for exact `세출예산서식`, a renamed sheet with the same 11 headers, a VBA-style `#NAME?` cached cell, an empty template, and a workbook missing required headers. Assert that header matching finds the correct sheet, blank rows are skipped, source row numbers are retained, and one malformed file throws `ExpenditureParseError` with missing header names.

- [ ] **Step 2: Run parser tests to verify they fail**

Run: `npm.cmd run test:run -- src/features/mainBudget/parseExpenditureWorkbook.test.ts`

Expected: FAIL because the parser does not exist.

- [ ] **Step 3: Implement workbook and header validation**

Use `XLSX.read(await file.arrayBuffer(), { type: "array", cellFormula: true, cellDates: true })`. Search every visible or hidden sheet for a row containing the required header aliases. Reject empty bytes, encrypted/corrupt workbooks, and sheets lacking the minimum identification columns with Korean user-facing messages.

- [ ] **Step 4: Implement row extraction and calculated values**

Map all 11 columns, convert numeric cells and comma-formatted strings to numbers, calculate `requestedAmount` from `expression`, calculate `variance = requestedAmount - priorRequestedAmount`, preserve `originalRequestedAmount`, and treat `#NAME?` as an unavailable original value rather than a file failure.

- [ ] **Step 5: Run parser tests**

Run: `npm.cmd run test:run -- src/features/mainBudget/parseExpenditureWorkbook.test.ts`

Expected: PASS for `.xls`-style and `.xlsx`-style fixtures and all failure cases.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudget/parseExpenditureWorkbook.ts src/features/mainBudget/parseExpenditureWorkbook.test.ts src/features/mainBudget/__fixtures__/buildWorkbook.ts
git commit -m "feat: parse department expenditure workbooks"
```

### Task 3: 세출 검토 규칙과 통합 요약

**Files:**
- Create: `src/features/mainBudget/reviewExpenditures.ts`
- Create: `src/features/mainBudget/summarizeExpenditures.ts`
- Test: `src/features/mainBudget/reviewExpenditures.test.ts`
- Test: `src/features/mainBudget/summarizeExpenditures.test.ts`

**Interfaces:**
- Produces: `reviewExpenditures(rows: MainBudgetExpenditureRow[]): MainBudgetExpenditureRow[]`
- Produces: `summarizeExpenditures(rows: MainBudgetExpenditureRow[]): ExpenditureSummary`

- [ ] **Step 1: Write failing review tests**

Assert issues for missing department/business/detail/cost category/description, unsupported expressions, original-versus-calculated amount mismatch, incorrect original variance, identical duplicate keys, zero/negative amounts, and configurable unusually large amounts. Assert that valid rows remain issue-free and duplicate warnings affect only matching rows.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd run test:run -- src/features/mainBudget/reviewExpenditures.test.ts src/features/mainBudget/summarizeExpenditures.test.ts`

Expected: FAIL because review and summary modules do not exist.

- [ ] **Step 3: Implement pure review rules**

Use stable issue codes such as `REQUIRED_DEPARTMENT`, `EXPRESSION_UNSUPPORTED`, `REQUEST_AMOUNT_MISMATCH`, `VARIANCE_MISMATCH`, `DUPLICATE_SUSPECTED`, and `AMOUNT_OUTLIER`. Each issue must include level, problem text, and calculation or matching basis.

- [ ] **Step 4: Implement the reusable summary**

Return total requested amount, prior total, variance, distinct department count, row count, and counts by review level. Ignore rows without a calculated amount in money totals and expose their count as `unresolvedCount`.

- [ ] **Step 5: Run review and summary tests**

Run: `npm.cmd run test:run -- src/features/mainBudget/reviewExpenditures.test.ts src/features/mainBudget/summarizeExpenditures.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudget/reviewExpenditures.ts src/features/mainBudget/summarizeExpenditures.ts src/features/mainBudget/*.test.ts
git commit -m "feat: review and summarize expenditure requests"
```

### Task 4: 본예산 두 탭과 다중 파일 업로드 UI

**Files:**
- Create: `src/features/mainBudget/MainBudgetPage.tsx`
- Create: `src/features/mainBudget/ExpenditureUploadPanel.tsx`
- Create: `src/features/mainBudget/ExpenditureTable.tsx`
- Create: `src/features/mainBudget/mainBudget.css`
- Test: `src/features/mainBudget/MainBudgetPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: parser, review, summary modules
- Produces: `<MainBudgetPage />` routed from `view === "budget"`

- [ ] **Step 1: Write failing navigation and upload tests**

Assert that the former `준비 중` card opens `본예산 편성`, two accessible tabs appear, the file input accepts `.xls,.xlsx` and `multiple`, mixed successful and failed files show independent status rows, and switching to `세입자료·3% 검토` displays `세입자료를 등록하면 업무추진비 3% 한도를 계산할 수 있습니다.` without clearing expenditure results.

- [ ] **Step 2: Run UI tests to verify they fail**

Run: `npm.cmd run test:run -- src/features/mainBudget/MainBudgetPage.test.tsx src/App.test.tsx`

Expected: FAIL because the page is not routed.

- [ ] **Step 3: Implement page state and per-file isolation**

Use `Promise.allSettled` for selected files. Merge successful rows, retain file name/row count/total/status for every file, and show corrupt or structurally invalid file messages without discarding successful files.

- [ ] **Step 4: Implement summary cards and expenditure table**

Add cards for requested total, prior total, variance, departments, unresolved rows, and issue counts. Add department, business, detail, cost category, and issue-level filters; keyword search; sortable columns; sticky header; page-size selection; result count; filtered money totals; and a reset button.

- [ ] **Step 5: Implement separate revenue placeholder tab**

Keep revenue state separate from expenditure state. Show the required-data explanation and disabled 3% result area. Do not add a fake calculation or derive revenue from expenditure files.

- [ ] **Step 6: Route the page and remove the home `준비 중` badge**

Import `MainBudgetPage`, render it for the `budget` view, and update home copy to describe department expenditure consolidation.

- [ ] **Step 7: Run UI tests**

Run: `npm.cmd run test:run -- src/features/mainBudget/MainBudgetPage.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/features/mainBudget src/App.tsx src/App.test.tsx
git commit -m "feat: add main budget expenditure workspace"
```

### Task 5: 브라우저 임시저장과 독립 초기화

**Files:**
- Create: `src/features/mainBudget/storage.ts`
- Test: `src/features/mainBudget/storage.test.ts`
- Modify: `src/features/mainBudget/MainBudgetPage.tsx`
- Modify: `src/features/mainBudget/MainBudgetPage.test.tsx`

**Interfaces:**
- Produces: `mainBudgetStorage.loadExpenditures()`, `saveExpenditures(rows)`, `clearExpenditures()`

- [ ] **Step 1: Write failing storage tests**

Assert versioned JSON storage, runtime normalization of every persisted field, invalid JSON cleanup, legacy/unknown field tolerance, restoration after remount, and expenditure-only reset confirmation.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm.cmd run test:run -- src/features/mainBudget/storage.test.ts src/features/mainBudget/MainBudgetPage.test.tsx`

Expected: FAIL because storage is absent.

- [ ] **Step 3: Implement versioned local storage**

Use key `school-budget:main-budget:expenditures:v1`. Persist normalized rows and file summaries, not original file bytes. On malformed data remove the key and return an empty state.

- [ ] **Step 4: Connect save, restore, and confirmed reset**

Save after successful parsing and user-visible filtering-independent changes. Reset only expenditure rows and expenditure file summaries after `window.confirm`; leave the revenue tab state untouched.

- [ ] **Step 5: Run storage and UI tests**

Run: `npm.cmd run test:run -- src/features/mainBudget/storage.test.ts src/features/mainBudget/MainBudgetPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudget/storage.ts src/features/mainBudget/storage.test.ts src/features/mainBudget/MainBudgetPage.tsx src/features/mainBudget/MainBudgetPage.test.tsx
git commit -m "feat: persist main budget expenditure drafts"
```

### Task 6: 통합본과 오류검토 보고서 다운로드

**Files:**
- Create: `src/features/mainBudget/exportExpenditures.ts`
- Test: `src/features/mainBudget/exportExpenditures.test.ts`
- Modify: `src/features/mainBudget/MainBudgetPage.tsx`

**Interfaces:**
- Produces: `buildExpenditureWorkbook(rows, filters): Promise<ExcelJS.Buffer>`
- Produces: `downloadIntegratedExpenditures(rows)`, `downloadExpenditureReview(rows)`

- [ ] **Step 1: Write failing exporter tests**

Assert that the integrated workbook contains source file/sheet/row, all 11 business columns, calculated requested amount and variance, review status, and formulas or numeric totals. Assert that the review report contains one row per issue with level, department, business, source location, problem, basis, and recommended check. Reconcile workbook totals with `summarizeExpenditures`.

- [ ] **Step 2: Run exporter tests to verify they fail**

Run: `npm.cmd run test:run -- src/features/mainBudget/exportExpenditures.test.ts`

Expected: FAIL because exporter functions do not exist.

- [ ] **Step 3: Implement styled Excel exports**

Use ExcelJS to create `세출통합`, `파일현황`, and `검토결과` sheets with frozen headers, autofilters, whole-number format `#,##0`, readable widths, status colors, and top summary formulas. Use the same filtered-row selector and summary function as the screen.

- [ ] **Step 4: Connect explicit download buttons**

Add `세출 통합본(XLSX)` and `오류검토 보고서(XLSX)` buttons. Disable them when no rows exist and use filenames containing the current date.

- [ ] **Step 5: Run exporter and UI tests**

Run: `npm.cmd run test:run -- src/features/mainBudget/exportExpenditures.test.ts src/features/mainBudget/MainBudgetPage.test.tsx`

Expected: PASS and workbook totals equal screen totals.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudget/exportExpenditures.ts src/features/mainBudget/exportExpenditures.test.ts src/features/mainBudget/MainBudgetPage.tsx
git commit -m "feat: export consolidated expenditure reviews"
```

### Task 7: 실제 표본 검증과 전체 회귀검사

**Files:**
- Modify: `src/features/mainBudget/parseExpenditureWorkbook.test.ts`
- Modify only if a verified defect exists: files under `src/features/mainBudget/`

**Interfaces:**
- Consumes: the complete expenditure integration flow
- Produces: verified build ready for Preview deployment

- [ ] **Step 1: Run the parser against the supplied `budget.xls`**

Verify three sheets are read, `세출예산서식` is selected, 11 headers are recognized, the empty template reports `입력 자료 없음`, and VBA formulas `calstr`/`CalMinus` do not crash parsing.

- [ ] **Step 2: Run focused main-budget tests**

Run: `npm.cmd run test:run -- src/features/mainBudget`

Expected: all main-budget tests PASS.

- [ ] **Step 3: Run full regression tests**

Run: `npm.cmd run test:run`

Expected: all existing and new tests PASS.

- [ ] **Step 4: Run production build and diff checks**

Run: `npm.cmd run build`

Expected: TypeScript and Vite build PASS; existing chunk-size warning is acceptable.

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 5: Commit any fixture-backed verification additions**

```powershell
git add src/features/mainBudget
git commit -m "test: verify supplied expenditure workbook"
```

Do not commit `C:/Users/User/Desktop/자료/budget.xls`, personal metadata, `.tmp-spreadsheet-analysis/`, or generated build output.
