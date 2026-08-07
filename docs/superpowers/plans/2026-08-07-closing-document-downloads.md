# Closing Document Downloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the closing-result Excel download with editable HWPX and DOCX downloads while retaining PDF and both `.xls`/`.xlsx` uploads.

**Architecture:** All exporters consume the existing `ClosingAgendaDraft`. DOCX continues to use `docx`, PDF continues to render the A4 preview, and HWPX is created client-side from a known-valid HWPX package template using `jszip`; no uploaded data leaves the browser. The download component exposes exactly three format-specific actions and errors.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, `docx` 9.5, `jszip`, jsPDF, html2canvas, Hancom Office 2022 for final HWPX smoke verification

## Global Constraints

- Show only `한글(HWPX)`, `Word(DOCX)`, and `PDF` in the closing download area.
- Remove the closing-result Excel exporter; do not change Excel downloads in other features.
- Keep `.xls` and `.xlsx` closing uploads and parser behavior unchanged.
- Generate real editable HWPX and DOCX files; never fake a format by renaming an extension.
- Generate files entirely in the browser without an external conversion service.
- Use the latest edited `ClosingAgendaDraft` for every format and preserve comma-formatted money values.
- Do not deploy or promote to Production before explicit user approval.

---

### Task 1: Remove closing Excel output and define the three-format UI

**Files:**
- Modify: `src/features/closing/ClosingDownloads.tsx`
- Modify: `src/features/closing/ClosingEditor.test.tsx`
- Delete: `src/features/closing/exportExcel.ts`
- Modify: `src/features/closing/exporters.test.ts`

**Interfaces:**
- Consumes: `ClosingAgendaDraft`, `exportClosingPdf`, `exportClosingWord`
- Produces: closing Excel output removed; retained controls labelled `Word(DOCX) 내려받기` and `PDF 내려받기`

- [ ] **Step 1: Write the failing UI test**

Add a test that renders the closing editor with its fixture draft and asserts:

```ts
expect(screen.getByRole("button", { name: "Word(DOCX) 내려받기" })).toBeVisible();
expect(screen.getByRole("button", { name: "PDF 내려받기" })).toBeVisible();
expect(screen.queryByRole("button", { name: /Excel/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm.cmd test -- --run src/features/closing/ClosingEditor.test.tsx`

Expected: FAIL because Excel is still present and the existing labels do not include extensions.

- [ ] **Step 3: Remove Excel output and add explicit accessible labels**

Remove `Sheet` and `exportClosingExcel` from `ClosingDownloads.tsx`. Keep the PDF and Word actions and use format-specific `aria-label` values. Change `run` to accept a Korean format label so errors read, for example:

```ts
setError(`${label} 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.`);
```

Delete `src/features/closing/exportExcel.ts` and remove only its closing-specific test from `exporters.test.ts`.

- [ ] **Step 4: Run closing UI tests**

Run: `npm.cmd test -- --run src/features/closing/ClosingEditor.test.tsx src/features/closing/ClosingPage.test.tsx`

Expected: PASS; upload tests continue to prove `.xls/.xlsx` support.

- [ ] **Step 5: Commit**

```powershell
git add src/features/closing/ClosingDownloads.tsx src/features/closing/ClosingEditor.test.tsx src/features/closing/exporters.test.ts
git rm src/features/closing/exportExcel.ts
git commit -m "refactor: replace closing excel download options"
```

### Task 2: Verify and harden editable DOCX plus PDF output

**Files:**
- Modify: `src/features/closing/exportWord.ts`
- Modify: `src/features/closing/exportPdf.ts`
- Modify: `src/features/closing/exporters.test.ts`

**Interfaces:**
- Consumes: `ClosingAgendaDraft`, A4 preview elements
- Produces: `exportClosingWord(draft): Promise<Blob>`, `exportClosingPdf(pages): Promise<Blob>`

- [ ] **Step 1: Write failing document-content tests**

Use `JSZip.loadAsync(await blob.arrayBuffer())` to inspect `word/document.xml` and assert the XML includes the school name, agenda number, proposal fields, income total, expense total, surplus, first income row, and first expense row. Extend the PDF test to assert the returned blob type is `application/pdf` and its byte prefix is `%PDF-`.

```ts
expect(documentXml).toContain("서울옥정초등학교");
expect(documentXml).toContain("2,724,818,217");
expect(documentXml).toContain("2,698,568,069");
expect(new TextDecoder().decode(pdfBytes.slice(0, 5))).toBe("%PDF-");
```

- [ ] **Step 2: Run the focused exporter tests and confirm RED where coverage is missing**

Run: `npm.cmd test -- --run src/features/closing/exporters.test.ts`

Expected: at least one new assertion fails before the exporter includes all edited fields or the expected MIME metadata.

- [ ] **Step 3: Complete the DOCX and PDF implementations**

In `exportWord.ts`, use A4 page sizing and margins, preserve the existing two-page structure, and generate all paragraphs/tables from `draft`. Use a shared local formatter:

```ts
const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;
```

Ensure the Blob returned by `Packer.toBlob` has the standard DOCX MIME type. In `exportPdf.ts`, retain the A4 page loop and return the jsPDF Blob without changing page order.

- [ ] **Step 4: Run exporter and preview tests**

Run: `npm.cmd test -- --run src/features/closing/exporters.test.ts src/features/closing/ClosingAgendaPreview.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/closing/exportWord.ts src/features/closing/exportPdf.ts src/features/closing/exporters.test.ts
git commit -m "test: verify closing word and pdf downloads"
```

### Task 3: Add a real browser-generated HWPX package

**Files:**
- Create: `src/features/closing/exportHwpx.ts`
- Create: `src/features/closing/hwpxXml.ts`
- Create: `src/features/closing/templates/closing-agenda.hwpx`
- Create: `src/features/closing/exportHwpx.test.ts`
- Modify: `src/features/closing/ClosingDownloads.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `ClosingAgendaDraft`
- Produces: `exportClosingHwpx(draft: ClosingAgendaDraft): Promise<Blob>`
- Internal: `replaceClosingHwpxContent(zip: JSZip, draft: ClosingAgendaDraft): Promise<void>`

- [ ] **Step 1: Create a known-valid HWPX template from the supplied closing HWP example**

Use installed Hancom Office 2022 to open `C:\Users\User\Desktop\결산서\1.(심의안건) 2025학년도 학교회계 세입세출 결산 (안).hwp` and save a working copy as HWPX. Place only the sanitized structural template at `src/features/closing/templates/closing-agenda.hwpx`; replace school-specific text and money with neutral placeholders before committing. Confirm the package includes at minimum:

```text
mimetype
META-INF/container.xml
Contents/content.hpf
Contents/header.xml
Contents/section0.xml
```

- [ ] **Step 2: Add `jszip` as a direct runtime dependency**

Run: `npm.cmd install jszip@3.10.1`

Expected: `package.json` and `package-lock.json` list `jszip` directly.

- [ ] **Step 3: Write the failing HWPX package test**

The test must call `exportClosingHwpx(draft)`, open the result with JSZip, and assert:

```ts
expect(await zip.file("mimetype")!.async("string")).toBe("application/hwp+zip");
expect(zip.file("META-INF/container.xml")).not.toBeNull();
expect(zip.file("Contents/content.hpf")).not.toBeNull();
expect(zip.file("Contents/header.xml")).not.toBeNull();
expect(sectionXml).toContain("서울옥정초등학교");
expect(sectionXml).toContain("2,724,818,217");
expect(sectionXml).toContain("2,698,568,069");
expect(sectionXml).toContain("지방자치단체이전수입");
expect(sectionXml).toContain("인적자원 운용");
```

- [ ] **Step 4: Run the HWPX test and confirm RED**

Run: `npm.cmd test -- --run src/features/closing/exportHwpx.test.ts`

Expected: FAIL because `exportClosingHwpx` does not exist.

- [ ] **Step 5: Implement XML-safe template population**

In `hwpxXml.ts`, escape `&`, `<`, `>`, `"`, and `'`. Replace scalar placeholders and construct income/expense table-row XML by cloning the sanitized template's marked row fragments. Every row uses `draft.incomeRows` or `draft.expenseRows`, and money uses `toLocaleString("ko-KR")`. Throw a descriptive error if a required package entry or row marker is missing.

```ts
export const escapeXml = (value: unknown) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");
```

In `exportHwpx.ts`, fetch the Vite asset URL, load it with JSZip, call `replaceClosingHwpxContent`, and generate a Blob with MIME `application/hwp+zip`. Preserve `mimetype` as an uncompressed entry.

- [ ] **Step 6: Wire HWPX into the download component**

Import `exportClosingHwpx` and save the result as `${base}.hwpx`. The action label is `한글(HWPX) 내려받기`; its busy state must not disable PDF or DOCX. Extend `ClosingEditor.test.tsx` with:

```ts
expect(screen.getByRole("button", { name: "한글(HWPX) 내려받기" })).toBeVisible();
```

- [ ] **Step 7: Run HWPX and UI tests**

Run: `npm.cmd test -- --run src/features/closing/exportHwpx.test.ts src/features/closing/ClosingEditor.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json src/features/closing/exportHwpx.ts src/features/closing/hwpxXml.ts src/features/closing/exportHwpx.test.ts src/features/closing/ClosingDownloads.tsx src/features/closing/ClosingEditor.test.tsx src/features/closing/templates/closing-agenda.hwpx
git commit -m "feat: export closing agenda as hwpx"
```

### Task 4: Full verification and Preview handoff

**Files:**
- Modify only if verification exposes a defect

**Interfaces:**
- Consumes: completed branch and real closing fixture
- Produces: verified Preview URL without Production promotion

- [ ] **Step 1: Run focused closing tests**

Run: `npm.cmd test -- --run src/features/closing`

Expected: all closing parser, upload, editor, preview, validation, and exporter tests pass.

- [ ] **Step 2: Run full regression tests**

Run: `npm.cmd test -- --run`

Expected: all project tests pass with zero failures.

- [ ] **Step 3: Run the production build and repository hygiene checks**

Run: `npm.cmd run build`

Run: `git diff --check`

Run: `git status -sb`

Expected: build exits 0, no whitespace errors, and no uncommitted files.

- [ ] **Step 4: Verify actual desktop document opening**

Generate HWPX and DOCX using the real `C:\Users\User\Downloads\세입세출결산총괄표.xlsx` values. Open HWPX in `C:\Program Files (x86)\Hnc\Office 2022\HOffice120\Bin\Hwp.exe` and DOCX in an installed compatible editor. Confirm both are editable and show school name `서울옥정초등학교`, income `2,724,818,217`, expense `2,698,568,069`, and surplus `26,250,148` without a repair warning.

- [ ] **Step 5: Push the feature branch and wait for Preview READY**

Run: `git push`

Use the existing Vercel project `school-budget-portal` and verify the deployment target is Preview (`target: null`/Preview), never Production. Confirm the Preview URL returns HTTP 200.

- [ ] **Step 6: User acceptance checklist**

Ask the user to upload both a real `.xls` and `.xlsx`, then download HWPX, DOCX, and PDF. Record whether each file opens and whether displayed totals match. Do not merge or promote until the user explicitly approves.
