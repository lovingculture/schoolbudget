# Beginner Prebudget Example Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예산 초보자가 쉬운 질문으로 재원구분을 찾고, 목적사업비 10종·구청보조금 3종·수익자부담금 3종 중 알맞은 성립전예산 예시를 선택해 기존 작성 화면에서 안전하게 편집하도록 한다.

**Architecture:** 16종 예시는 외부 호출이 없는 정적 TypeScript 카탈로그로 번들에 포함한다. 순수 함수가 카탈로그 검증·검색·초안 변환을 담당하고, React 안내 컴포넌트가 `재원 질문 → 세부 예시 → 상세 확인 → 작성 시작` 흐름을 제공한다. 기존 localStorage 초안은 정규화 계층을 통해 새 필드와 타입을 안전하게 복원한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, Testing Library, 기존 CSS 및 localStorage

## Global Constraints

- 초기 예시는 정확히 16종이며 목적사업비 10종, 구청보조금 3종, 수익자부담금 3종이다.
- 학교급은 예시 탐색의 필수조건으로 사용하지 않는다.
- 첫 선택은 `교육청·교육지원청`, `구청·지방자치단체`, `학부모 부담`, `잘 모르겠어요`의 쉬운 질문으로 제공한다.
- 사용자가 과거자료를 업로드하거나 원본 파일을 브라우저에 저장하는 기능은 만들지 않는다.
- 실제 학교명, 담당자명, 전화번호, 이메일, 계정, 출력일시는 예시 데이터에 포함하지 않는다.
- `○○`, `0000`, `20XX` 등 예시 표시는 복사 후 `확인 필요`로 안내한다.
- `이 예시로 작성하기`는 현재 학교명과 회계연도를 보존하고 예시 데이터를 깊은 복사한다.
- 기존 작성 내용이 있으면 덮어쓰기 전 확인창을 표시하며 취소 시 초안과 화면 상태를 변경하지 않는다.
- 기존 직접 작성, 저장·복원, 초기화, 자동점검, 기안문 생성 및 다운로드 기능을 유지한다.
- 모든 처리는 브라우저 내부에서 수행하고 실행 중 외부 사이트나 API를 호출하지 않는다.
- 예시는 수정 가능한 참고값이며 실제 교부공문·사업기간·산출내역·금액 확인이 필요함을 표시한다.
- PC 행정실 환경을 우선하되 760px 이하에서는 한 열로 사용할 수 있게 한다.
- Preview에만 배포하며 사용자 최종 승인 전 Production 배포, Promote, 운영 도메인 변경을 하지 않는다.

---

## File Map

- `src/features/prebudget/types.ts`: 초안과 재원구분 타입.
- `src/features/prebudget/draft.ts`: 빈 초안 생성과 구버전 초안 정규화.
- `src/features/prebudget/storage.ts`: 정규화된 localStorage 복원.
- `src/features/prebudget/examples/types.ts`: 예시·검색 모델.
- `src/features/prebudget/examples/data.ts`: 3개 분류·16종 정적 예시.
- `src/features/prebudget/examples/validateExamples.ts`: 개수·계산·개인정보 검증.
- `src/features/prebudget/examples/searchExamples.ts`: 재원별 탐색과 통합검색.
- `src/features/prebudget/examples/applyExample.ts`: 예시를 편집 가능한 초안으로 변환.
- `src/features/prebudget/examples/PrebudgetFundingGuide.tsx`: 초보자용 재원 질문.
- `src/features/prebudget/examples/PrebudgetExampleLibrary.tsx`: 목록·검색·상세 UI.
- `src/features/prebudget/PrebudgetPage.tsx`: 기존 작성 화면과 예시 흐름 통합.
- `src/features/prebudget/validation.ts`: 확인 필요 경고.
- `src/styles.css`: 안내형 UI 및 반응형 스타일.

### Task 1: Repair Draft Normalization and Complete the Model Foundation

**Files:**
- Modify: `src/features/prebudget/draft.ts`
- Modify: `src/features/prebudget/draft.test.ts`
- Modify: `src/features/prebudget/storage.test.ts`
- Verify: `src/features/prebudget/types.ts`

**Interfaces:**
- Consumes existing `normalizePrebudgetDraft(value: unknown, initialSchoolName?: string): PrebudgetFormDraft`.
- Keeps `fiscalYear: number` at both compile time and runtime.
- Keeps `PrebudgetSource` limited to its exact existing three UI values: `보조금(구청)`, `목적사업비(교육청)`, `수익자부담경비(학부모)`.

- [ ] **Step 1: Replace the conflicting legacy-year expectation with failing runtime-invariant tests**

```ts
it("converts a legacy numeric-string year to a number", () => {
  const result = normalizePrebudgetDraft({ ...legacyDraft, fiscalYear: "2026" });
  expect(result.fiscalYear).toBe(2026);
  expect(typeof result.fiscalYear).toBe("number");
});

it("uses the blank-draft year for an invalid legacy year", () => {
  const fallback = createPrebudgetDraft("학교").fiscalYear;
  expect(normalizePrebudgetDraft({ ...legacyDraft, fiscalYear: "20XX" }, "학교").fiscalYear).toBe(fallback);
});

it("rejects an unknown legacy funding source", () => {
  expect(normalizePrebudgetDraft({ ...legacyDraft, source: "임의재원" }).source).toBe(createPrebudgetDraft().source);
});
```

- [ ] **Step 2: Run RED tests**

Run: `npm.cmd test -- --run src/features/prebudget/draft.test.ts src/features/prebudget/storage.test.ts`

Expected: FAIL because the current code returns a string year and accepts an arbitrary source.

- [ ] **Step 3: Implement strict scalar normalization**

Add `isPrebudgetSource(value: unknown): value is PrebudgetSource` using an exact three-value array. Accept a finite numeric year directly; convert a trimmed numeric string with `Number`; accept it only when finite; otherwise retain the blank draft value. Remove every `as unknown as number` and unchecked `as PrebudgetSource` cast.

- [ ] **Step 4: Run GREEN tests and build**

Run: `npm.cmd test -- --run src/features/prebudget/draft.test.ts src/features/prebudget/storage.test.ts`

Expected: PASS with runtime values matching declared types.

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/draft.ts src/features/prebudget/draft.test.ts src/features/prebudget/storage.test.ts
git commit -m "fix: normalize legacy prebudget drafts safely"
```

### Task 2: Add the 3 Funding Categories and 16 Anonymized Examples

**Files:**
- Create: `src/features/prebudget/examples/types.ts`
- Create: `src/features/prebudget/examples/data.ts`
- Create: `src/features/prebudget/examples/validateExamples.ts`
- Create: `src/features/prebudget/examples/data.test.ts`

**Interfaces:**
- Produces `type ExampleFundingCategory = "목적사업비" | "구청보조금" | "수익자부담금"`.
- Produces `PrebudgetExample`, `PrebudgetExampleItem`, `ExampleValidationIssue`.
- Produces `PREBUDGET_EXAMPLES: readonly PrebudgetExample[]`.
- Produces `validatePrebudgetExamples(examples: readonly PrebudgetExample[]): ExampleValidationIssue[]`.

- [ ] **Step 1: Write failing catalogue-contract tests**

```ts
it("contains the approved 10-3-3 catalogue", () => {
  expect(PREBUDGET_EXAMPLES).toHaveLength(16);
  expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "목적사업비")).toHaveLength(10);
  expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "구청보조금")).toHaveLength(3);
  expect(PREBUDGET_EXAMPLES.filter((item) => item.fundingCategory === "수익자부담금")).toHaveLength(3);
  expect(new Set(PREBUDGET_EXAMPLES.map((item) => item.id)).size).toBe(16);
});

it("contains no calculation or privacy validation issue", () => {
  expect(validatePrebudgetExamples(PREBUDGET_EXAMPLES)).toEqual([]);
});
```

- [ ] **Step 2: Run RED test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/data.test.ts`

Expected: FAIL because the catalogue modules do not exist.

- [ ] **Step 3: Define exact example contracts**

```ts
export interface PrebudgetExampleItem extends Omit<DraftItem, "id"> {}

export interface PrebudgetExample {
  id: string;
  fundingCategory: ExampleFundingCategory;
  title: string;
  searchAliases: string[];
  summary: string;
  useWhen: string[];
  prepareBeforeWriting: string[];
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
```

- [ ] **Step 4: Add all 16 records with stable IDs**

Use these IDs and titles verbatim:

- 목적사업비: `purpose-basic-learning` 기초학력 지원, `purpose-neulbom` 맞춤형 늘봄교실, `purpose-care` 초등돌봄교실, `purpose-afterschool` 방과후학교 운영 지원, `purpose-digital-ai` 디지털·AI 교육 지원, `purpose-integrated-student` 학생 맞춤통합지원, `purpose-welfare` 교육복지 지원, `purpose-safety-staff` 학생안전 인력 운영, `purpose-reading-books` 독서교육·도서구입, `purpose-career-experience` 진로·체험활동 지원.
- 구청보조금: `district-facility` 시설·환경개선 지원, `district-curriculum` 교육과정·체험활동 지원, `district-welfare` 학생복지 지원.
- 수익자부담금: `beneficiary-yearbook` 졸업앨범비, `beneficiary-field-trip` 현장체험학습비, `beneficiary-afterschool` 방과후학교 수강료.

Every record must contain at least one complete item and at least three easy search aliases. Use editable anonymized organizations and document numbers. Make every row satisfy `unitPrice * quantity * count === manualAmount`.

- [ ] **Step 5: Implement deterministic catalogue validation**

Report an issue for catalogue count other than 16; category count other than 10·3·3; duplicate ID; empty required value; empty item list; invalid amount multiplication; email, phone, resident-number patterns; a school or agency name lacking `○○`; and placeholder-bearing fields missing from `reviewRequiredFields`.

- [ ] **Step 6: Run GREEN test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/data.test.ts`

Expected: PASS with 16 unique examples and zero validation issues.

- [ ] **Step 7: Commit**

```bash
git add src/features/prebudget/examples/types.ts src/features/prebudget/examples/data.ts src/features/prebudget/examples/validateExamples.ts src/features/prebudget/examples/data.test.ts
git commit -m "feat: add beginner prebudget examples"
```

### Task 3: Implement Guided Selection and Easy Search Logic

**Files:**
- Create: `src/features/prebudget/examples/searchExamples.ts`
- Create: `src/features/prebudget/examples/searchExamples.test.ts`

**Interfaces:**
- Produces `type ExampleSearchScope = ExampleFundingCategory | "전체"`.
- Produces `searchPrebudgetExamples(examples: readonly PrebudgetExample[], query: string, scope: ExampleSearchScope): PrebudgetExample[]`.
- Produces `FUNDING_GUIDE_OPTIONS` with four user-facing question choices.

- [ ] **Step 1: Write failing search tests**

```ts
it("shows only examples for the selected funding source", () => {
  expect(searchPrebudgetExamples(PREBUDGET_EXAMPLES, "", "구청보조금").map((item) => item.id)).toEqual([
    "district-facility", "district-curriculum", "district-welfare",
  ]);
});

it("finds examples using beginner aliases", () => {
  expect(searchPrebudgetExamples(PREBUDGET_EXAMPLES, "책", "전체").map((item) => item.id)).toContain("purpose-reading-books");
  expect(searchPrebudgetExamples(PREBUDGET_EXAMPLES, "학부모 부담", "전체").every((item) => item.fundingCategory === "수익자부담금")).toBe(true);
});
```

- [ ] **Step 2: Run RED test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/searchExamples.test.ts`

Expected: FAIL because the search module does not exist.

- [ ] **Step 3: Implement normalized search and guide options**

Search title, aliases, summary, funding category, item business/detail/category/description/note. Normalize lowercase Latin and remove whitespace. Apply scope first, then query. Define the guide options with exact labels from the approved design and a fourth `잘 모르겠어요` option that has no category.

- [ ] **Step 4: Run GREEN test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/searchExamples.test.ts`

Expected: PASS for category scope, aliases, whitespace, empty query, whole-catalogue search and zero results.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/examples/searchExamples.ts src/features/prebudget/examples/searchExamples.test.ts
git commit -m "feat: search prebudget examples by plain language"
```

### Task 4: Convert an Example into a Safe Editable Draft

**Files:**
- Create: `src/features/prebudget/examples/applyExample.ts`
- Create: `src/features/prebudget/examples/applyExample.test.ts`

**Interfaces:**
- Produces `applyPrebudgetExample(current: PrebudgetFormDraft, example: PrebudgetExample): PrebudgetFormDraft`.

- [ ] **Step 1: Write failing conversion tests**

```ts
it("preserves the current school and year", () => {
  const current = { ...createPrebudgetDraft("서울우리학교"), fiscalYear: 2026 };
  const result = applyPrebudgetExample(current, PREBUDGET_EXAMPLES[0]);
  expect(result.schoolName).toBe("서울우리학교");
  expect(result.fiscalYear).toBe(2026);
  expect(result.exampleSourceId).toBe(PREBUDGET_EXAMPLES[0].id);
});

it("deep-copies rows without changing catalogue data", () => {
  const result = applyPrebudgetExample(createPrebudgetDraft("학교"), PREBUDGET_EXAMPLES[0]);
  result.items[0].description = "사용자 수정";
  expect(PREBUDGET_EXAMPLES[0].items[0].description).not.toBe("사용자 수정");
  expect(new Set(result.items.map((item) => item.id)).size).toBe(result.items.length);
});
```

- [ ] **Step 2: Run RED test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/applyExample.test.ts`

Expected: FAIL because the conversion function does not exist.

- [ ] **Step 3: Implement immutable conversion**

Preserve school name and numeric year. Map categories exactly as follows: `목적사업비` → `목적사업비(교육청)`, `구청보조금` → `보조금(구청)`, `수익자부담금` → `수익자부담경비(학부모)`. Copy title, granting agency, document, period, reason, basis, source ID and review fields. Clone every item and assign a new row ID with the existing row-ID helper. Reset `savedAt` and never mutate either input.

- [ ] **Step 4: Run GREEN test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/applyExample.test.ts`

Expected: PASS for all three funding categories, identity preservation, unique IDs and immutability.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/examples/applyExample.ts src/features/prebudget/examples/applyExample.test.ts
git commit -m "feat: apply prebudget examples to drafts"
```

### Task 5: Build the Beginner Funding Guide and Example Library UI

**Files:**
- Create: `src/features/prebudget/examples/PrebudgetFundingGuide.tsx`
- Create: `src/features/prebudget/examples/PrebudgetExampleLibrary.tsx`
- Create: `src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces `PrebudgetFundingGuide({ onSelect, onUnsure })`.
- Produces `PrebudgetExampleLibrary({ examples, initialScope, onUseExample, onBack })`.

- [ ] **Step 1: Write failing beginner-flow tests**

```tsx
it("explains funding sources with plain-language questions", async () => {
  const onSelect = vi.fn();
  const onUnsure = vi.fn();
  const user = userEvent.setup();
  render(<PrebudgetFundingGuide onSelect={onSelect} onUnsure={onUnsure} />);
  await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
  expect(onSelect).toHaveBeenCalledWith("목적사업비");
  await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));
  expect(onUnsure).toHaveBeenCalled();
});

it("filters, searches, resets and reports count", async () => {
  const user = userEvent.setup();
  render(<PrebudgetExampleLibrary examples={PREBUDGET_EXAMPLES} initialScope="목적사업비" onUseExample={vi.fn()} onBack={vi.fn()} />);
  expect(screen.getByText("10건")).toBeInTheDocument();
  await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "책");
  expect(screen.getByRole("heading", { name: "독서교육·도서구입" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run RED component test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`

Expected: FAIL because the UI components do not exist.

- [ ] **Step 3: Implement the four-choice guide**

Render the question `이 사업비는 어디에서 받았나요?`, three category buttons with the approved sentences, and `잘 모르겠어요`. The unsure panel must explain how to inspect sender/title in an education-office grant notice, district grant decision, or parent notice/collection plan, and explicitly state that the portal will not decide the source automatically.

- [ ] **Step 4: Implement list, search and detail**

Render the fixed caution notice, current category, category switch, `전체 예시에서 검색`, search box, result count, reset, and cards. Detail must have `이런 경우에 사용해요`, `작성 전에 준비하세요`, `복사한 뒤 꼭 확인하세요`, budget item table, calculation, draft preview, source category/date, back and apply buttons. Format won with `Intl.NumberFormat("ko-KR")`.

- [ ] **Step 5: Add scoped responsive styles**

Use `.prebudget-guide-*` and `.prebudget-example-*` class prefixes. Use wide-screen grids and switch guide cards, filters and detail actions to one column at `max-width: 760px`. Preserve unrelated CSS.

- [ ] **Step 6: Run GREEN component test**

Run: `npm.cmd test -- --run src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`

Expected: PASS for guide selection, unsure help, 10·3·3 counts, category change, whole search, aliases, reset, zero result, detail and apply callback.

- [ ] **Step 7: Commit**

```bash
git add src/features/prebudget/examples/PrebudgetFundingGuide.tsx src/features/prebudget/examples/PrebudgetExampleLibrary.tsx src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx src/styles.css
git commit -m "feat: guide beginners through prebudget examples"
```

### Task 6: Integrate the Guided Flow into PrebudgetPage

**Files:**
- Modify: `src/features/prebudget/PrebudgetPage.tsx`
- Create: `src/features/prebudget/PrebudgetPage.examples.test.tsx`

**Interfaces:**
- Consumes guide, library, catalogue and `applyPrebudgetExample`.
- Adds view state `"form" | "funding-guide" | "examples"` without changing the route.

- [ ] **Step 1: Write failing integration tests**

```tsx
it("opens the beginner guide without clearing current identity", async () => {
  const user = userEvent.setup();
  render(<PrebudgetPage />);
  await user.type(screen.getByLabelText("학교명"), "서울우리학교");
  await user.click(screen.getByRole("button", { name: "예시에서 시작하기" }));
  expect(screen.getByText("이 사업비는 어디에서 받았나요?")).toBeInTheDocument();
  expect(screen.getByDisplayValue("서울우리학교")).toBeInTheDocument();
});

it("keeps a non-empty draft when overwrite is cancelled", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const user = userEvent.setup();
  render(<PrebudgetPage />);
  await user.type(screen.getByLabelText("학교명"), "서울우리학교");
  await user.type(screen.getByLabelText("문서 제목"), "작성 중인 문서");
  await user.click(screen.getByRole("button", { name: "예시에서 시작하기" }));
  await user.click(screen.getByRole("button", { name: /교육청·교육지원청에서 특정 사업/ }));
  await user.click(screen.getAllByRole("button", { name: "자세히 보기" })[0]);
  await user.click(screen.getByRole("button", { name: "이 예시로 작성하기" }));
  expect(confirm).toHaveBeenCalledWith("현재 작성 중인 내용이 예시 내용으로 바뀝니다. 계속하시겠습니까?");
  expect(screen.getByDisplayValue("작성 중인 문서")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run RED page test**

Run: `npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx`

Expected: FAIL because the guide is not integrated.

- [ ] **Step 3: Add entry and navigation state**

Keep direct writing as default. Add `예시에서 시작하기`. Navigation to guide/library must not mutate the draft. Back buttons return one step. A meaningful draft is one with edited title/document/source or any non-empty/positive item.

- [ ] **Step 4: Apply examples with overwrite protection**

Ask for confirmation only for a meaningful draft. Cancel keeps draft and library state. Approval applies a deep copy, switches to form and focuses the review warning. Render editable inputs for granting agency, project period, reason and basis while retaining every existing control.

- [ ] **Step 5: Run GREEN page tests and existing App tests**

Run: `npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx src/App.test.tsx src/features/prebudget/storage.test.ts`

Expected: PASS for direct writing, navigation, cancel, approval, school/year preservation and save/restore.

- [ ] **Step 6: Commit**

```bash
git add src/features/prebudget/PrebudgetPage.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx
git commit -m "feat: integrate guided prebudget examples"
```

### Task 7: Add Review-Required Validation and Warning UX

**Files:**
- Modify: `src/features/prebudget/validation.ts`
- Modify: `src/features/prebudget/validation.test.ts`
- Modify: `src/features/prebudget/PrebudgetPage.tsx`

**Interfaces:**
- Consumes `reviewRequiredFields` and placeholder-bearing draft values.
- Produces existing `PrebudgetValidationIssue[]` entries with messages ending in `확인 필요`.

- [ ] **Step 1: Write failing warning tests**

```ts
it("flags copied example placeholders", () => {
  const draft = applyPrebudgetExample(createPrebudgetDraft("서울우리학교"), PREBUDGET_EXAMPLES[0]);
  const messages = validateDraft(draft).map((issue) => issue.message);
  expect(messages).toEqual(expect.arrayContaining([expect.stringContaining("공문번호 확인 필요")]));
});

it("does not flag a reviewed replacement", () => {
  const draft = applyPrebudgetExample(createPrebudgetDraft("서울우리학교"), PREBUDGET_EXAMPLES[0]);
  draft.officialDocument = "교육지원과-1234(2026. 8. 8.)";
  draft.reviewRequiredFields = draft.reviewRequiredFields.filter((field) => field !== "officialDocument");
  expect(validateDraft(draft).some((issue) => issue.message.includes("공문번호 확인 필요"))).toBe(false);
});
```

- [ ] **Step 2: Run RED validation test**

Run: `npm.cmd test -- --run src/features/prebudget/validation.test.ts`

Expected: FAIL because review-required checks are absent.

- [ ] **Step 3: Implement field-labelled warnings**

Map field keys to Korean labels, emit one warning per unresolved field, and scan scalar/item text for `○○|0000|20XX` without duplicates. When the user edits a flagged field to a value without placeholders, remove only that field key. Retain it while placeholders remain.

- [ ] **Step 4: Render the persistent review panel**

Show unresolved labels above the form and state `예시를 복사한 초안입니다. 실제 공문과 금액을 확인하기 전에는 확정 문서로 사용하지 마세요.` Existing document generation remains available but validation warnings remain visible.

- [ ] **Step 5: Run GREEN validation and page tests**

Run: `npm.cmd test -- --run src/features/prebudget/validation.test.ts src/features/prebudget/PrebudgetPage.examples.test.tsx`

Expected: PASS for placeholder detection, selective clearing and no duplicate warnings.

- [ ] **Step 6: Commit**

```bash
git add src/features/prebudget/validation.ts src/features/prebudget/validation.test.ts src/features/prebudget/PrebudgetPage.tsx
git commit -m "feat: warn about unreviewed example fields"
```

### Task 8: Full Regression, Browser Verification and Preview Deployment

**Files:**
- Potential fix scope: files modified or created in Tasks 1–7 only.
- Do not modify Production settings or production domain bindings.

**Interfaces:**
- Verifies the complete beginner flow and existing portal behavior.
- Produces a Vercel Preview URL only.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm.cmd test -- --run`

Expected: all test files PASS with no existing feature regression.

- [ ] **Step 2: Run the build**

Run: `npm.cmd run build`

Expected: TypeScript and Vite exit 0.

- [ ] **Step 3: Verify locally in a browser**

Verify: four beginner choices; unsure help; category counts 10·3·3; all 16 detail pages; easy aliases; whole-catalogue search; count/reset/zero result; current school/year preservation; overwrite cancel/approve; multiple rows and totals; review warnings and clearing; save/reload; direct writing; reset; automatic checks; document generation/download; zero uncaught console errors.

- [ ] **Step 4: Verify layout sizes**

Check a school-office desktop viewport and 760px-or-narrower viewport. Require readable cards/tables, visible keyboard focus and no page-level horizontal overflow.

- [ ] **Step 5: Run final diff checks**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `git status --short`

Expected: only intentional source/test changes before the final commit.

- [ ] **Step 6: Commit any regression fix as one scoped commit**

```bash
git add -u src/features/prebudget src/styles.css
git commit -m "fix: preserve prebudget regression behavior"
```

Skip this step when browser and automated verification require no code change.

- [ ] **Step 7: Push the branch and deploy Preview only**

Run: `git push origin codex/fix-closing-xlsx`

Expected: the existing draft pull request updates. Create/inspect a branch Preview and verify its URL is not `https://school-budget-portal.vercel.app/`. Do not run production or promote commands.

- [ ] **Step 8: Report the acceptance matrix**

Report PASS/FAIL and evidence for: 16 examples; 10·3·3 counts; privacy/calculation validation; beginner questions and unsure help; category and whole search; detail/preview; overwrite protection; school/year preservation; review warnings; save/restore; direct-writing regression; document generation/download; full test suite; build; desktop/narrow layout; console; Preview URL; Production unchanged.
