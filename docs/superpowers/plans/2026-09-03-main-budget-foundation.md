# 본예산 편성 기초자료 만들기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** K-에듀파인 세입·세출 통합 CSV를 브라우저에서 분석·검증하고, 편집 가능한 본예산 편성 기초자료 `.xlsx`를 생성하는 새 업무 화면을 만든다.

**Architecture:** `mainBudgetFoundation` 기능 폴더 안에서 CSV 해석, 정규화·검증, 분류, 임시저장, Excel 생성과 React 화면을 각각 분리한다. 입력 파일은 서버로 보내지 않고 `File.arrayBuffer()`와 브라우저 `TextDecoder`로 처리하며, 출력은 기존 프로젝트의 ExcelJS 패턴을 따라 브라우저에서 생성한다.

**Tech Stack:** React 19, TypeScript 5.8, Vitest, Testing Library, ExcelJS 4.4, Vite, browser `TextDecoder`, `localStorage`

**Spec:** `docs/superpowers/specs/2026-09-03-main-budget-foundation-design.md`

## Global Constraints

- 첫 버전 기준 파일은 `C:/Users/User/Desktop/예산서/000 (2).csv`와 `C:/Users/User/Desktop/예산서/학교본예산편성_자동화_CSV지원.xlsm`이다.
- 입력은 세입·세출이 이어진 CSV 한 파일이며 UTF-8과 EUC-KR/CP949를 지원한다.
- 행 번호를 고정하지 않고 제목, 머리글과 합계 표식으로 구간을 찾는다.
- 원본 파일은 서버로 전송하거나 저장하지 않는다.
- 출력은 매크로 없는 `.xlsx`이며 주요 합계와 증감은 Excel 수식이어야 한다.
- 합계나 필수 구조 검증에 실패하면 Excel 생성을 차단한다.
- 기존 사이트 색상, 카드 구성, 뒤로가기·목록으로 가기와 모바일 동작을 유지한다.
- 사용자 입력과 변환 결과는 별도 버전의 브라우저 저장소에 임시저장한다.

---

### Task 1: CSV 픽스처와 도메인 타입

**Files:**
- Create: `src/features/mainBudgetFoundation/fixtures/combinedBudgetSample.ts`
- Create: `src/features/mainBudgetFoundation/types.ts`
- Create: `src/features/mainBudgetFoundation/types.test.ts`

**Interfaces:**
- Produces: `FoundationBudgetDocument`, `FoundationRevenueRow`, `FoundationExpenseRow`, `FoundationWarning`, `FoundationValidation`
- Produces: `COMBINED_BUDGET_SAMPLE_BYTES` as a compact EUC-KR-compatible regression fixture built from representative rows, not the full school file.

- [ ] **Step 1: Write the failing type/fixture test**

```ts
import { describe, expect, it } from "vitest";
import { combinedBudgetSampleText } from "./fixtures/combinedBudgetSample";

describe("본예산 기초자료 샘플", () => {
  it("contains both sections and source totals", () => {
    expect(combinedBudgetSampleText).toContain("세입예산명세서");
    expect(combinedBudgetSampleText).toContain("세입합계,\"1,010,749\"");
    expect(combinedBudgetSampleText).toContain("세출예산명세서");
    expect(combinedBudgetSampleText).toContain("세출합계,\"1,010,749\"");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --run src/features/mainBudgetFoundation/types.test.ts`

Expected: FAIL because the fixture and types do not exist.

- [ ] **Step 3: Add focused domain types and anonymized fixture rows**

```ts
export type FoundationSection = "revenue" | "expense";

export interface FoundationSourceLocation { line: number; raw: string }
export interface FoundationRevenueRow {
  chapter: string; division: string; section: string; item: string; costItem: string;
  currentAmount: number; priorAmount: number; changeAmount: number;
  calculationBasis: string; calculationAmount: number | null;
  source: FoundationSourceLocation;
}
export interface FoundationExpenseRow {
  policy: string; unit: string; business: string; detail: string; costItem: string;
  currentAmount: number; priorAmount: number; changeAmount: number;
  calculationBasis: string; calculationAmount: number | null;
  department: string; manager: string;
  source: FoundationSourceLocation;
}
export interface FoundationWarning {
  code: string; message: string; severity: "warning" | "error"; line?: number;
}
export interface FoundationBudgetDocument {
  fileName: string; fiscalYear: number; budgetType: string; unit: "천원";
  revenueRows: FoundationRevenueRow[]; expenseRows: FoundationExpenseRow[];
  sourceRevenueTotal: number; sourceExpenseTotal: number;
  warnings: FoundationWarning[];
}
export interface FoundationValidation {
  revenueDetailTotal: number; expenseDetailTotal: number; balanceDifference: number;
  canExport: boolean; warnings: FoundationWarning[];
}
```

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- --run src/features/mainBudgetFoundation/types.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/mainBudgetFoundation
git commit -m "test(main-budget-foundation): add domain fixtures"
```

### Task 2: 인코딩 판별과 CSV 레코드 해석

**Files:**
- Create: `src/features/mainBudgetFoundation/decodeCsv.ts`
- Create: `src/features/mainBudgetFoundation/decodeCsv.test.ts`
- Create: `src/features/mainBudgetFoundation/parseCsvRecords.ts`
- Create: `src/features/mainBudgetFoundation/parseCsvRecords.test.ts`

**Interfaces:**
- Produces: `decodeBudgetCsv(bytes: ArrayBuffer): { text: string; encoding: "utf-8" | "euc-kr" }`
- Produces: `parseCsvRecords(text: string): string[][]`
- Consumes: browser `TextDecoder`; no network or file upload API.

- [ ] **Step 1: Write failing encoding tests**

```ts
it("prefers UTF-8 when Korean headings decode cleanly", () => {
  const bytes = new TextEncoder().encode("2026학년도 세입예산명세서").buffer;
  expect(decodeBudgetCsv(bytes)).toMatchObject({ encoding: "utf-8", text: expect.stringContaining("세입예산명세서") });
});

it("decodes the CP949 fixture without replacement characters", () => {
  const result = decodeBudgetCsv(cp949Fixture.buffer);
  expect(result.encoding).toBe("euc-kr");
  expect(result.text).toContain("세출예산명세서");
  expect(result.text).not.toContain("�");
});
```

- [ ] **Step 2: Run encoding tests and verify RED**

Run: `npm test -- --run src/features/mainBudgetFoundation/decodeCsv.test.ts`

Expected: FAIL because `decodeBudgetCsv` does not exist.

- [ ] **Step 3: Implement deterministic decoding**

```ts
const REQUIRED_MARKERS = ["세입예산명세서", "세출예산명세서"];

function score(text: string): number {
  return REQUIRED_MARKERS.filter((marker) => text.includes(marker)).length * 100
    - (text.match(/�/g)?.length ?? 0);
}

export function decodeBudgetCsv(bytes: ArrayBuffer) {
  const candidates = (["utf-8", "euc-kr"] as const).map((encoding) => ({
    encoding,
    text: new TextDecoder(encoding).decode(bytes),
  }));
  return candidates.sort((a, b) => score(b.text) - score(a.text))[0];
}
```

- [ ] **Step 4: Write failing quoted CSV tests**

```ts
it("keeps commas and line breaks inside quoted cells", () => {
  expect(parseCsvRecords('항목,산출기초\r\n이자수입,"예금, 이자\n1회"')).toEqual([
    ["항목", "산출기초"],
    ["이자수입", "예금, 이자\n1회"],
  ]);
});
```

- [ ] **Step 5: Implement the RFC-4180 state machine and verify GREEN**

Implement a character scanner with `quoted`, `cell`, `row`, and `records` state. A doubled quote inside a quoted cell appends one literal quote; commas and CR/LF terminate fields only while `quoted === false`.

Run: `npm test -- --run src/features/mainBudgetFoundation/decodeCsv.test.ts src/features/mainBudgetFoundation/parseCsvRecords.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudgetFoundation/decodeCsv* src/features/mainBudgetFoundation/parseCsvRecords*
git commit -m "feat(main-budget-foundation): decode Korean budget CSV"
```

### Task 3: 동적 세입·세출 구간 파서

**Files:**
- Create: `src/features/mainBudgetFoundation/parseFoundationCsv.ts`
- Create: `src/features/mainBudgetFoundation/parseFoundationCsv.test.ts`

**Interfaces:**
- Consumes: `decodeBudgetCsv`, `parseCsvRecords`, Task 1 domain types.
- Produces: `parseFoundationCsv(fileName: string, bytes: ArrayBuffer): FoundationBudgetDocument`

- [ ] **Step 1: Write failing current-sample and shifted-row tests**

```ts
it("parses one combined file without treating repeated page headings as data", () => {
  const result = parseFoundationCsv("000.csv", fixtureBytes);
  expect(result).toMatchObject({ fiscalYear: 2026, budgetType: "본예산", sourceRevenueTotal: 1010749, sourceExpenseTotal: 1010749 });
  expect(result.revenueRows.some((row) => row.costItem === "학교운영비전입금")).toBe(true);
  expect(result.expenseRows.length).toBeGreaterThan(0);
  expect(result.expenseRows.some((row) => row.costItem.includes("세출예산명세서"))).toBe(false);
});

it("finds sections after arbitrary leading and repeated rows", () => {
  const shifted = new TextEncoder().encode(`안내문\r\n빈줄\r\n${combinedBudgetSampleText}`).buffer;
  expect(parseFoundationCsv("shifted.csv", shifted).sourceRevenueTotal).toBe(1010749);
});
```

- [ ] **Step 2: Run parser tests and verify RED**

Run: `npm test -- --run src/features/mainBudgetFoundation/parseFoundationCsv.test.ts`

Expected: FAIL because the section parser does not exist.

- [ ] **Step 3: Implement marker-driven parsing**

```ts
const isRevenueTitle = (row: string[]) => row.join(" ").includes("세입예산명세서");
const isExpenseTitle = (row: string[]) => row.join(" ").includes("세출예산명세서");
const isRepeatedHeader = (row: string[]) => {
  const text = row.join(" ").replace(/\s/g, "");
  return text.includes("예산구분") || text.includes("산출기초(원)")
    || text.includes("원가통계비목") && text.includes("비교증감");
};
```

Scan records once while maintaining `section`, hierarchy state, and source line. Switch to revenue or expense when a title appears; parse totals when the first cell is `세입합계` or `세출합계`; ignore repeated headers; emit normalized detail rows only when a cost item/detail row is present.

- [ ] **Step 4: Add malformed-file tests**

```ts
it.each([
  ["세입 누락", "2026학년도 세출예산명세서\r\n세출합계,10"],
  ["세출 누락", "2026학년도 세입예산명세서\r\n세입합계,10"],
])("rejects %s", (_label, text) => {
  expect(() => parseFoundationCsv("bad.csv", new TextEncoder().encode(text).buffer)).toThrow(/세입|세출/);
});
```

- [ ] **Step 5: Run parser tests and verify GREEN**

Run: `npm test -- --run src/features/mainBudgetFoundation/parseFoundationCsv.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudgetFoundation/parseFoundationCsv*
git commit -m "feat(main-budget-foundation): parse combined revenue expense CSV"
```

### Task 4: 분류와 합계 검증

**Files:**
- Create: `src/features/mainBudgetFoundation/classifyFoundationRows.ts`
- Create: `src/features/mainBudgetFoundation/classifyFoundationRows.test.ts`
- Create: `src/features/mainBudgetFoundation/validateFoundationBudget.ts`
- Create: `src/features/mainBudgetFoundation/validateFoundationBudget.test.ts`
- Create: `src/features/mainBudgetFoundation/referenceData.ts`

**Interfaces:**
- Produces: `classifyRevenue(row): "공" | "통" | "일" | "수" | "확인"`
- Produces: `selectBusinessExpenses(rows): FoundationExpenseRow[]`
- Produces: `validateFoundationBudget(document): FoundationValidation`

- [ ] **Step 1: Write failing classification tests from the reference workbook**

```ts
it("classifies reference-funded revenue and exact business-expense cost items", () => {
  expect(classifyRevenue(revenueRow({ costItem: "학교운영비전입금" }))).toBe("공");
  expect(selectBusinessExpenses([
    expenseRow({ costItem: "일반업무추진비" }),
    expenseRow({ costItem: "목적사업업무추진비" }),
  ])).toHaveLength(1);
});
```

- [ ] **Step 2: Run classification tests and verify RED**

Run: `npm test -- --run src/features/mainBudgetFoundation/classifyFoundationRows.test.ts`

Expected: FAIL because the classifiers do not exist.

- [ ] **Step 3: Implement visible rule tables**

Store the integrated-grant and individual-operating-business names copied from the reference workbook as exported readonly arrays. Match normalized labels exactly first; unmatched values receive `확인` instead of a guessed category.

- [ ] **Step 4: Write failing validation tests**

```ts
it("blocks export when extracted totals do not reconcile", () => {
  const result = validateFoundationBudget(document({ sourceRevenueTotal: 100, sourceExpenseTotal: 90 }));
  expect(result.canExport).toBe(false);
  expect(result.balanceDifference).toBe(10);
  expect(result.warnings).toContainEqual(expect.objectContaining({ code: "REVENUE_EXPENSE_MISMATCH", severity: "error" }));
});
```

- [ ] **Step 5: Implement validation and verify GREEN**

Compute detail totals from terminal/detail rows only. Add errors for missing sections, missing totals, detail/source mismatch and revenue/expense mismatch. Add warnings—not errors—for unclassified rows.

Run: `npm test -- --run src/features/mainBudgetFoundation/classifyFoundationRows.test.ts src/features/mainBudgetFoundation/validateFoundationBudget.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudgetFoundation/classifyFoundationRows* src/features/mainBudgetFoundation/validateFoundationBudget* src/features/mainBudgetFoundation/referenceData.ts
git commit -m "feat(main-budget-foundation): classify and validate budget rows"
```

### Task 5: Excel 결과 생성

**Files:**
- Create: `src/features/mainBudgetFoundation/buildFoundationWorkbook.ts`
- Create: `src/features/mainBudgetFoundation/buildFoundationWorkbook.test.ts`
- Create: `src/features/mainBudgetFoundation/downloadFoundationWorkbook.ts`

**Interfaces:**
- Consumes: parsed document, validation, classification output.
- Produces: `buildFoundationWorkbook(document): Promise<Uint8Array>`
- Produces: `downloadFoundationWorkbook(document): Promise<void>`

- [ ] **Step 1: Write a failing workbook structure test**

```ts
it("creates the approved sheets without a VBA project", async () => {
  const bytes = await buildFoundationWorkbook(validDocument);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
    "안내", "세입", "세출(원안)", "세출(조정안)", "업무추진비",
    "참고자료(통합교부비목록)", "참고자료(개별운영비목록)",
  ]);
  expect((workbook as ExcelJS.Workbook & { vbaProject?: unknown }).vbaProject).toBeUndefined();
});
```

- [ ] **Step 2: Run workbook tests and verify RED**

Run: `npm test -- --run src/features/mainBudgetFoundation/buildFoundationWorkbook.test.ts`

Expected: FAIL because the builder does not exist.

- [ ] **Step 3: Implement workbook sheets and reusable styling**

Use `맑은 고딕`, frozen header rows, filters, explicit number formats, print settings and the reference workbook's blue/gray table hierarchy. Put raw editable amounts in cells and formulas in derived columns.

```ts
const header = ["부서명", "세부사업명", "세부항목명", "원가통계비목명", "산출내역", "산출식", "요구금액", "사업담당자", "전년산출식", "전년요구금액", "증감", "비고"];
sheet.addRow(header);
sheet.getCell(rowNumber, 11).value = { formula: `G${rowNumber}-J${rowNumber}` };
sheet.getCell(totalRow, 7).value = { formula: `SUM(G${firstDataRow}:G${lastDataRow})` };
sheet.getCell(totalRow, 10).value = { formula: `SUM(J${firstDataRow}:J${lastDataRow})` };
```

The 3% limit cell must reference the revenue category total cells rather than embedding a copied number: `=SUM(B5:B7)*3%`.

- [ ] **Step 4: Add formula and key-value assertions**

```ts
expect(revenueSheet.getCell("D6").formula).toBe("SUM(B5:B7)*3%");
expect(originalSheet.getCell(`G${totalRow}`).formula).toBe(`SUM(G11:G${totalRow - 1})`);
expect(originalSheet.getCell(`K${firstDataRow}`).formula).toBe(`G${firstDataRow}-J${firstDataRow}`);
```

- [ ] **Step 5: Run workbook tests and verify GREEN**

Run: `npm test -- --run src/features/mainBudgetFoundation/buildFoundationWorkbook.test.ts`

Expected: PASS with no `#REF!`, `#DIV/0!`, `#VALUE!` or `#NAME?` formula text.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudgetFoundation/buildFoundationWorkbook* src/features/mainBudgetFoundation/downloadFoundationWorkbook.ts
git commit -m "feat(main-budget-foundation): export editable Excel workbook"
```

### Task 6: 버전형 임시저장

**Files:**
- Create: `src/features/mainBudgetFoundation/foundationStorage.ts`
- Create: `src/features/mainBudgetFoundation/foundationStorage.test.ts`

**Interfaces:**
- Produces: `foundationStorage.load/save/clear`
- Storage key: `school-budget:main-budget-foundation:v1`
- Stored envelope: `{ schemaVersion: 1, document, edits }`

- [ ] **Step 1: Write failing round-trip and invalidation tests**

```ts
it("restores validated normalized data without source file bytes", () => {
  expect(foundationStorage.save({ document: validDocument, edits: {} })).toBe(true);
  expect(foundationStorage.load()).toEqual({ document: validDocument, edits: {} });
  expect(localStorage.getItem(KEY)).not.toContain("sourceBytes");
});

it("removes malformed or old-version data", () => {
  localStorage.setItem(KEY, JSON.stringify({ schemaVersion: 0, document: validDocument, edits: {} }));
  expect(foundationStorage.load()).toBeNull();
  expect(localStorage.getItem(KEY)).toBeNull();
});
```

- [ ] **Step 2: Run storage tests and verify RED**

Run: `npm test -- --run src/features/mainBudgetFoundation/foundationStorage.test.ts`

Expected: FAIL because storage does not exist.

- [ ] **Step 3: Implement fail-safe validation and quota handling**

Validate every restored nested field before returning it. Catch `SecurityError` and `QuotaExceededError`; return `null`/`false` without breaking the page. Never serialize `File`, `ArrayBuffer` or workbook objects.

- [ ] **Step 4: Run storage tests and verify GREEN**

Run: `npm test -- --run src/features/mainBudgetFoundation/foundationStorage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/mainBudgetFoundation/foundationStorage*
git commit -m "feat(main-budget-foundation): persist browser draft"
```

### Task 7: 업로드·요약·표 화면

**Files:**
- Create: `src/features/mainBudgetFoundation/MainBudgetFoundationPage.tsx`
- Create: `src/features/mainBudgetFoundation/MainBudgetFoundationPage.test.tsx`
- Create: `src/features/mainBudgetFoundation/FoundationCsvUpload.tsx`
- Create: `src/features/mainBudgetFoundation/FoundationSummary.tsx`
- Create: `src/features/mainBudgetFoundation/FoundationDataGrid.tsx`
- Create: `src/features/mainBudgetFoundation/mainBudgetFoundation.css`

**Interfaces:**
- Consumes: parser, validator, storage and workbook download functions.
- Produces: `MainBudgetFoundationPage` with `onBack` and `onList` navigation callbacks matching existing pages.

- [ ] **Step 1: Write failing user-flow test**

```tsx
it("uploads one CSV, shows reconciled totals, and enables Excel export", async () => {
  render(<MainBudgetFoundationPage />);
  const input = screen.getByLabelText("세입·세출 CSV 파일 선택");
  expect(input).toHaveAttribute("accept", ".csv,text/csv");
  await user.upload(input, combinedCsvFile());
  expect(await screen.findByText("1,010,749천원")).toBeVisible();
  expect(screen.getByText("세입·세출 일치")).toBeVisible();
  expect(screen.getByRole("button", { name: "Excel 내려받기" })).toBeEnabled();
});
```

- [ ] **Step 2: Run page test and verify RED**

Run: `npm test -- --run src/features/mainBudgetFoundation/MainBudgetFoundationPage.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement page state and accessible components**

The page has `idle`, `reading`, `ready`, and `error` states. Show a single file chooser while idle, summary and tabs while ready, and preserve the ready state if Excel generation fails. Disable export when `validation.canExport === false`.

- [ ] **Step 4: Add filter, selection and mobile behavior tests**

```tsx
it("supports select all, clear all, and text filtering without duplicating hierarchy labels", async () => {
  await uploadValidCsv();
  await user.click(screen.getByRole("button", { name: "전체 선택 해제" }));
  expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(0);
  await user.type(screen.getByLabelText("항목 검색"), "업무추진비");
  expect(screen.getByRole("table")).toHaveTextContent("일반업무추진비");
});
```

- [ ] **Step 5: Run page tests and verify GREEN**

Run: `npm test -- --run src/features/mainBudgetFoundation/MainBudgetFoundationPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/mainBudgetFoundation
git commit -m "feat(main-budget-foundation): add CSV conversion workspace"
```

### Task 8: 사이트 연결과 이용안내

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/guide/UsageGuidePage.tsx`
- Modify: `src/features/guide/UsageGuidePage.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Adds route/page key: `main-budget-foundation`
- Adds visible label: `본예산 편성 기초자료 만들기`

- [ ] **Step 1: Write failing navigation tests**

```tsx
it("opens the foundation-data workspace from the home card", async () => {
  render(<App />);
  await user.click(screen.getByRole("button", { name: "본예산 편성 기초자료 만들기 시작하기" }));
  expect(screen.getByRole("heading", { name: "본예산 편성 기초자료 만들기" })).toBeVisible();
  expect(screen.getByRole("button", { name: "이용안내 목록으로" })).toBeVisible();
});
```

- [ ] **Step 2: Run navigation tests and verify RED**

Run: `npm test -- --run src/App.test.tsx src/features/home/HomePage.test.tsx src/features/guide/UsageGuidePage.test.tsx`

Expected: FAIL because the route and cards are absent.

- [ ] **Step 3: Add route, home card and guide card**

Use an existing 서울교육 character asset and the existing card color tokens. The guide copy must say: `K-에듀파인에서 내려받은 세입·세출 통합 CSV를 불러와 본예산 편성 기초자료 Excel을 만듭니다.`

- [ ] **Step 4: Add responsive CSS**

At widths below `760px`, stack summary cards, keep action buttons at least 44px tall, and wrap the data grid in `overflow-x: auto` without shrinking columns below readable widths.

- [ ] **Step 5: Run navigation tests and verify GREEN**

Run: `npm test -- --run src/App.test.tsx src/features/home/HomePage.test.tsx src/features/guide/UsageGuidePage.test.tsx src/features/mainBudgetFoundation/MainBudgetFoundationPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx src/App.test.tsx src/features/home src/features/guide src/styles.css
git commit -m "feat: link main budget foundation workflow"
```

### Task 9: 실제 샘플 회귀검증과 배포 준비

**Files:**
- Create: `scripts/verify-main-budget-foundation.mjs`
- Create: `src/features/mainBudgetFoundation/actualSample.test.ts`
- Modify: `docs/superpowers/specs/2026-09-03-main-budget-foundation-design.md`

**Interfaces:**
- Consumes local sample path through CLI arguments only; never commits the school CSV.
- Produces compact PASS/FAIL output with encoding, year, row counts, source totals and generated workbook sheet names.

- [ ] **Step 1: Write the failing actual-sample regression test**

The test reads `MAIN_BUDGET_FOUNDATION_SAMPLE` only when set, otherwise skips. When set to the supplied sample it asserts fiscal year `2026`, both source totals `1_010_749`, nonempty revenue/expense rows and successful workbook reload.

- [ ] **Step 2: Run with the supplied sample and verify RED before final adapter wiring**

Run:

```powershell
$env:MAIN_BUDGET_FOUNDATION_SAMPLE='C:\Users\User\Desktop\예산서\000 (2).csv'
npm test -- --run src/features/mainBudgetFoundation/actualSample.test.ts
```

Expected: FAIL until the script/test adapter invokes the completed parser and exporter.

- [ ] **Step 3: Implement the verification script**

Output one line such as:

```text
PASS | 000 (2).csv | euc-kr | 2026 | 세입 1,010,749천원 | 세출 1,010,749천원 | 7 sheets
```

- [ ] **Step 4: Run focused, full and build verification**

```powershell
$env:MAIN_BUDGET_FOUNDATION_SAMPLE='C:\Users\User\Desktop\예산서\000 (2).csv'
npm test -- --run src/features/mainBudgetFoundation
npm test -- --run
npm run build
node scripts/verify-main-budget-foundation.mjs -- 'C:\Users\User\Desktop\예산서\000 (2).csv'
```

Expected: all commands exit `0`; any unrelated pre-existing timeout must be rerun in isolation and reported explicitly.

- [ ] **Step 5: Browser verification**

Open the built site at desktop and mobile widths. Verify home navigation, CSV selection, totals, warning state, filters, draft restore, new-file reset and `.xlsx` download. Reopen the downloaded workbook and confirm the seven sheet names and key formulas.

- [ ] **Step 6: Update the design doc with verified first-version limits and commit**

Record that the first release is verified against the supplied combined CSV and that other schools remain a follow-up compatibility expansion.

```powershell
git add scripts/verify-main-budget-foundation.mjs src/features/mainBudgetFoundation/actualSample.test.ts docs/superpowers/specs/2026-09-03-main-budget-foundation-design.md
git commit -m "test(main-budget-foundation): verify supplied combined CSV"
```

- [ ] **Step 7: Push and deploy after user-approved implementation is verified**

Push the current branch to GitHub, save a new Sites version from the exact commit SHA, deploy it to the existing Sites project, wait for `succeeded`, and verify the public URL with a cache-busting query parameter.
