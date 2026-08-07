# Closing XLS/XLSX Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Edufine `세입세출결산총괄표` `.xls` and `.xlsx` uploads produce the same closing data while preserving existing behavior and giving precise validation errors.

**Architecture:** Keep the public `ClosingSource` contract unchanged. Add strict file-signature and money-cell normalization helpers inside the closing parser, then route total and detail extraction through the same validated conversion path. Retain browser-only processing and verify with synthetic regression fixtures plus the two user-provided real files.

**Tech Stack:** React 19, TypeScript 5.8, SheetJS `xlsx` 0.18.5, Vitest 3.2, Testing Library, Vite 6, Vercel Preview

## Global Constraints

- Work from the approved design at `docs/superpowers/specs/2026-08-07-closing-xlsx-compatibility-design.md`.
- Do not commit the user-provided school Excel files or other personal data.
- Preserve the public `ClosingSource` type and existing `.xls` output.
- Keep all workbook processing in browser memory; do not upload school data to a server.
- Do not change the budget-agenda, 102-2 supplementary, or prebudget parsers.
- Deploy only to Vercel Preview; do not promote, deploy to Production, or change the production domain without final user approval.
- Use a `codex/` branch created through `superpowers:using-git-worktrees` before implementation.

## File Structure

- Modify `src/features/closing/parser.ts`: actual-format detection, sheet discovery, strict money normalization, detail-row extraction, and user-facing parse errors.
- Modify `src/features/closing/parser.test.ts`: synthetic `.xls`/`.xlsx` parity, invalid money, file signature, fallback sheet discovery, and ambiguous-sheet tests.
- Modify `src/features/closing/ClosingPage.test.tsx`: upload-level success and error-state regression coverage.
- Do not modify `src/features/closing/types.ts`: `ClosingSource`, `IncomeRow`, and `ExpenseRow` remain stable.

---

### Task 1: Reproduce String-Money XLSX Failure and Normalize Money Cells

**Files:**
- Modify: `src/features/closing/parser.test.ts`
- Modify: `src/features/closing/parser.ts`

**Interfaces:**
- Consumes: `parseClosingWorkbook(data: ArrayBuffer): ClosingSource`
- Produces: internal `parseMoneyCell(value: unknown, context: string): number | null`
- Preserves: `ClosingSource`, `IncomeRow`, and `ExpenseRow`

- [ ] **Step 1: Extract the existing synthetic workbook builder in the test file**

Add a helper that can emit numeric or comma-string money values without duplicating the 41-row fixture:

```ts
type MoneyEncoding = "number" | "comma-string";

function encodeMoney(value: number, encoding: MoneyEncoding) {
  return encoding === "number" ? value : value.toLocaleString("en-US");
}

function createClosingWorkbook(
  encoding: MoneyEncoding,
  bookType: "xls" | "xlsx" = "xlsx",
) {
  const rows: unknown[][] = Array.from({ length: 41 }, () => Array(24).fill(""));
  const money = (value: number) => encodeMoney(value, encoding);
  // Move the existing fixture labels into this helper and wrap every money
  // value, including totals and detail amounts, with money(...).
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  return XLSX.write(
    { SheetNames: ["세입세출결산총괄표"], Sheets: { 세입세출결산총괄표: sheet } },
    { type: "array", bookType },
  ) as ArrayBuffer;
}
```

- [ ] **Step 2: Write the failing XLS/XLSX parity test**

```ts
it("쉼표 문자열 금액의 xlsx를 숫자형 xls와 동일하게 읽는다", () => {
  const xls = parseClosingWorkbook(createClosingWorkbook("number", "xls"));
  const xlsx = parseClosingWorkbook(createClosingWorkbook("comma-string", "xlsx"));

  expect(xlsx).toEqual(xls);
  expect(xlsx.incomeRows).toHaveLength(6);
  expect(xlsx.expenseRows).toHaveLength(7);
  expect(xlsx.incomeTotal).toBe(2_724_818_217);
  expect(xlsx.expenseTotal).toBe(2_698_568_069);
});
```

- [ ] **Step 3: Run the focused test and verify the failure**

Run:

```powershell
npm.cmd run test:run -- src/features/closing/parser.test.ts
```

Expected: FAIL with `세입 결산내역을 읽을 수 없습니다.` for the comma-string workbook.

- [ ] **Step 4: Add strict money normalization**

Replace the permissive `asNumber` implementation and use the strict helper for workbook money fields:

```ts
const INTEGER_MONEY = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)$/;

function parseMoneyCell(value: unknown, context: string): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new ClosingParseError(`${context} 금액이 올바르지 않습니다.`);
  }
  const text = String(value).trim();
  if (!INTEGER_MONEY.test(text)) {
    throw new ClosingParseError(`${context} 금액 '${text}'을 숫자로 읽을 수 없습니다.`);
  }
  const parsed = Number(text.replace(/,/g, ""));
  if (!Number.isSafeInteger(parsed)) {
    throw new ClosingParseError(`${context} 금액이 처리 가능한 범위를 벗어났습니다.`);
  }
  return parsed;
}

function requiredMoney(value: unknown, context: string) {
  const parsed = parseMoneyCell(value, context);
  if (parsed === null) throw new ClosingParseError(`${context} 금액이 비어 있습니다.`);
  return parsed;
}
```

Update `numberUnder`, carryover/transfer extraction, `extractIncomeRows`, and `extractExpenseRows` to call `requiredMoney`. For a detail row, include the 1-based Excel row in the context, for example `세입 결산내역 14행`.

- [ ] **Step 5: Run the focused test and verify parity**

Run:

```powershell
npm.cmd run test:run -- src/features/closing/parser.test.ts
```

Expected: all parser tests PASS; numeric `.xls` and comma-string `.xlsx` return equal `ClosingSource` values.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- src/features/closing/parser.ts src/features/closing/parser.test.ts
git commit -m "fix: parse string money in closing xlsx files"
```

---

### Task 2: Validate Actual File Format and Discover the Closing Sheet Safely

**Files:**
- Modify: `src/features/closing/parser.test.ts`
- Modify: `src/features/closing/parser.ts`

**Interfaces:**
- Consumes: workbook bytes and the Task 1 `requiredMoney` path
- Produces: internal `detectExcelContainer(data: ArrayBuffer): "xls" | "xlsx"` and `findClosingSheet(workbook: XLSX.WorkBook)`
- Preserves: `parseClosingWorkbook(data: ArrayBuffer): ClosingSource`

- [ ] **Step 1: Write failing signature and fallback-discovery tests**

```ts
it("엑셀 확장자로 위장한 바이트를 구체적으로 거절한다", () => {
  const fake = new TextEncoder().encode("not an excel workbook").buffer;
  expect(() => parseClosingWorkbook(fake)).toThrow(
    "실제 파일 형식이 올바르지 않습니다",
  );
});

it("시트명이 달라도 결산 제목과 필수 헤더가 있으면 찾는다", () => {
  const data = createClosingWorkbook("comma-string", "xlsx", "결산자료 출력");
  expect(parseClosingWorkbook(data).incomeRows).toHaveLength(6);
});

it("결산표 후보가 둘이면 자동 확정하지 않는다", () => {
  const data = createWorkbookWithTwoValidClosingSheets();
  expect(() => parseClosingWorkbook(data)).toThrow(
    "결산총괄표 후보 시트가 여러 개입니다",
  );
});
```

Extend the test builder signature to accept `sheetName = "세입세출결산총괄표"`. Add `createWorkbookWithTwoValidClosingSheets()` by appending two copies named `결산자료 A` and `결산자료 B`.

- [ ] **Step 2: Run the focused tests and verify all three fail for the intended reason**

Run:

```powershell
npm.cmd run test:run -- src/features/closing/parser.test.ts
```

Expected: the fake-file message is generic, the renamed valid sheet is rejected, and the two-candidate workbook is not identified as ambiguous.

- [ ] **Step 3: Implement container-signature detection**

```ts
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

function detectExcelContainer(data: ArrayBuffer): "xls" | "xlsx" {
  const bytes = new Uint8Array(data);
  const isOle2 = OLE2_SIGNATURE.every((byte, index) => bytes[index] === byte);
  if (isOle2) return "xls";
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "xlsx";
  throw new ClosingParseError(
    "파일 확장자는 엑셀이지만 실제 파일 형식이 올바르지 않습니다.",
  );
}
```

Call it before `XLSX.read` and keep the existing damaged-workbook error for valid containers that SheetJS cannot open.

- [ ] **Step 4: Implement unique structural sheet discovery**

```ts
function isClosingSheet(sheet: XLSX.WorkSheet) {
  const hasTitle = matches(sheet, text => /\d{4}년도 학교회계 결산총괄표/.test(text)).length > 0;
  const required = ["예산액", "세입결산액(A)", "세출결산액(B)", "장", "관", "정책사업"];
  return hasTitle && required.every(label => matches(sheet, text => text === label).length > 0);
}

function findClosingSheet(workbook: XLSX.WorkBook) {
  const exact = workbook.SheetNames.filter(name => name.includes("세입세출결산총괄표"));
  const candidates = exact.length === 1
    ? exact
    : workbook.SheetNames.filter(name => isClosingSheet(workbook.Sheets[name]));
  if (candidates.length === 0) {
    throw new ClosingParseError("에듀파인 세입세출결산총괄표 시트를 찾을 수 없습니다.");
  }
  if (candidates.length > 1) {
    throw new ClosingParseError("결산총괄표 후보 시트가 여러 개입니다. 사용할 시트명에 '세입세출결산총괄표'를 포함해 주세요.");
  }
  return { name: candidates[0], sheet: workbook.Sheets[candidates[0]] };
}
```

- [ ] **Step 5: Run the parser tests**

Run:

```powershell
npm.cmd run test:run -- src/features/closing/parser.test.ts
```

Expected: all signature, fallback discovery, ambiguity, string-money, and legacy tests PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- src/features/closing/parser.ts src/features/closing/parser.test.ts
git commit -m "feat: validate closing workbook structure"
```

---

### Task 3: Verify Upload-Level Behavior and Clear Error State

**Files:**
- Modify: `src/features/closing/ClosingPage.test.tsx`
- Modify only if the test exposes a defect: `src/features/closing/ClosingPage.tsx`

**Interfaces:**
- Consumes: `ClosingPage`, `parseClosingWorkbook`, `ClosingParseError`
- Produces: verified upload transition and actionable error rendering

- [ ] **Step 1: Add a successful comma-string XLSX upload test**

Move the smallest reusable synthetic workbook helper to the test file or create a local two-row valid fixture that satisfies the parser, then add:

```ts
it("쉼표 문자열 금액의 xlsx 업로드 후 편집 화면을 표시한다", async () => {
  const user = userEvent.setup();
  render(<ClosingPage />);
  const file = new File(
    [new Uint8Array(createClosingWorkbook("comma-string", "xlsx"))],
    "세입세출결산총괄표.xlsx",
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  );

  await user.upload(screen.getByLabelText("세입세출결산총괄표 파일"), file);

  expect(await screen.findByText("서울옥정초등학교")).toBeVisible();
  expect(screen.getByText("2,724,818,217원")).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Add an invalid-container upload test**

```ts
it("확장자만 xlsx인 파일에 실제 형식 오류를 표시한다", async () => {
  const user = userEvent.setup({ applyAccept: false });
  render(<ClosingPage />);
  await user.upload(
    screen.getByLabelText("세입세출결산총괄표 파일"),
    new File(["not excel"], "세입세출결산총괄표.xlsx"),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "실제 파일 형식이 올바르지 않습니다",
  );
});
```

- [ ] **Step 3: Run the page tests**

Run:

```powershell
npm.cmd run test:run -- src/features/closing/ClosingPage.test.tsx
```

Expected: both new tests PASS. If stale state remains after an error, modify only `loadFile` in `ClosingPage.tsx` so error paths clear `source`, `draft`, `originalDraft`, and `validations` exactly once.

- [ ] **Step 4: Run all closing-feature tests**

Run:

```powershell
npm.cmd run test:run -- src/features/closing
```

Expected: all closing parser, editor, preview, validation, formatting, and exporter tests PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- src/features/closing/ClosingPage.test.tsx src/features/closing/ClosingPage.tsx
git diff --cached --quiet -- src/features/closing/ClosingPage.tsx; if ($LASTEXITCODE -eq 0) { git reset -- src/features/closing/ClosingPage.tsx }
git commit -m "test: cover closing xlsx uploads"
```

---

### Task 4: Full Regression, Real-File Verification, and Preview Deployment

**Files:**
- Modify only when verification reveals a scoped defect: files from Tasks 1-3
- Do not add the real files under `C:/Users/User/Downloads` or `C:/Users/User/Desktop` to Git

**Interfaces:**
- Consumes: completed closing parser and UI changes
- Produces: test evidence, build evidence, real-file parity evidence, and a Vercel Preview URL

- [ ] **Step 1: Verify the real `.xls` and `.xlsx` through a temporary read-only diagnostic**

Run both user files through the built parser without copying them into the repository:

```powershell
npm.cmd run test:run -- src/features/closing/parser.test.ts
```

Then perform a browser upload using:

- `C:/Users/User/Desktop/결산서/세입세출결산총괄표.xls`
- `C:/Users/User/Downloads/세입세출결산총괄표.xlsx`

Expected for both:

- 학년도 `2025`
- 학교명 `서울옥정초등학교`
- 세입결산액 `2,724,818,217`
- 세출결산액 `2,698,568,069`
- 세계잉여금 `26,250,148`
- 세입 상세 6건
- 세출 상세 7건

- [ ] **Step 2: Run the full automated test suite**

Run:

```powershell
npm.cmd run test:run
```

Expected: all tests PASS, including the existing 84-test baseline plus the new regression cases.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm.cmd run build
```

Expected: TypeScript and Vite build exit 0. Record but do not hide the existing large-chunk warning if it remains.

- [ ] **Step 4: Inspect the final diff and repository hygiene**

Run:

```powershell
git status --short
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git ls-files | rg "세입세출결산총괄표|2026집행실적"
```

Expected: only source, tests, specs, and plan files are tracked; no real school workbook is listed.

- [ ] **Step 5: Request code review before publishing**

Use `superpowers:requesting-code-review` and resolve any correctness findings. Re-run the focused tests after each accepted correction.

- [ ] **Step 6: Deploy the branch to Vercel Preview only**

Use `vercel:deployments-cicd` against the linked `school-budget-portal` project and explicitly select Preview. Do not run a production deployment or promotion command.

Expected: a unique `https://*.vercel.app` Preview URL that is not the production domain.

- [ ] **Step 7: Verify the Preview end-to-end**

Upload the real `.xls`, the real `.xlsx`, and an invalid `.xlsx` to Preview. Confirm the two valid files display equal totals and the invalid file displays the actual-format error. Verify there are no new console errors.

- [ ] **Step 8: Report the required test matrix and wait for production approval**

Report at minimum:

| Test | Expected result |
|---|---|
| `.xls` upload | Pass, 6 income rows and 7 expense rows |
| `.xlsx` upload | Pass, same amounts as `.xls` |
| Invalid file upload | Clear actual-format error |
| Existing closing functions | All closing tests pass |
| Entire application regression | Full Vitest suite passes |
| Production build | Pass |
| Preview browser verification | Pass with Preview URL |

Do not push to the production deployment path or promote the Preview until the user explicitly approves Production.
