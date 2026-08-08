# Prebudget Example Business Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 16 prebudget examples automatically populate an example-specific unit business, detail business, and detail item.

**Architecture:** Keep the existing static example library and application flow. Extend the domain's linked business options with the valid pairs needed by the examples, then move the three classification values into each example seed so the shared factory can no longer impose one classification on every example.

**Tech Stack:** TypeScript 5.8, React 19, Vitest 3, Testing Library, Vite 6

## Global Constraints

- Display business names without funding prefixes such as `(목)`, `(구청)`, and `(수)`.
- Preserve the existing 10 purpose-business, 3 district-subsidy, and 3 beneficiary-burden examples.
- The detail item remains editable after an example is applied.
- Do not change the input-field removal work, example-library layout, draft-letter wording, or HWPX download in this plan.
- Do not deploy or promote to Production; Preview deployment requires separate user approval after verification.

---

### Task 1: Add the required linked business pairs

**Files:**
- Modify: `src/domain/prebudget.ts`
- Create: `src/domain/prebudget.test.ts`

**Interfaces:**
- Consumes: `PREBUDGET_BUSINESS_OPTIONS` and `getDetailBusinesses(unitBusiness?: string): readonly string[]`
- Produces: valid options for `돌봄교실운영` and `교육환경개선`, while preserving the existing `늘봄학교 운영` and `학생 복지운영` pairs

- [ ] **Step 1: Write the failing linked-option test**

```ts
import { describe, expect, it } from "vitest";
import { getDetailBusinesses } from "./prebudget";

describe("성립전예산 연결 사업 선택", () => {
  it.each([
    ["방과후 학교운영", "늘봄학교 운영"],
    ["방과후 학교운영", "돌봄교실운영"],
    ["교육여건 개선", "교육환경개선"],
    ["학생 복지", "학생 복지운영"],
  ])("%s에서 %s를 선택할 수 있다", (unit, detail) => {
    expect(getDetailBusinesses(unit)).toContain(detail);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/domain/prebudget.test.ts`

Expected: FAIL because `돌봄교실운영` and `교육여건 개선 → 교육환경개선` are not present.

- [ ] **Step 3: Add the minimal linked options**

Update `PREBUDGET_BUSINESS_OPTIONS` so these exact pairs exist while preserving all current pairs:

```ts
["학생 복지", ["학생장학금운영", "교육복지우선", "학생 복지운영"]],
["방과후 학교운영", ["방과후 학교운영", "유치원 방과후 과정운영", "늘봄학교 운영", "돌봄교실운영"]],
["교육여건 개선", ["교육환경개선"]],
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run src/domain/prebudget.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the linked-option change**

```bash
git add src/domain/prebudget.ts src/domain/prebudget.test.ts
git commit -m "feat: add prebudget example business options"
```

### Task 2: Give every example its approved three-level classification

**Files:**
- Modify: `src/features/prebudget/examples/data.ts`
- Modify: `src/features/prebudget/examples/data.test.ts`

**Interfaces:**
- Consumes: `PrebudgetExampleItem` and `getDetailBusinesses(unitBusiness?: string)`
- Produces: `PREBUDGET_EXAMPLES`, each with a non-empty and valid `items[0].unitBusiness`, `items[0].business`, and `items[0].detail`

- [ ] **Step 1: Write failing mapping and validity tests**

Add imports and assertions to `data.test.ts`:

```ts
import { getDetailBusinesses } from "../../../domain/prebudget";

const approvedMappings = {
  "purpose-basic-learning": ["교육격차해소", "기타 교육격차해소 지원", "단위학교 기초학력 책임지도"],
  "purpose-neulbom": ["방과후 학교운영", "늘봄학교 운영", "맞춤형 늘봄교실 운영"],
  "purpose-care": ["방과후 학교운영", "돌봄교실운영", "오후돌봄교실 운영"],
  "purpose-afterschool": ["방과후 학교운영", "방과후 학교운영", "방과후학교 운영 지원"],
  "purpose-digital-ai": ["학습지원실 운영", "정보화실 운영", "AI 디지털교육 지원"],
  "purpose-integrated-student": ["교육격차해소", "기타 교육격차해소 지원", "학생 맞춤통합지원"],
  "purpose-welfare": ["학생 복지", "교육복지우선", "교육복지 지원사업"],
  "purpose-safety-staff": ["생활지도 운영", "학생안전교육", "학교안전인력 운영"],
  "purpose-reading-books": ["독서활동", "독서활동 운영", "독서교육 및 도서구입"],
  "purpose-career-experience": ["창의적 체험활동", "진로활동", "진로교육·체험활동"],
  "district-facility": ["교육여건 개선", "교육환경개선", "시설·환경개선"],
  "district-curriculum": ["교과 활동", "교과활동지원", "교육과정 운영 지원"],
  "district-welfare": ["학생 복지", "교육복지우선", "학생복지 지원"],
  "beneficiary-yearbook": ["학생 복지", "학생 복지운영", "졸업앨범 제작"],
  "beneficiary-field-trip": ["창의적 체험활동", "현장체험학습 활동", "현장체험학습"],
  "beneficiary-afterschool": ["방과후 학교운영", "방과후 학교운영", "방과후학교 수강료"],
} as const;

it("16개 예시에 승인된 단위·세부사업·세부항목을 지정한다", () => {
  for (const example of PREBUDGET_EXAMPLES) {
    const item = example.items[0];
    expect([item.unitBusiness, item.business, item.detail]).toEqual(approvedMappings[example.id as keyof typeof approvedMappings]);
  }
});

it("모든 예시의 단위사업과 세부사업이 유효한 연결 조합이다", () => {
  for (const example of PREBUDGET_EXAMPLES) {
    const item = example.items[0];
    expect(item.unitBusiness).toBeTruthy();
    expect(item.business).toBeTruthy();
    expect(item.detail).toBeTruthy();
    expect(getDetailBusinesses(item.unitBusiness)).toContain(item.business);
    expect(item.detail).not.toMatch(/^\((목|구청|수)\)/);
  }
});
```

- [ ] **Step 2: Run the example-data tests and verify they fail**

Run: `npm test -- --run src/features/prebudget/examples/data.test.ts`

Expected: FAIL because all examples still use `교과 활동 → 교과활동지원` and a generated detail value.

- [ ] **Step 3: Put the classification values in each seed**

Change the seed type from four values to seven values:

```ts
type Seed = [
  id: string,
  fundingCategory: ExampleFundingCategory,
  title: string,
  searchAliases: string[],
  unitBusiness: string,
  business: string,
  detail: string,
];
```

Populate the 16 seed entries with the exact values in `approvedMappings`. Destructure those values in `makeExample` and replace the fixed item fields:

```ts
const makeExample = (
  [id, fundingCategory, title, searchAliases, unitBusiness, business, detail]: Seed,
  index: number,
): PrebudgetExample => {
  // existing common fields remain unchanged
  return {
    // existing example fields remain unchanged
    items: [{
      unitBusiness,
      business,
      detail,
      category: "교육운영비",
      description: `${title} 운영 물품 및 프로그램비`,
      note: "실제 교부조건에 맞게 수정",
      unitPrice,
      quantity: 10,
      count: 1,
      manualAmount: unitPrice * 10,
    }],
  };
};
```

- [ ] **Step 4: Run the example-data tests and verify they pass**

Run: `npm test -- --run src/features/prebudget/examples/data.test.ts`

Expected: PASS, including existing 10·3·3 and validation tests.

- [ ] **Step 5: Commit the per-example mappings**

```bash
git add src/features/prebudget/examples/data.ts src/features/prebudget/examples/data.test.ts
git commit -m "fix: map prebudget examples to matching businesses"
```

### Task 3: Verify applying an example preserves all three levels

**Files:**
- Modify: `src/features/prebudget/examples/applyExample.test.ts`

**Interfaces:**
- Consumes: `applyPrebudgetExample(current: PrebudgetFormDraft, example: PrebudgetExample): PrebudgetFormDraft`
- Produces: regression coverage proving applied form items retain all approved classification values and remain independent of the example source object

- [ ] **Step 1: Add the application regression test**

```ts
it.each([
  ["purpose-neulbom", "방과후 학교운영", "늘봄학교 운영", "맞춤형 늘봄교실 운영"],
  ["purpose-care", "방과후 학교운영", "돌봄교실운영", "오후돌봄교실 운영"],
  ["district-facility", "교육여건 개선", "교육환경개선", "시설·환경개선"],
  ["beneficiary-yearbook", "학생 복지", "학생 복지운영", "졸업앨범 제작"],
  ["beneficiary-field-trip", "창의적 체험활동", "현장체험학습 활동", "현장체험학습"],
])("%s 예시의 3단계 사업분류를 작성 화면에 복사한다", (id, unit, business, detail) => {
  const example = PREBUDGET_EXAMPLES.find((candidate) => candidate.id === id)!;
  const result = applyPrebudgetExample(createPrebudgetDraft("학교"), example);
  expect(result.items[0]).toMatchObject({ unitBusiness: unit, business, detail });

  result.items[0].detail = "사용자 수정 세부항목";
  expect(example.items[0].detail).toBe(detail);
});
```

- [ ] **Step 2: Run the application test**

Run: `npm test -- --run src/features/prebudget/examples/applyExample.test.ts`

Expected: PASS. If it fails, minimally correct `applyPrebudgetExample` so its existing item clone retains `unitBusiness`, `business`, and `detail`; do not add UI state workarounds.

- [ ] **Step 3: Run the focused prebudget suite**

Run: `npm test -- --run src/domain/prebudget.test.ts src/features/prebudget/examples/data.test.ts src/features/prebudget/examples/applyExample.test.ts src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx src/features/prebudget/validation.test.ts`

Expected: all focused tests PASS.

- [ ] **Step 4: Run full regression verification**

Run: `npm run test:run`

Expected: all Vitest files and tests PASS.

Run: `npm run build`

Expected: TypeScript compilation and Vite production build PASS.

- [ ] **Step 5: Commit the application regression coverage**

```bash
git add src/features/prebudget/examples/applyExample.test.ts
git commit -m "test: verify prebudget example classification application"
```

### Task 4: Browser-check representative examples

**Files:**
- No source-file changes expected

**Interfaces:**
- Consumes: the built prebudget page and the 16 static examples
- Produces: manual evidence that linked select values render correctly after example application

- [ ] **Step 1: Start the local application**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite reports a local URL without compilation errors.

- [ ] **Step 2: Apply representative examples**

In the browser, open the 성립전예산 page and apply these examples one at a time:

- 맞춤형 늘봄교실
- 초등돌봄교실
- 시설·환경개선 지원
- 졸업앨범비
- 현장체험학습비

Expected: each example displays the exact three values from the approved mapping table; no 세부사업 select is blank.

- [ ] **Step 3: Verify editability and console health**

Change the 세부항목 text for one applied example.

Expected: the edited value remains visible, unit/detail selects remain selected, and the browser console has no errors.

- [ ] **Step 4: Record final repository state**

Run: `git status --short`

Expected: no tracked implementation changes remain uncommitted. The local `.tmp-spreadsheet-analysis/` directory may remain untracked and must not be committed.
