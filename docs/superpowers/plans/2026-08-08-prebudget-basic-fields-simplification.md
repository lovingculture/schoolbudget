# Prebudget Basic Fields Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove four unused prebudget fields, rename requester to business manager in the UI and documents, and add an optional approval granter that appears in generated drafts.

**Architecture:** Preserve the internal `requester` key for saved-draft compatibility and add `approvalGranter` as one optional string. Remove unused fields from current domain types and example data while making draft normalization ignore legacy extras. Generate one canonical `copyText` block so previews, Word, and PDF share the same labels and order.

**Tech Stack:** TypeScript 5.8, React 19, Vitest 3, Testing Library, docx 9, jsPDF 3, Vite 6

## Global Constraints

- Remove 교부기관, 사업기간, 편성 사유, 관련 근거 from the prebudget feature only.
- Display existing `requester` as `사업담당자`.
- Add `품의권한부여자` as a separate optional field with an empty default.
- Allow draft generation when `품의권한부여자` is empty, retaining the blank label line in the draft.
- Preserve the saved-draft key and the existing `requester` storage field.
- Preserve all 16 example business mappings, amount calculations, and existing download availability.
- HWPX template output is out of scope until the user provides the reference HWPX file.
- Deploy only to Preview after verification; never promote or deploy to Production without user approval.

---

### Task 1: Simplify the draft model and legacy normalization

**Files:**
- Modify: `src/features/prebudget/types.ts`
- Modify: `src/features/prebudget/draft.ts`
- Modify: `src/features/prebudget/draft.test.ts`

**Interfaces:**
- Produces: `PrebudgetFormDraft.approvalGranter: string`
- Preserves: `requester: string`, `normalizePrebudgetDraft(value, initialSchoolName)` and all existing item normalization
- Removes: `grantingAgency`, `projectPeriod`, `reason`, and `basis` from `PrebudgetFormDraft`

- [ ] **Step 1: Write failing draft tests**

Add assertions that a blank draft has `requester: "김담당"`, `approvalGranter: ""`, and no removed keys. Add this legacy normalization test:

```ts
it("ignores removed legacy fields and supplies an empty approval granter", () => {
  const result = normalizePrebudgetDraft({
    requester: "김담당",
    grantingAgency: "기존 교육지원청",
    projectPeriod: "2026. 1. 1. ~ 2026. 12. 31.",
    reason: "기존 사유",
    basis: "기존 근거",
  });

  expect(result.requester).toBe("김담당");
  expect(result.approvalGranter).toBe("");
  expect(result).not.toHaveProperty("grantingAgency");
  expect(result).not.toHaveProperty("projectPeriod");
  expect(result).not.toHaveProperty("reason");
  expect(result).not.toHaveProperty("basis");
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm.cmd test -- --run src/features/prebudget/draft.test.ts`

Expected: FAIL because `approvalGranter` is absent and removed legacy fields are still normalized.

- [ ] **Step 3: Implement the minimal model change**

Change the relevant part of `PrebudgetFormDraft` to:

```ts
department: string;
requester: string;
approvalGranter: string;
officialDocument: string;
items: DraftItem[];
```

Set `approvalGranter: ""` in `createPrebudgetDraft`. In `normalizePrebudgetDraft`, normalize only these basic string fields:

```ts
for (const key of ["schoolName", "title", "department", "requester", "approvalGranter", "officialDocument"] as const) {
  const property = stringProperty(value, key);
  if (property !== undefined) draft[key] = property;
}
```

Do not copy legacy removed keys.

- [ ] **Step 4: Run draft tests and verify pass**

Run: `npm.cmd test -- --run src/features/prebudget/draft.test.ts src/features/prebudget/storage.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit draft model changes**

```bash
git add src/features/prebudget/types.ts src/features/prebudget/draft.ts src/features/prebudget/draft.test.ts
git commit -m "refactor: simplify prebudget basic fields"
```

### Task 2: Remove unused fields from the 16 examples

**Files:**
- Modify: `src/features/prebudget/examples/types.ts`
- Modify: `src/features/prebudget/examples/data.ts`
- Modify: `src/features/prebudget/examples/validateExamples.ts`
- Modify: `src/features/prebudget/examples/applyExample.ts`
- Modify: `src/features/prebudget/examples/data.test.ts`
- Modify: `src/features/prebudget/examples/applyExample.test.ts`

**Interfaces:**
- Preserves: all 16 IDs, categories, three-level mappings, amounts, aliases, and `officialDocument`
- Produces: example application that preserves the current `requester` and `approvalGranter`
- Removes: example `grantingAgency`, `projectPeriod`, `reason`, and `basis`

- [ ] **Step 1: Write failing example tests**

Add a data test:

```ts
it("불필요한 기본정보를 예시에 저장하지 않는다", () => {
  for (const example of PREBUDGET_EXAMPLES) {
    expect(example).not.toHaveProperty("grantingAgency");
    expect(example).not.toHaveProperty("projectPeriod");
    expect(example).not.toHaveProperty("reason");
    expect(example).not.toHaveProperty("basis");
    expect(example.reviewRequiredFields).toEqual(["officialDocument"]);
  }
});
```

Add an application test:

```ts
it("예시 적용 시 사업담당자와 품의권한부여자를 유지한다", () => {
  const current = { ...createPrebudgetDraft("학교"), requester: "박담당", approvalGranter: "이담당" };
  const result = applyPrebudgetExample(current, PREBUDGET_EXAMPLES[0]);
  expect(result.requester).toBe("박담당");
  expect(result.approvalGranter).toBe("이담당");
  expect(result.reviewRequiredFields).toEqual(["officialDocument"]);
});
```

- [ ] **Step 2: Run example tests and verify failure**

Run: `npm.cmd test -- --run src/features/prebudget/examples/data.test.ts src/features/prebudget/examples/applyExample.test.ts`

Expected: FAIL because the removed fields remain and example application currently overwrites them.

- [ ] **Step 3: Remove unused example properties**

Remove the four properties from `PrebudgetExample`, delete their generation from `data.ts`, remove the unused `agency` helper, and set:

```ts
reviewRequiredFields: ["officialDocument"]
```

In `validatePrebudgetExamples`, require only the remaining string fields and placeholder-check `officialDocument` only. In `applyPrebudgetExample`, stop assigning removed fields; spread `current` as today so `requester` and `approvalGranter` remain unchanged.

- [ ] **Step 4: Run example tests and verify pass**

Run: `npm.cmd test -- --run src/features/prebudget/examples/data.test.ts src/features/prebudget/examples/applyExample.test.ts src/features/prebudget/examples/searchExamples.test.ts`

Expected: PASS, including the 16 approved mappings.

- [ ] **Step 5: Commit example simplification**

```bash
git add src/features/prebudget/examples/types.ts src/features/prebudget/examples/data.ts src/features/prebudget/examples/validateExamples.ts src/features/prebudget/examples/applyExample.ts src/features/prebudget/examples/data.test.ts src/features/prebudget/examples/applyExample.test.ts
git commit -m "refactor: remove unused prebudget example fields"
```

### Task 3: Update the basic-information screen and validation

**Files:**
- Modify: `src/features/prebudget/PrebudgetPage.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.examples.test.tsx`
- Modify: `src/features/prebudget/validation.ts`
- Modify: `src/features/prebudget/validation.test.ts`
- Modify: `src/features/prebudget/examples/PrebudgetExampleLibrary.tsx`

**Interfaces:**
- Consumes: `draft.requester`, `draft.approvalGranter`, and `reviewRequiredFields: ["officialDocument"]`
- Produces: separate labeled inputs `사업담당자` and `품의권한부여자`; optional validation for the latter

- [ ] **Step 1: Write failing screen and validation tests**

Add a page test that renders `PrebudgetPage` and asserts:

```ts
expect(screen.getByRole("textbox", { name: "사업담당자" })).toHaveValue("김담당");
expect(screen.getByRole("textbox", { name: "품의권한부여자" })).toHaveValue("");
for (const removed of ["교부기관", "사업기간", "편성 사유", "관련 근거"]) {
  expect(screen.queryByRole("textbox", { name: removed })).not.toBeInTheDocument();
}
```

Add validation tests that an empty `requester` reports `사업담당자를 입력하세요.` and an empty `approvalGranter` does not add an issue.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/validation.test.ts`

Expected: FAIL because the old fields and `요구자` label remain.

- [ ] **Step 3: Implement the screen and validation changes**

In the basic-information form:

```tsx
<label>사업담당자<input value={draft.requester} onChange={(e) => field("requester", e.target.value)} /></label>
<label>품의권한부여자<input value={draft.approvalGranter} onChange={(e) => field("approvalGranter", e.target.value)} /></label>
```

Remove the four deleted labels. Keep the related-document input. Change the required validation entry to:

```ts
["requester", "사업담당자를 입력하세요."]
```

Do not add `approvalGranter` to the required array. Reduce review labels to `officialDocument`, and change the example notice to `실제 교부공문, 산출내역과 금액을 확인해 수정해 주세요.`

- [ ] **Step 4: Run focused screen tests and verify pass**

Run: `npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/validation.test.ts src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit UI changes**

```bash
git add src/features/prebudget/PrebudgetPage.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/validation.ts src/features/prebudget/validation.test.ts src/features/prebudget/examples/PrebudgetExampleLibrary.tsx
git commit -m "feat: simplify prebudget basic information"
```

### Task 4: Generate the revised draft and downloads

**Files:**
- Modify: `src/features/prebudget/createDocument.ts`
- Create: `src/features/prebudget/createDocument.test.ts`
- Modify: `src/features/prebudget/exporters.ts`

**Interfaces:**
- Consumes: `PrebudgetFormDraft.requester` and optional `approvalGranter`
- Produces: canonical `copyText` with separate business-manager and approval-granter lines
- Preserves: document totals, item lines, Word and PDF generation

- [ ] **Step 1: Write the failing draft-text tests**

Create `createDocument.test.ts` with an active item and these assertions:

```ts
it("사업담당자와 품의권한부여자를 별도 줄로 생성한다", () => {
  const draft = createPrebudgetDraft("학교");
  Object.assign(draft, {
    requester: "김담당",
    approvalGranter: "이담당",
    officialDocument: "교육지원과-1111(2022. 1. 1.)",
  });
  draft.items[0] = {
    ...draft.items[0],
    unitBusiness: "생활지도 운영",
    business: "학생안전교육",
    detail: "학교안전인력 운영",
    category: "교육운영비",
    description: "학생안전 인력 운영",
    manualAmount: 800_000,
  };

  const document = createPrebudgetDocument(draft);
  expect(document.copyText).toContain("다. 사업담당자: 김담당");
  expect(document.copyText).toContain("라. 품의권한부여자: 이담당");
  expect(document.copyText).toContain("마. 예산요구 총액: 800,000원");
  expect(document.copyText).not.toContain("다. 요구자:");
});

it("품의권한부여자가 공란이어도 기안문을 생성한다", () => {
  const draft = createPrebudgetDraft("학교");
  draft.approvalGranter = "";
  draft.items[0] = { ...draft.items[0], detail: "항목", manualAmount: 1 };
  expect(createPrebudgetDocument(draft).copyText).toContain("라. 품의권한부여자: \n");
});
```

- [ ] **Step 2: Run the document test and verify failure**

Run: `npm.cmd test -- --run src/features/prebudget/createDocument.test.ts`

Expected: FAIL because the old `요구자` and four-line numbering remain.

- [ ] **Step 3: Update canonical draft text and Word extraction**

Generate these lines in `createPrebudgetDocument`:

```ts
`  다. 사업담당자: ${draft.requester}`,
`  라. 품의권한부여자: ${draft.approvalGranter}`,
`  마. 예산요구 총액: ${total.toLocaleString()}원`,
```

Update the Word exporter copy-text slice from `.slice(2, 9)` to `.slice(2, 10)` so it includes the new total line. Do not add or re-enable an Excel download button.

- [ ] **Step 4: Run document and exporter tests**

Run: `npm.cmd test -- --run src/features/prebudget/createDocument.test.ts src/features/prebudget/PrebudgetPage.examples.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit document changes**

```bash
git add src/features/prebudget/createDocument.ts src/features/prebudget/createDocument.test.ts src/features/prebudget/exporters.ts
git commit -m "feat: add approval granter to prebudget drafts"
```

### Task 5: Full verification and Preview readiness

**Files:**
- No source changes expected

**Interfaces:**
- Consumes: all changes from Tasks 1–4
- Produces: verification evidence for the existing branch and Draft PR

- [ ] **Step 1: Run the full test suite**

Run: `npm.cmd run test:run`

Expected: all test files and tests PASS.

- [ ] **Step 2: Run the production build**

Run: `npm.cmd run build`

Expected: TypeScript compilation and Vite build PASS. The existing large-chunk warning may remain; no new build error is allowed.

- [ ] **Step 3: Browser-check the revised flow**

Start the local app and verify:

- deleted four fields are absent;
- 사업담당자 defaults to 김담당;
- 품의권한부여자 defaults to blank;
- an example can be applied without reintroducing removed fields;
- generation succeeds with a blank approval granter;
- generated draft shows the blank `품의권한부여자:` line and the `사업담당자:` line;
- browser console contains no errors.

- [ ] **Step 4: Confirm repository scope**

Run: `git status --short`

Expected: no tracked changes remain uncommitted. Keep `.tmp-spreadsheet-analysis/` untracked and do not commit it.

- [ ] **Step 5: Await publishing authorization**

Do not push, deploy, promote, or change Production during implementation. Report verified commits and ask whether to push and redeploy Preview.
