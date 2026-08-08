# Prebudget Example Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개인정보가 제거된 12개 성립전예산 예시를 검색·필터·미리보기하고, 선택한 예시를 기존 성립전예산 작성 화면에 안전하게 복사해 편집·점검·문서 생성까지 이어갈 수 있게 한다.

**Architecture:** 예시는 서버나 사용자 파일이 아닌 정적 TypeScript 데이터로 번들에 포함하고, 순수 함수로 데이터 검증·필터링·초안 변환을 담당하게 한다. UI는 기존 `PrebudgetPage`의 직접 작성 흐름을 유지하면서 독립된 예시 라이브러리 컴포넌트를 추가하고, 기존 localStorage 자료는 정규화 계층을 통해 새 필드가 없어도 복원한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, Testing Library, 기존 CSS 및 localStorage

## Global Constraints

- 사용자가 과거 자료를 업로드하거나 브라우저에 원본 파일을 저장하는 기능은 만들지 않는다.
- 예시는 사용자가 제공한 2024·2025 예산자료와 성립전예산 신청서 및 서울교육재정 공개자료의 구조·계산방식만 일반화해 사용한다.
- 실제 학교명, 개인 이름, 전화번호, 이메일, 계정, 출력일시를 예시 데이터에 포함하지 않는다.
- 학교명은 `서울○○초등학교`, `서울○○중학교`, `서울○○고등학교`처럼 익명화하고 기관명·공문번호도 일반화한다.
- 초기 예시는 정확히 12종이며 초등학교·중학교·고등학교·공통, 주요 재원구분, 사업유형, 원가통계비목을 포함한다.
- `○○`, `0000`, `20XX` 등 예시 표시는 복사 후 반드시 `확인 필요`로 안내한다.
- `이 예시로 작성하기`는 현재 학교명과 회계연도를 보존하고 나머지 예시 필드를 새 초안으로 깊은 복사한다.
- 기존 작성 내용이 있으면 덮어쓰기 전 확인창을 표시하고 취소 시 현재 초안을 변경하지 않는다.
- 기존 직접 작성, 임시저장·복원, 자동점검, 기안문 생성, 다운로드 기능을 삭제하거나 망가뜨리지 않는다.
- 모든 처리는 브라우저 내부에서 수행하고 실행 중 외부 사이트나 API를 호출하지 않는다.
- PC 행정실 환경을 우선하되 좁은 화면에서 필터와 카드가 한 열로 배치되게 한다.
- Preview에만 배포하며 사용자 최종 승인 전 Production 배포, Promote, 운영 도메인 변경을 하지 않는다.

---

## File Map

- `src/features/prebudget/types.ts`: 기존 초안 모델과 학교급 타입 정의.
- `src/features/prebudget/draft.ts`: 빈 초안 생성 및 구버전 초안 정규화.
- `src/features/prebudget/storage.ts`: 정규화된 localStorage 저장·복원.
- `src/features/prebudget/examples/types.ts`: 예시·필터·검증 결과 모델.
- `src/features/prebudget/examples/data.ts`: 익명화된 12개 정적 예시.
- `src/features/prebudget/examples/validateExamples.ts`: 개수·계산·개인정보·범위 검증.
- `src/features/prebudget/examples/filterExamples.ts`: 검색 및 다중 필터 순수 함수.
- `src/features/prebudget/examples/applyExample.ts`: 예시를 편집 가능한 초안으로 변환.
- `src/features/prebudget/examples/PrebudgetExampleLibrary.tsx`: 목록·필터·상세·미리보기 UI.
- `src/features/prebudget/PrebudgetPage.tsx`: 진입 방식과 예시 적용을 기존 화면에 통합.
- `src/features/prebudget/validation.ts`: 예시 자리표시자와 확인 필요 필드 경고.
- `src/styles.css`: 예시 라이브러리와 반응형 스타일.

### Task 1: Extend and Normalize the Draft Model

**Files:**
- Modify: `src/features/prebudget/types.ts`
- Modify: `src/features/prebudget/draft.ts`
- Modify: `src/features/prebudget/draft.test.ts`
- Modify: `src/features/prebudget/storage.ts`
- Modify: `src/features/prebudget/storage.test.ts`

**Interfaces:**
- Produces: `type PrebudgetSchoolLevel = "초등학교" | "중학교" | "고등학교" | "공통"`
- Produces: `normalizePrebudgetDraft(value: unknown, initialSchoolName?: string): PrebudgetFormDraft`
- Extends `PrebudgetFormDraft` with `schoolLevel`, `grantingAgency`, `projectPeriod`, `reason`, `basis`, `exampleSourceId?`, `reviewRequiredFields`.
- Preserves the existing storage key `school-budget-portal:prebudget-draft:v1`.

- [ ] **Step 1: Write failing normalization tests**

```ts
it("fills new fields when loading a legacy draft", () => {
  const legacy = { schoolName: "기존학교", fiscalYear: "2026", source: "목적사업비", title: "기존", department: "", requester: "", officialDocument: "", items: [], savedAt: 1 };
  expect(normalizePrebudgetDraft(legacy)).toMatchObject({
    schoolName: "기존학교", fiscalYear: "2026", schoolLevel: "공통",
    grantingAgency: "", projectPeriod: "", reason: "", basis: "",
    reviewRequiredFields: [],
  });
});

it("does not share mutable review fields between blank drafts", () => {
  const first = createPrebudgetDraft("A");
  const second = createPrebudgetDraft("B");
  first.reviewRequiredFields.push("grantingAgency");
  expect(second.reviewRequiredFields).toEqual([]);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run src/features/prebudget/draft.test.ts src/features/prebudget/storage.test.ts`

Expected: FAIL because the new fields and `normalizePrebudgetDraft` do not exist.

- [ ] **Step 3: Add exact types and normalization**

```ts
export type PrebudgetSchoolLevel = "초등학교" | "중학교" | "고등학교" | "공통";

export interface PrebudgetFormDraft {
  // keep every existing property unchanged
  schoolLevel: PrebudgetSchoolLevel;
  grantingAgency: string;
  projectPeriod: string;
  reason: string;
  basis: string;
  exampleSourceId?: string;
  reviewRequiredFields: string[];
}
```

Implement `normalizePrebudgetDraft` by starting from `createPrebudgetDraft(initialSchoolName)`, accepting only a non-null object, copying legacy scalar fields with type guards, mapping valid item objects onto fresh item defaults, and accepting `reviewRequiredFields` only when it is a string array. Update `loadDraft` to parse JSON and return `normalizePrebudgetDraft(parsed)`; retain its current invalid-JSON fallback behavior.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/features/prebudget/draft.test.ts src/features/prebudget/storage.test.ts`

Expected: PASS, including existing save/restore tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/types.ts src/features/prebudget/draft.ts src/features/prebudget/draft.test.ts src/features/prebudget/storage.ts src/features/prebudget/storage.test.ts
git commit -m "feat: extend prebudget draft model"
```

### Task 2: Define and Validate the 12 Anonymized Examples

**Files:**
- Create: `src/features/prebudget/examples/types.ts`
- Create: `src/features/prebudget/examples/data.ts`
- Create: `src/features/prebudget/examples/validateExamples.ts`
- Create: `src/features/prebudget/examples/data.test.ts`

**Interfaces:**
- Consumes: `PrebudgetSchoolLevel`, `DraftItem` from `../types`.
- Produces: `PrebudgetExample`, `PrebudgetExampleItem`, `ExampleValidationIssue`.
- Produces: `PREBUDGET_EXAMPLES: readonly PrebudgetExample[]`.
- Produces: `validatePrebudgetExamples(examples: readonly PrebudgetExample[]): ExampleValidationIssue[]`.

- [ ] **Step 1: Write failing catalogue tests**

```ts
it("contains exactly 12 unique, usable examples", () => {
  expect(PREBUDGET_EXAMPLES).toHaveLength(12);
  expect(new Set(PREBUDGET_EXAMPLES.map((item) => item.id)).size).toBe(12);
  expect(PREBUDGET_EXAMPLES.every((item) => item.items.length >= 1)).toBe(true);
  expect(validatePrebudgetExamples(PREBUDGET_EXAMPLES)).toEqual([]);
});

it("covers school levels and core funding sources", () => {
  expect(new Set(PREBUDGET_EXAMPLES.map((item) => item.schoolLevel))).toEqual(
    new Set(["초등학교", "중학교", "고등학교", "공통"]),
  );
  expect(PREBUDGET_EXAMPLES.map((item) => item.fundingSource)).toEqual(
    expect.arrayContaining(["목적사업비", "자치단체보조금", "수익자부담금", "국고보조금"]),
  );
});
```

- [ ] **Step 2: Run the catalogue test and verify failure**

Run: `npm test -- --run src/features/prebudget/examples/data.test.ts`

Expected: FAIL because the example modules do not exist.

- [ ] **Step 3: Define the data contracts**

```ts
export interface PrebudgetExampleItem extends Omit<DraftItem, "id"> {}

export interface PrebudgetExample {
  id: string;
  title: string;
  schoolLevel: PrebudgetSchoolLevel;
  fundingSource: string;
  businessTypeTags: string[];
  description: string;
  schoolNameExample: string;
  fiscalYearExample: string;
  documentTitle: string;
  grantingAgency: string;
  officialDocument: string;
  projectPeriod: string;
  reason: string;
  basis: string;
  items: PrebudgetExampleItem[];
  draftPreview: string;
  autoCheckNotes: string[];
  reviewRequiredFields: string[];
  sourceCategory: "사용자 제공 익명화 표본" | "서울교육재정 공개예산 분석" | "복합 분석";
  sourceReviewedAt: "2026-08-08";
}

export interface ExampleValidationIssue {
  exampleId: string;
  field: string;
  message: string;
}
```

- [ ] **Step 4: Add all 12 complete examples**

Create exactly these IDs and subjects: `elem-books`, `elem-curriculum`, `elem-safety`, `elem-facility`, `middle-vacation`, `middle-career`, `middle-welfare`, `middle-instructor`, `high-club`, `high-national-subsidy`, `common-business-expense`, `common-multi-account`. Each item must include unit business, business, detail, category, description, note, unit price, quantity, count, and manual amount. Use realistic but anonymized calculations; for example `unitPrice: 20_000`, `quantity: 200`, `count: 1`, `manualAmount: 4_000_000`.

- [ ] **Step 5: Implement deterministic safety validation**

`validatePrebudgetExamples` must report issues for: duplicate IDs; catalogue size other than 12; empty required strings; missing items; `unitPrice * quantity * count !== manualAmount`; email regex matches; Korean mobile/landline patterns; resident-number patterns; actual school suffix names that do not contain `○○`; and placeholder-bearing fields omitted from `reviewRequiredFields`. It must not reject the allowed generic organization strings containing `○○`.

- [ ] **Step 6: Run the catalogue test**

Run: `npm test -- --run src/features/prebudget/examples/data.test.ts`

Expected: PASS with zero validation issues.

- [ ] **Step 7: Commit**

```bash
git add src/features/prebudget/examples/types.ts src/features/prebudget/examples/data.ts src/features/prebudget/examples/validateExamples.ts src/features/prebudget/examples/data.test.ts
git commit -m "feat: add anonymized prebudget examples"
```

### Task 3: Implement Search and Multi-Filter Logic

**Files:**
- Create: `src/features/prebudget/examples/filterExamples.ts`
- Create: `src/features/prebudget/examples/filterExamples.test.ts`

**Interfaces:**
- Consumes: `PrebudgetExample` from `./types`.
- Produces: `PrebudgetExampleFilters` with `query`, `schoolLevel`, `fundingSource`, `businessType`, `accountCategory` string fields.
- Produces: `EMPTY_EXAMPLE_FILTERS`.
- Produces: `filterPrebudgetExamples(examples: readonly PrebudgetExample[], filters: PrebudgetExampleFilters): PrebudgetExample[]`.

- [ ] **Step 1: Write failing filter tests**

```ts
it("combines school level, funding source and keyword filters", () => {
  const result = filterPrebudgetExamples(PREBUDGET_EXAMPLES, {
    ...EMPTY_EXAMPLE_FILTERS,
    schoolLevel: "초등학교",
    fundingSource: "목적사업비",
    query: "교재",
  });
  expect(result.map((item) => item.id)).toEqual(["elem-books"]);
});

it("searches title, description, business names and calculation text", () => {
  expect(filterPrebudgetExamples(PREBUDGET_EXAMPLES, { ...EMPTY_EXAMPLE_FILTERS, query: "강사" }).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/features/prebudget/examples/filterExamples.test.ts`

Expected: FAIL because the filter module does not exist.

- [ ] **Step 3: Implement normalized AND filtering**

Trim the query, lowercase Latin text, and remove internal whitespace for matching. Apply non-empty filters with AND semantics; `businessType` matches the tag array and `accountCategory` matches any item category. Search a joined haystack containing title, description, funding source, tags, item business/detail/category/description/note.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/features/prebudget/examples/filterExamples.test.ts`

Expected: PASS for combined filters, keyword matching, empty filters, and zero-result cases.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/examples/filterExamples.ts src/features/prebudget/examples/filterExamples.test.ts
git commit -m "feat: filter prebudget examples"
```

### Task 4: Convert an Example into an Editable Draft

**Files:**
- Create: `src/features/prebudget/examples/applyExample.ts`
- Create: `src/features/prebudget/examples/applyExample.test.ts`

**Interfaces:**
- Consumes: `PrebudgetFormDraft` and `PrebudgetExample`.
- Produces: `applyPrebudgetExample(current: PrebudgetFormDraft, example: PrebudgetExample): PrebudgetFormDraft`.

- [ ] **Step 1: Write failing conversion tests**

```ts
it("preserves current identity while copying example content", () => {
  const current = { ...createPrebudgetDraft("서울우리학교"), fiscalYear: "2026" };
  const result = applyPrebudgetExample(current, PREBUDGET_EXAMPLES[0]);
  expect(result.schoolName).toBe("서울우리학교");
  expect(result.fiscalYear).toBe("2026");
  expect(result.exampleSourceId).toBe(PREBUDGET_EXAMPLES[0].id);
  expect(result.items).toHaveLength(PREBUDGET_EXAMPLES[0].items.length);
});

it("deep-copies rows and assigns unique editable ids", () => {
  const result = applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES[0]);
  result.items[0].description = "수정";
  expect(PREBUDGET_EXAMPLES[0].items[0].description).not.toBe("수정");
  expect(new Set(result.items.map((item) => item.id)).size).toBe(result.items.length);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/features/prebudget/examples/applyExample.test.ts`

Expected: FAIL because `applyPrebudgetExample` does not exist.

- [ ] **Step 3: Implement the pure conversion**

Return a new draft that preserves `schoolName` and `fiscalYear`, copies school level/source/title/granting agency/document/project period/reason/basis, resets `savedAt`, records `exampleSourceId`, clones `reviewRequiredFields`, and maps each item to a new object with an ID from the existing row-ID helper. Do not mutate either argument.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/features/prebudget/examples/applyExample.test.ts`

Expected: PASS, including immutability and unique-ID assertions.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/examples/applyExample.ts src/features/prebudget/examples/applyExample.test.ts
git commit -m "feat: apply prebudget examples to drafts"
```

### Task 5: Build the Example Library UI

**Files:**
- Create: `src/features/prebudget/examples/PrebudgetExampleLibrary.tsx`
- Create: `src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `PREBUDGET_EXAMPLES`, `filterPrebudgetExamples`, `PrebudgetExample`.
- Produces: `PrebudgetExampleLibrary({ examples, onUseExample }: { examples: readonly PrebudgetExample[]; onUseExample(example: PrebudgetExample): void })`.

- [ ] **Step 1: Write failing interaction tests**

```tsx
it("filters cards and reports the current count", async () => {
  const user = userEvent.setup();
  render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} onUseExample={vi.fn()} />);
  await user.selectOptions(screen.getByLabelText("학교급"), "초등학교");
  expect(screen.getByText(/4건/)).toBeInTheDocument();
  await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "교재");
  expect(screen.getByText("입서·도서구입 지원")).toBeInTheDocument();
});

it("shows detail, preview and sends the selected example", async () => {
  const onUseExample = vi.fn();
  const user = userEvent.setup();
  render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} onUseExample={onUseExample} />);
  await user.click(screen.getAllByRole("button", { name: "상세보기" })[0]);
  expect(screen.getByRole("heading", { name: "기안문 미리보기" })).toBeInTheDocument();
  expect(screen.getByText(/실제 금액과 공문은 반드시 수정/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "이 예시로 작성하기" }));
  expect(onUseExample).toHaveBeenCalledWith(PREBUDGET_EXAMPLES[0]);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement accessible list and detail UI**

Render the fixed disclaimer, search box, four labelled select filters, reset button, current count, and cards with title/school level/funding source/tags/account categories/total amount. Keep one selected detail at a time. The detail must render usage description, base fields, a semantic table of items and calculations, reason, basis, draft preview, auto-check notes, review fields, source category/date, and the apply button. Use `Intl.NumberFormat("ko-KR")` for won amounts and preserve filter state when a detail is opened or closed.

- [ ] **Step 4: Add PC-first and narrow-screen styles**

Add prefixed classes such as `.prebudget-example-*`; use a multi-column filter/card grid on wide screens and `@media (max-width: 760px)` to switch filters/cards/detail actions to one column. Use existing color tokens and focus styles; do not alter unrelated page rules.

- [ ] **Step 5: Run component tests**

Run: `npm test -- --run src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`

Expected: PASS for filters, reset, detail, disclaimer, empty result, and callback.

- [ ] **Step 6: Commit**

```bash
git add src/features/prebudget/examples/PrebudgetExampleLibrary.tsx src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx src/styles.css
git commit -m "feat: add prebudget example library UI"
```

### Task 6: Integrate Entry Choice and Safe Example Application

**Files:**
- Modify: `src/features/prebudget/PrebudgetPage.tsx`
- Create: `src/features/prebudget/PrebudgetPage.examples.test.tsx`

**Interfaces:**
- Consumes: `PrebudgetExampleLibrary`, `PREBUDGET_EXAMPLES`, `applyPrebudgetExample`.
- Produces: two entry buttons, `직접 작성하기` and `예시문서에서 시작하기`, without changing the existing page route.

- [ ] **Step 1: Write failing page integration tests**

```tsx
it("opens the example library without clearing the current draft", async () => {
  const user = userEvent.setup();
  render(<PrebudgetPage />);
  await user.type(screen.getByLabelText("학교명"), "서울우리학교");
  await user.click(screen.getByRole("button", { name: "예시문서에서 시작하기" }));
  expect(screen.getByText("성립전예산 예시문서")).toBeInTheDocument();
  expect(screen.getByDisplayValue("서울우리학교")).toBeInTheDocument();
});

it("requires confirmation before replacing non-empty work", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const user = userEvent.setup();
  render(<PrebudgetPage />);
  await user.type(screen.getByLabelText("학교명"), "서울우리학교");
  await user.type(screen.getByLabelText("문서 제목"), "작성 중인 문서");
  await user.click(screen.getByRole("button", { name: "예시문서에서 시작하기" }));
  await user.click(screen.getAllByRole("button", { name: "상세보기" })[0]);
  await user.click(screen.getByRole("button", { name: "이 예시로 작성하기" }));
  expect(confirm).toHaveBeenCalledWith("현재 작성 중인 내용이 예시 내용으로 바뀝니다. 계속하시겠습니까?");
  expect(window.confirm).toHaveBeenCalled();
  expect(screen.getByDisplayValue("서울우리학교")).toBeInTheDocument();
  expect(screen.getByDisplayValue("작성 중인 문서")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx`

Expected: FAIL because the page has no example entry or application flow.

- [ ] **Step 3: Add view state and overwrite guard**

Add `mode: "form" | "examples"`. `직접 작성하기` selects `form`; the example button selects `examples`. Define `hasMeaningfulDraft` using non-empty title/source/document fields or any item with business/detail/description/amount. When applying an example, call `window.confirm("현재 작성 중인 내용이 예시 내용으로 바뀝니다. 계속하시겠습니까?")` only for meaningful drafts. On approval, set the converted draft, return to `form`, and focus/scroll the review notice; on cancel, leave state and mode unchanged.

- [ ] **Step 4: Render and bind the six new fields**

Add labelled controls for school level, granting agency, project period, reason, and basis; show example source as read-only metadata instead of an editable source ID. Preserve existing school name/year fields and all item-grid behavior. Do not hide the current save, reset, generate, or download controls in form mode.

- [ ] **Step 5: Run page and existing prebudget tests**

Run: `npm test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/draft.test.ts src/features/prebudget/storage.test.ts`

Expected: PASS, including cancel/no-mutation and approve/preserve-identity cases.

- [ ] **Step 6: Commit**

```bash
git add src/features/prebudget/PrebudgetPage.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx
git commit -m "feat: start prebudget drafts from examples"
```

### Task 7: Surface Review-Required Warnings in Automatic Validation

**Files:**
- Modify: `src/features/prebudget/validation.ts`
- Modify: `src/features/prebudget/validation.test.ts`
- Modify: `src/features/prebudget/PrebudgetPage.tsx`

**Interfaces:**
- Consumes: `reviewRequiredFields` and all new draft fields.
- Produces: validation messages with severity `확인 필요` using the existing validation-result shape.

- [ ] **Step 1: Write failing validation tests**

```ts
it("flags copied placeholders and review-required fields", () => {
  const draft = applyPrebudgetExample(createPrebudgetDraft("서울우리학교"), PREBUDGET_EXAMPLES[0]);
  const messages = validatePrebudgetDraft(draft).map((result) => result.message);
  expect(messages).toEqual(expect.arrayContaining([
    expect.stringContaining("공문번호"),
    expect.stringContaining("확인 필요"),
  ]));
});

it("clears a field warning after the user replaces its example value", () => {
  const draft = applyPrebudgetExample(createPrebudgetDraft("서울우리학교"), PREBUDGET_EXAMPLES[0]);
  draft.officialDocument = "교육지원과-1234(2026. 8. 8.)";
  draft.reviewRequiredFields = draft.reviewRequiredFields.filter((field) => field !== "officialDocument");
  expect(validatePrebudgetDraft(draft).some((result) => result.message.includes("공문번호 확인 필요"))).toBe(false);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npm test -- --run src/features/prebudget/validation.test.ts`

Expected: FAIL because placeholder/review-required checks are not implemented.

- [ ] **Step 3: Add explicit checks and UI clearing behavior**

Map field keys to Korean labels and add one warning per unresolved key. Also scan copied scalar strings and item descriptions/notes for `○○|0000|20XX`; avoid duplicate messages for the same field. In `PrebudgetPage`, when a user edits a flagged field, remove only that key from `reviewRequiredFields`; if the replacement still contains a placeholder, retain it. Show a persistent review panel listing unresolved labels and state that generated documents are drafts until checked.

- [ ] **Step 4: Run validation and page tests**

Run: `npm test -- --run src/features/prebudget/validation.test.ts src/features/prebudget/PrebudgetPage.examples.test.tsx`

Expected: PASS for warning creation, selective clearing, and no duplicate messages.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/validation.ts src/features/prebudget/validation.test.ts src/features/prebudget/PrebudgetPage.tsx
git commit -m "feat: flag prebudget example fields for review"
```

### Task 8: Full Regression, Browser Verification, and Preview Deployment

**Files:**
- Potential regression-fix scope: `src/features/prebudget/types.ts`, `src/features/prebudget/draft.ts`, `src/features/prebudget/storage.ts`, `src/features/prebudget/validation.ts`, `src/features/prebudget/PrebudgetPage.tsx`, `src/features/prebudget/examples/*.ts`, `src/features/prebudget/examples/*.tsx`, `src/styles.css`
- Do not modify: Production deployment settings or production domain bindings

**Interfaces:**
- Verifies the complete `PrebudgetPage` flow and all existing application features.
- Produces a Vercel Preview URL only.

- [ ] **Step 1: Run every automated test**

Run: `npm test -- --run`

Expected: all suites PASS; no existing budget, closing, execution, guideline, or prebudget regression.

- [ ] **Step 2: Run the production build locally**

Run: `npm run build`

Expected: TypeScript and Vite exit 0 and produce `dist` without type errors.

- [ ] **Step 3: Run local browser verification**

Start the Vite development server, then verify in a browser: 12-card initial count; each school-level filter; combined filter and keyword; reset; detail and memo preview; empty-result state; cancel overwrite; approve overwrite; current school/year preservation; multiple-row totals; review-warning clearing; save/reload restoration; reset confirmation; automatic checks; and the existing document generation/download buttons. Check the browser console after each primary flow and require zero uncaught errors.

- [ ] **Step 4: Inspect responsive layout**

Verify at a typical school-office desktop viewport and at 760px or narrower. Confirm no horizontal page overflow, readable item tables, visible focus state, and usable one-column filters/actions.

- [ ] **Step 5: Commit any verified regression fix separately**

```bash
git add -u src/features/prebudget src/styles.css
git commit -m "fix: preserve prebudget regression behavior"
```

Skip this commit when no code changed.

- [ ] **Step 6: Push the feature branch**

Run: `git push origin codex/fix-closing-xlsx`

Expected: branch push succeeds and updates the existing draft pull request.

- [ ] **Step 7: Deploy and verify Preview only**

Create or use the branch Preview deployment, verify the same critical flow with actual example data, and record its Preview URL and deployment identifier. Confirm the URL is not `https://school-budget-portal.vercel.app/` and do not run any promote or production command.

- [ ] **Step 8: Report the acceptance matrix**

Report PASS/FAIL and evidence for: 12 examples; privacy validation; filters/search/count/reset; detail/memo preview; overwrite cancel/approve; school/year preservation; review-required warnings; save/restore; direct-entry regression; automatic validation; document generation/download regression; complete test suite; build; desktop/narrow layout; console errors; Preview URL; Production unchanged.
