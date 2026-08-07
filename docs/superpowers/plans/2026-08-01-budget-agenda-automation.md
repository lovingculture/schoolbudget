# Budget Agenda Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** K-에듀파인 세입세출예산총괄 Excel을 분석해 수정 가능한 예산 안건설명서와 PDF·Word·일반 Excel을 생성하는 웹 기능을 구축한다.

**Architecture:** 기존 결산 설명서의 업로드-편집-미리보기-다운로드 흐름을 따르되 `src/features/budgetAgenda/`에 독립 모듈로 구현한다. 브라우저에서 SheetJS로 원본을 분석하고 React 상태를 단일 편집 원본으로 유지하며, html2canvas/jsPDF, docx, ExcelJS로 세 가지 파일을 생성한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, Testing Library, SheetJS, ExcelJS, docx, html2canvas, jsPDF

## Global Constraints

- 업로드 파일은 브라우저 안에서만 처리하고 외부 데이터베이스에 저장하지 않는다.
- 지원 입력은 `.xlsx`와 `.xls`이며 K-에듀파인 `세입 세출 예산 총괄` 양식만 허용한다.
- 금액 단위는 천원이며 화면·출력 모두 세 자리마다 쉼표를 표시한다.
- PDF는 제공된 예시를 기준으로 A4 세로 2쪽을 기본으로 하되 행이 많으면 다음 페이지로 넘긴다.
- Excel 출력은 매크로가 없는 `.xlsx`이며 `입력`과 `안건설명서` 시트를 포함한다.
- 미리보기 배포 후 사용자 승인 전에는 운영 배포하지 않는다.
- 현재 `deploy-clean`에는 `.git`이 없으므로 각 작업의 커밋 단계는 Git 저장소가 복원된 경우에만 실행한다.

---

## File Map

- Create `src/features/budgetAgenda/types.ts`: 예산 원본·편집 초안·검증 타입
- Create `src/features/budgetAgenda/parser.ts`: K-에듀파인 Excel 분석
- Create `src/features/budgetAgenda/parser.test.ts`: 정상·오류 파일 분석 테스트
- Create `src/features/budgetAgenda/createDraft.ts`: 제목과 기본 문구 생성
- Create `src/features/budgetAgenda/createDraft.test.ts`: 본예산·추경 문구 테스트
- Create `src/features/budgetAgenda/validation.ts`: 증감·합계·구성비 검증
- Create `src/features/budgetAgenda/validation.test.ts`: 검증 계산 테스트
- Create `src/features/budgetAgenda/moneyInput.ts`: 쉼표 금액 입력 변환
- Create `src/features/budgetAgenda/BudgetAgendaPage.tsx`: 전체 기능 상태와 업로드
- Create `src/features/budgetAgenda/BudgetAgendaEditor.tsx`: 수정 입력 화면
- Create `src/features/budgetAgenda/BudgetAgendaPreview.tsx`: A4 안건설명서
- Create `src/features/budgetAgenda/BudgetAgendaPage.test.tsx`: 사용자 흐름 테스트
- Create `src/features/budgetAgenda/exportPdf.ts`: PDF 생성
- Create `src/features/budgetAgenda/exportWord.ts`: Word 생성
- Create `src/features/budgetAgenda/exportExcel.ts`: 일반 Excel 생성
- Create `src/features/budgetAgenda/exporters.test.ts`: 파일 출력 테스트
- Create `src/features/budgetAgenda/BudgetAgendaDownloads.tsx`: 다운로드 버튼과 오류 상태
- Create `src/features/budgetAgenda/budgetAgenda.css`: 편집·미리보기·인쇄 스타일
- Modify `src/App.tsx`: 준비 중 화면을 실제 기능으로 교체
- Modify `src/styles.css`: 새 기능 반응형 배치 연결

---

### Task 1: Domain Types and K-에듀파인 Parser

**Files:**
- Create: `src/features/budgetAgenda/types.ts`
- Create: `src/features/budgetAgenda/parser.ts`
- Create: `src/features/budgetAgenda/parser.test.ts`

**Interfaces:**
- Produces: `parseBudgetAgendaWorkbook(data: ArrayBuffer): BudgetAgendaSource`
- Produces: `BudgetAgendaParseError extends Error`
- Produces: `BudgetAgendaSource`, `BudgetIncomeRow`, `BudgetExpenseRow`

- [ ] **Step 1: Write parser tests for the supplied report shape**

```ts
it("세입세출예산총괄에서 총액과 세입·세출을 추출한다", () => {
  const source = parseBudgetAgendaWorkbook(makeBudgetWorkbook());
  expect(source).toMatchObject({
    fiscalYear: 2026,
    schoolName: "서울옥정초등학교",
    budgetType: "추경1회",
    revisedBudget: 1771057,
    previousBudget: 1010749,
    changeAmount: 760308,
    changeRate: 75.2,
  });
  expect(source.incomeRows).toHaveLength(6);
  expect(source.expenseRows).toHaveLength(7);
});

it("다른 보고서를 명확히 거절한다", () => {
  expect(() => parseBudgetAgendaWorkbook(makeWrongWorkbook()))
    .toThrow("에듀파인 예산현황의 세입세출예산총괄 파일인지 확인해 주세요.");
});
```

- [ ] **Step 2: Run the parser test and verify failure**

Run: `npm run test:run -- src/features/budgetAgenda/parser.test.ts`

Expected: FAIL because `parseBudgetAgendaWorkbook` does not exist.

- [ ] **Step 3: Define explicit source types**

```ts
export type BudgetIncomeRow = {
  id: string; chapter: string; section: string;
  current: number; cumulative: number; ratio: number; note: string;
};
export type BudgetExpenseRow = {
  id: string; policy: string;
  current: number; cumulative: number; ratio: number; note: string;
};
export type BudgetAgendaSource = {
  fiscalYear: number; schoolName: string; budgetType: string;
  revisedBudget: number; previousBudget: number;
  changeAmount: number; changeRate: number;
  incomeRows: BudgetIncomeRow[]; expenseRows: BudgetExpenseRow[];
};
```

- [ ] **Step 4: Implement label-driven parsing**

Use `XLSX.read(data, { type: "array" })`, locate a sheet containing `세입 세출 예산 총괄`, parse the multiline metadata cell, then locate `예산구분`, `경정예산액`, `기정예산액`, `비교증감`, `세입`, and `세출` headers. Convert comma-formatted strings with:

```ts
const asNumber = (value: unknown) =>
  typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, "").trim()) || 0;
```

Collect income and expense rows until `계` or the used range ends. Preserve zero-valued valid rows such as `학교시설 확충`.

- [ ] **Step 5: Run parser tests**

Run: `npm run test:run -- src/features/budgetAgenda/parser.test.ts`

Expected: PASS.

- [ ] **Step 6: Verify against the attached real workbook**

Run a temporary Vitest case reading `/workspace/scratch/db8d8a6d1cb2/upload/000(1).xlsx`; verify the exact totals and row counts above, then remove only the environment-specific absolute-path test.

- [ ] **Step 7: Commit if Git metadata is available**

```bash
git add src/features/budgetAgenda/types.ts src/features/budgetAgenda/parser.ts src/features/budgetAgenda/parser.test.ts
git commit -m "feat: parse edufine budget summary"
```

---

### Task 2: Draft Creation, Money Input, and Validation

**Files:**
- Create: `src/features/budgetAgenda/createDraft.ts`
- Create: `src/features/budgetAgenda/createDraft.test.ts`
- Create: `src/features/budgetAgenda/moneyInput.ts`
- Create: `src/features/budgetAgenda/validation.ts`
- Create: `src/features/budgetAgenda/validation.test.ts`
- Modify: `src/features/budgetAgenda/types.ts`

**Interfaces:**
- Consumes: `BudgetAgendaSource`
- Produces: `createBudgetAgendaDraft(source): BudgetAgendaDraft`
- Produces: `validateBudgetAgenda(draft): BudgetAgendaValidation[]`
- Produces: `formatEditableMoney(value)`, `parseEditableMoney(value)`

- [ ] **Step 1: Write failing tests for 추경 and 본예산 defaults**

```ts
expect(createBudgetAgendaDraft(revisedSource)).toMatchObject({
  title: "2026학년도 서울옥정초등학교 회계 1차 추경예산(안)",
  proposer: "학교장",
  presenter: "행정실장",
  reason: "2026학년도 학교회계 1차 추경예산을 심의 받고자 함",
  contentTitle: "추경예산 편성 주요내용",
});
expect(createBudgetAgendaDraft(mainSource).contentTitle).toBe("예산 편성 주요내용");
```

- [ ] **Step 2: Write failing validation and money tests**

```ts
expect(formatEditableMoney(1771057)).toBe("1,771,057");
expect(parseEditableMoney("1,771,057원")).toBe(1771057);
expect(validateBudgetAgenda(revisedDraft).every(item => item.ok)).toBe(true);
```

- [ ] **Step 3: Run tests and confirm failure**

Run: `npm run test:run -- src/features/budgetAgenda/createDraft.test.ts src/features/budgetAgenda/validation.test.ts`

Expected: FAIL because modules do not exist.

- [ ] **Step 4: Add editable draft and validation types**

Extend the source with:

```ts
export type BudgetAgendaDraft = BudgetAgendaSource & {
  title: string; agendaNumber: string; proposalDate: string;
  proposer: string; presenter: string; reason: string; basis: string;
  contentTitle: string; majorContents: string[];
};
export type BudgetAgendaValidation = {
  id: string; label: string; expected: number; actual: number; ok: boolean;
};
```

- [ ] **Step 5: Implement exact automatic wording**

Normalize `추경1회` to `1차 추경`. Set two editable major-content rows to empty strings and use the two approved legal-basis lines joined by `\n`.

- [ ] **Step 6: Implement calculations**

Check:

```ts
revisedBudget - previousBudget === changeAmount
sum(incomeRows.current) === changeAmount
sum(expenseRows.current) === changeAmount
sum(incomeRows.cumulative) === revisedBudget
sum(expenseRows.cumulative) === revisedBudget
Math.abs(sum(ratios) - 100) <= 0.2
```

- [ ] **Step 7: Run task tests**

Run: `npm run test:run -- src/features/budgetAgenda/createDraft.test.ts src/features/budgetAgenda/validation.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit if Git metadata is available**

```bash
git add src/features/budgetAgenda
git commit -m "feat: create and validate budget agenda drafts"
```

---

### Task 3: Upload Page and Editable Form

**Files:**
- Create: `src/features/budgetAgenda/BudgetAgendaPage.tsx`
- Create: `src/features/budgetAgenda/BudgetAgendaEditor.tsx`
- Create: `src/features/budgetAgenda/BudgetAgendaPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: parser, draft creation, validation, money helpers
- Produces: `BudgetAgendaPage`

- [ ] **Step 1: Write the upload-screen test**

```tsx
render(<BudgetAgendaPage />);
expect(screen.getByText(/에듀파인 예산현황의 세입세출총괄표/)).toBeInTheDocument();
expect(screen.getByText(/자동으로 만들어지는 입력 화면/)).toBeInTheDocument();
expect(screen.getByRole("button", { name: "세입세출총괄표 불러오기" })).toBeInTheDocument();
```

- [ ] **Step 2: Write the editable-form test**

Mock `File.prototype.arrayBuffer` with a valid workbook. Upload it, change `안건번호`, `제안이유`, and a comma-formatted amount, then assert the form and preview receive updated values.

- [ ] **Step 3: Run UI tests and verify failure**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 4: Implement upload state**

`BudgetAgendaPage` owns:

```ts
const [source, setSource] = useState<BudgetAgendaSource | null>(null);
const [original, setOriginal] = useState<BudgetAgendaDraft | null>(null);
const [draft, setDraft] = useState<BudgetAgendaDraft | null>(null);
const [error, setError] = useState("");
```

Support hidden file input, the approved button label, and drag-and-drop. On success create the draft and validation list; on parser failure display the parser message.

- [ ] **Step 5: Implement all editable sections**

Add controlled inputs for proposal fields, reason, basis, major contents, totals, income rows, and expense rows. Numeric fields use text inputs with `inputMode="numeric"`, comma formatting, a changed badge, and an original-value restore button.

- [ ] **Step 6: Connect the actual menu**

Import `BudgetAgendaPage` in `App.tsx`, render it for `view === "agenda"`, remove `agenda` from the `ComingSoon` condition, and keep `budget` marked 준비 중.

- [ ] **Step 7: Run UI and existing app tests**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit if Git metadata is available**

```bash
git add src/App.tsx src/features/budgetAgenda
git commit -m "feat: add editable budget agenda workflow"
```

---

### Task 4: A4 Preview and Responsive Styling

**Files:**
- Create: `src/features/budgetAgenda/BudgetAgendaPreview.tsx`
- Create: `src/features/budgetAgenda/budgetAgenda.css`
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.test.tsx`
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `BudgetAgendaDraft`
- Produces: elements with class `.budget-agenda-a4-page` for PDF export

- [ ] **Step 1: Write preview assertions**

```tsx
expect(screen.getByText("2026학년도 서울옥정초등학교 회계 1차 추경예산(안)")).toBeInTheDocument();
expect(screen.getByText("1,771,057")).toBeInTheDocument();
expect(screen.getAllByTestId("budget-agenda-a4-page")).toHaveLength(2);
```

- [ ] **Step 2: Run and verify failure**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx`

Expected: FAIL because the preview is absent.

- [ ] **Step 3: Build the two-page document**

Match the reference order exactly: title, agenda metadata, `1. 제안이유`, `2. 근거`, `3. 주요내용`, 총 규모, 세입예산, 세출예산, 주요 편성내용. Render all amounts with `toLocaleString("ko-KR")` and ratios with one decimal.

- [ ] **Step 4: Split expense rows without data loss**

Use the first four expense rows on page 1 and remaining rows plus total on page 2 for the supplied seven-row report. If a report has more rows, create additional `.budget-agenda-a4-page` articles in chunks of rows rather than hiding overflow.

- [ ] **Step 5: Add print-quality and responsive CSS**

Use an A4 ratio, white page, black table borders, light blue-gray headers, Human Myeongjo-compatible serif fallback, and 12-15 mm equivalent padding. On narrow screens stack the editor above the preview and allow horizontal scrolling only inside editable tables.

- [ ] **Step 6: Run tests and production build**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx && npm run build`

Expected: PASS; Vite build succeeds with only the existing chunk-size warning.

- [ ] **Step 7: Browser visual check**

Start `npm run dev -- --host 0.0.0.0`, open the budget agenda page, upload `000(1).xlsx`, and verify both A4 pages against the rendered reference PDF: no clipped title, table rows, units, or page overflow.

- [ ] **Step 8: Commit if Git metadata is available**

```bash
git add src/features/budgetAgenda src/styles.css
git commit -m "feat: preview budget agenda as A4 document"
```

---

### Task 5: PDF, Word, and Excel Exports

**Files:**
- Create: `src/features/budgetAgenda/exportPdf.ts`
- Create: `src/features/budgetAgenda/exportWord.ts`
- Create: `src/features/budgetAgenda/exportExcel.ts`
- Create: `src/features/budgetAgenda/exporters.test.ts`
- Create: `src/features/budgetAgenda/BudgetAgendaDownloads.tsx`
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.tsx`

**Interfaces:**
- Produces: `exportBudgetAgendaPdf(pages: HTMLElement[]): Promise<Blob>`
- Produces: `exportBudgetAgendaWord(draft: BudgetAgendaDraft): Promise<Blob>`
- Produces: `exportBudgetAgendaExcel(draft: BudgetAgendaDraft): Promise<Blob>`

- [ ] **Step 1: Write exporter tests**

```ts
expect((await exportBudgetAgendaWord(draft)).size).toBeGreaterThan(1000);
expect((await exportBudgetAgendaExcel(draft)).type)
  .toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
```

Load the Excel blob with ExcelJS and assert worksheet names `입력`, `안건설명서`, title text, and `1,771,057` as a numeric cell with `#,##0` format.

- [ ] **Step 2: Run exporter tests and verify failure**

Run: `npm run test:run -- src/features/budgetAgenda/exporters.test.ts`

Expected: FAIL because exporters do not exist.

- [ ] **Step 3: Implement PDF export**

Capture every `.budget-agenda-a4-page` with html2canvas at scale 2, add each canvas to an A4 portrait jsPDF page, and return `pdf.output("blob")`.

- [ ] **Step 4: Implement editable Word export**

Use `docx` to produce A4 portrait sections with Korean title, metadata table, numbered headings, and bordered budget tables. Use `TableCell` vertical alignment and right-aligned numeric paragraphs.

- [ ] **Step 5: Implement macro-free Excel export**

Create `입력` with editable proposal fields and source tables; create `안건설명서` with merged title cells, metadata, section headings, and formatted tables. Set numeric values as numbers, `numFmt = "#,##0"`, page size A4 portrait, fit-to-page width 1, margins, row heights, column widths, and print area.

- [ ] **Step 6: Implement download controls**

Add PDF, Word, Excel buttons, per-format loading state, and a clear error message. Use filename `{fiscalYear}학년도_{schoolName}_{budgetType}_예산안건설명서` after removing filesystem-invalid characters.

- [ ] **Step 7: Run exporter and UI tests**

Run: `npm run test:run -- src/features/budgetAgenda/exporters.test.ts src/features/budgetAgenda/BudgetAgendaPage.test.tsx`

Expected: PASS.

- [ ] **Step 8: Manually inspect all three outputs**

Generate files from the supplied workbook. Render the PDF to PNG and verify every page. Open the Word and Excel outputs programmatically to confirm title, totals, row counts, sheet names, A4 settings, and absence of VBA content.

- [ ] **Step 9: Commit if Git metadata is available**

```bash
git add src/features/budgetAgenda
git commit -m "feat: export budget agenda documents"
```

---

### Task 6: Full Regression, Preview Verification, and Deployment

**Files:**
- Modify only files required to fix failures found by verification.

**Interfaces:**
- Consumes: completed budget agenda feature
- Produces: verified Preview deployment URL

- [ ] **Step 1: Run the complete test suite**

Run: `npm run test:run`

Expected: all tests pass. If the existing closing parser fixture is unavailable, document that exact missing-fixture failure separately and run every other test to completion; do not treat it as a feature regression.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build succeed.

- [ ] **Step 3: End-to-end browser verification**

Verify: menu opens the new function; instructions are visible; supplied workbook uploads; exact totals appear; edited agenda number/reason/major content update the preview; reset-to-original works; invalid file error appears; PDF·Word·Excel downloads complete.

- [ ] **Step 4: Review responsive layout**

Check desktop and mobile widths. Confirm sidebar, upload controls, editor, validation messages, A4 preview, tables, and download buttons remain usable without clipped text.

- [ ] **Step 5: Deploy Preview only**

Deploy the complete source to Vercel project `school-budget-portal` with `target: "preview"` and `production: false`. Poll until `READY`, fetch the Preview URL, and require HTTP 200.

- [ ] **Step 6: Report verification evidence**

Provide the Preview URL, deployment inspector URL, test counts, build result, and any known non-blocking limitation. Do not promote or redeploy to production without a new explicit user approval.

- [ ] **Step 7: Commit verification fixes if Git metadata is available**

```bash
git add src
git commit -m "test: verify budget agenda automation"
```
