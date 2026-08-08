# Prebudget HWPX Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate an editable, standards-compliant HWPX version of the prebudget draft and keep its conditional item numbering identical across preview, copy, Word, PDF, and HWPX.

**Architecture:** `createPrebudgetDocument` remains the canonical content builder and will produce a structured list of body lines in addition to `copyText`. A focused HWPX exporter will package a prebudget section XML with the existing verified HWPX metadata pattern. The page will expose one new HWPX download action while Word and PDF continue consuming the same canonical document.

**Tech Stack:** TypeScript 5.8, React 19, Vitest 3, JSZip 3, HWPX XML, Vite 6

## Global Constraints

- Generate a real `.hwpx` ZIP package that opens as an editable document; never rename another format to `.hwp` or `.hwpx`.
- When `approvalGranter.trim()` is empty, omit the entire approval-granter line and renumber total/detail as `라` and `마`.
- When approval granter is present, retain the approved `가` through `바` ordering.
- Preview, copy, HWPX, Word, and PDF must use the same canonical text and ordering.
- Keep related-document, amount formatting, five labeled item fields, and all 16 examples intact.
- Download choices are HWPX, Word, and PDF; do not add Excel.
- Browser-side generation is required so school data is not uploaded externally.
- Production deployment is forbidden without separate user approval.

---

### Task 1: Canonical conditional document lines

**Files:**
- Modify: `src/features/prebudget/createDocument.ts`
- Modify: `src/features/prebudget/createDocument.test.ts`

**Interfaces:**
- Consumes: `PrebudgetFormDraft.approvalGranter`, active draft items, `calculateRequestedAmount`
- Produces: `PrebudgetDocument.bodyLines: string[]` and `copyText: string`
- Preserves: `title`, `items`, `total`, and the current `PrebudgetDocument` inferred type

- [ ] **Step 1: Write failing conditional-order tests**

Add one test for a nonblank `approvalGranter` expecting:

```ts
expect(document.bodyLines).toEqual(expect.arrayContaining([
  "가. 재원구분: 목적사업비(교육청)",
  "나. 요구부서: 체육안전교육부",
  "다. 사업담당자: 김담당",
  "라. 품의권한 부여자: 이담당",
  "마. 예산요구 총액: 800,000원",
  "바. 성립전예산 요구내역",
]));
```

Replace the current blank-granter expectation with literal assertions that the line is absent and the order is:

```ts
expect(document.copyText).not.toContain("품의권한 부여자");
expect(document.copyText).toContain("라. 예산요구 총액: 800,000원\n마. 성립전예산 요구내역");
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- --run src/features/prebudget/createDocument.test.ts`

Expected: FAIL because `bodyLines` is absent and a blank approval-granter line is currently retained.

- [ ] **Step 3: Implement one canonical body-line builder**

Build the fixed prefix and conditional sequence once:

```ts
const approvalLine = draft.approvalGranter.trim()
  ? [`라. 품의권한 부여자: ${draft.approvalGranter.trim()}`]
  : [];
const totalPrefix = approvalLine.length ? "마" : "라";
const detailsPrefix = approvalLine.length ? "바" : "마";
```

Return `bodyLines` and form `copyText` from `[draft.title, "", ...bodyLines].join("\n")`. Do not duplicate numbering logic in a component or exporter.

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd test -- --run src/features/prebudget/createDocument.test.ts src/features/prebudget/PrebudgetPage.examples.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/prebudget/createDocument.ts src/features/prebudget/createDocument.test.ts
git commit -m "feat: conditionally number prebudget draft lines"
```

### Task 2: Standards-compliant prebudget HWPX generator

**Files:**
- Create: `src/features/prebudget/exportHwpx.ts`
- Create: `src/features/prebudget/exportHwpx.test.ts`
- Create: `src/features/prebudget/hwpxSection.ts`
- Create: `src/features/prebudget/templates/prebudgetSection.xml`
- Create: `src/features/prebudget/templates/prebudgetHeader.xml`
- Create: `src/features/prebudget/templates/prebudgetContent.hpf`
- Create: `src/features/prebudget/templates/prebudgetContainer.xml`
- Create: `src/features/prebudget/templates/prebudgetManifest.xml`
- Create: `src/features/prebudget/templates/prebudgetSettings.xml`
- Create: `src/features/prebudget/templates/prebudgetVersion.xml`

**Interfaces:**
- Consumes: `PrebudgetDocument.title`, `bodyLines`, school name, fiscal year, and total
- Produces: `exportPrebudgetHwpx(document: PrebudgetDocument): Promise<Blob>`
- Produces: `createPrebudgetHwpxSection(document: PrebudgetDocument): string`
- MIME type: `application/hwp+zip`

- [ ] **Step 1: Write a failing HWPX package test**

Create a realistic active draft, call `createPrebudgetDocument`, export it, and inspect with JSZip. Assert these exact entries exist:

```ts
expect(Object.keys(zip.files)).toEqual(expect.arrayContaining([
  "mimetype",
  "version.xml",
  "settings.xml",
  "Contents/header.xml",
  "Contents/section0.xml",
  "Contents/content.hpf",
  "META-INF/container.xml",
  "META-INF/manifest.xml",
  "Preview/PrvText.txt",
]));
expect(await zip.file("mimetype")!.async("string")).toBe("application/hwp+zip");
```

Parse `Contents/section0.xml` with `DOMParser`, assert no `parsererror`, and assert its text includes the title, related document, business manager, total, and labeled detail line. For a blank approval granter, assert it excludes `품의권한 부여자` and includes the renumbered `라`/`마` lines.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- --run src/features/prebudget/exportHwpx.test.ts`

Expected: FAIL because `exportHwpx.ts` does not exist.

- [ ] **Step 3: Add a verified minimal section template and XML renderer**

Base the metadata templates on the existing working budget/closing HWPX packages, but keep prebudget-owned copies so future template replacement does not couple features. `prebudgetSection.xml` must contain one valid title paragraph and one valid body paragraph carrying placeholders `{{TITLE}}` and `{{BODY_LINE}}`.

In `createPrebudgetHwpxSection`, parse the template, clone the body paragraph once per `bodyLines` entry, set the first text node to the literal line, append in order, remove the placeholder paragraph, and serialize. Assign title and body paragraph styles separately. Use DOM text nodes rather than string interpolation so XML-reserved characters remain safe.

- [ ] **Step 4: Package the HWPX Blob**

Implement `exportPrebudgetHwpx` with JSZip following the established budget/closing exporters. Store `mimetype` uncompressed, add all required files, and set `Preview/PrvText.txt` to:

```ts
`${document.title}\n${document.bodyLines.join("\n")}`
```

- [ ] **Step 5: Verify GREEN and XML escaping**

Run: `npm.cmd test -- --run src/features/prebudget/exportHwpx.test.ts`

Add a second case containing `A & B <확인>` in a field, re-open the ZIP, parse `section0.xml`, and verify the literal text survives without a parser error. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/prebudget/exportHwpx.ts src/features/prebudget/exportHwpx.test.ts src/features/prebudget/hwpxSection.ts src/features/prebudget/templates
git commit -m "feat: generate editable prebudget HWPX"
```

### Task 3: HWPX download UI and integrated verification

**Files:**
- Modify: `src/features/prebudget/PrebudgetPage.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.examples.test.tsx`
- Modify: `src/features/prebudget/exporters.ts`

**Interfaces:**
- Consumes: `exportPrebudgetHwpx(document)` from Task 2
- Produces: accessible button named `한글(HWPX)` and user-visible failure status
- Preserves: copy, Word, PDF, no Excel, preview rendering, and the common `bodyLines`

- [ ] **Step 1: Write failing UI tests**

Generate a valid preview and assert:

```ts
expect(screen.getByRole("button", { name: "한글(HWPX)" })).toBeVisible();
expect(screen.getByRole("button", { name: "Word" })).toBeVisible();
expect(screen.getByRole("button", { name: "PDF" })).toBeVisible();
expect(screen.queryByRole("button", { name: "Excel" })).not.toBeInTheDocument();
```

Mock `exportPrebudgetHwpx` to reject and assert the status displays `한글(HWPX) 파일을 만들지 못했습니다. 다시 시도해 주세요.`. Also assert the HWPX button is disabled while the export promise is pending.

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx`

Expected: FAIL because the HWPX action is absent.

- [ ] **Step 3: Add the download action**

Import `exportPrebudgetHwpx`, add local working state for `"hwpx" | null`, and implement one guarded async handler. On success call `downloadBlob(blob, safe prebudget filename ending .hwpx)`. On failure set the exact approved message. Render buttons in the order HWPX, Word, PDF; do not add Excel.

Replace any preview reconstruction from `copyText.split(...)` with `document.bodyLines.join("\n")`. Update Word export to consume `bodyLines` directly so all outputs use the same interface.

- [ ] **Step 4: Verify focused integration**

Run:

```bash
npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/createDocument.test.ts src/features/prebudget/exportHwpx.test.ts src/features/prebudget/exporters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm.cmd run test:run
npm.cmd run build
```

Expected: all tests and build PASS. The existing large-chunk warning may remain.

- [ ] **Step 6: Browser verification**

Apply one example with blank approval granter, enter a real related-document value, generate the preview, and verify:

- the approval-granter line is absent;
- total/detail are labeled `라`/`마`;
- HWPX, Word, PDF buttons appear and Excel does not;
- no Vite error overlay or console error exists.

Then repeat with a nonblank approval granter and verify `라` through `바` ordering.

- [ ] **Step 7: Commit**

```bash
git add src/features/prebudget/PrebudgetPage.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/exporters.ts
git commit -m "feat: add prebudget HWPX download"
```

### Task 4: Final branch review and Preview readiness

**Files:**
- No source changes expected unless review identifies a defect

**Interfaces:**
- Consumes: Tasks 1–3 commits
- Produces: review and verification evidence; no Production mutation

- [ ] **Step 1: Review the complete feature range**

Review from the commit before Task 1 through Task 3 HEAD for spec compliance, HWPX package validity, conditional numbering, exporter consistency, test quality, and accidental Excel reintroduction.

- [ ] **Step 2: Address all Critical and Important findings**

Use focused failing tests for each confirmed defect, make the smallest correction, and run the relevant focused suite.

- [ ] **Step 3: Re-run final verification**

Run:

```bash
npm.cmd run test:run
npm.cmd run build
git diff --check
git status --short
```

Expected: tests and build PASS; no tracked changes remain; `.tmp-spreadsheet-analysis/` remains untracked and excluded.

- [ ] **Step 4: Await publishing authorization**

Report commits and verification. Do not push, deploy Preview, promote, or change Production until the user explicitly authorizes publishing.
