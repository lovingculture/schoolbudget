# Unified Portal Workspace UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved home-page navy, mint, and sky visual system consistently to every interactive portal workspace without changing workflows, calculations, uploaded-file handling, downloads, or A4 document layouts.

**Architecture:** Add one scoped workspace stylesheet and attach a `portal-workspace` class only to interactive screen roots. Each feature keeps its current component structure and feature CSS; the shared stylesheet supplies the common page shell, cards, controls, tabs, and status treatments. Export/A4 areas are explicitly excluded so HWPX, Word, PDF, and print previews remain unchanged.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + Testing Library, existing CSS stylesheets, Lucide icons.

## Global Constraints

- Preserve all existing routes, calculation logic, browser storage, upload parsing, validation rules, and download file contents.
- Do not alter generated HWPX, Word, PDF, XLSX, or print/A4 document markup and styling.
- Use the home palette: navy `#14334e`, blue `#188bc1`, teal `#1596a3`, white surfaces, pale mint/sky support surfaces, and coral only for warnings/errors.
- Scope new rules under `.portal-workspace`; do not replace global legacy selectors wholesale.
- Keep PC-first layout while maintaining a usable 390px narrow-screen layout, visible focus rings, and no horizontal overflow.
- Use 15–16px body/control text, at least 44px control height, 16–20px rounded interactive cards, and text labels alongside every status colour.
- Never deploy to Production in this task. Preview deployment happens only after the user requests it.

---

## File Structure

- Create: `src/features/portal/portalWorkspace.css` — scoped shared visual tokens and component treatments for interactive portal screens.
- Create: `src/features/portal/portalWorkspace.test.tsx` — CSS contract test for required scope, colours, accessible focus, mobile breakpoint, and A4 exclusions.
- Modify: `src/App.tsx` — import the shared stylesheet once; do not alter view selection or navigation callbacks.
- Modify: `src/features/guidelines/GuidelinesPage.tsx`, `src/features/resources/ResourcesPage.tsx`, `src/features/videos/VideoGuidePage.tsx` — mark their interactive roots with `portal-workspace`.
- Modify: `src/features/prebudget/PrebudgetPage.tsx`, `src/features/mainBudget/MainBudgetPage.tsx`, `src/features/supplementary/SupplementaryPage.tsx` — mark their interactive roots with `portal-workspace` while keeping generated paper areas untouched.
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.tsx`, `src/features/closing/ClosingPage.tsx` — mark upload/editor/workspace roots with `portal-workspace`, never the document preview pages.
- Modify: existing feature tests only where they need to assert the root class and protect excluded print markup.

## Task 1: Add the scoped shared workspace foundation

**Files:**
- Create: `src/features/portal/portalWorkspace.css`
- Create: `src/features/portal/portalWorkspace.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: existing roots with `content`, `page-title`, `primary`, `secondary`, `form-card`, and feature-specific card classes.
- Produces: the opt-in `portal-workspace` CSS contract. Later tasks only add that class to a feature root; no component API changes.

- [ ] **Step 1: Write the failing stylesheet contract test**

```tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve("src/features/portal/portalWorkspace.css"), "utf8");

describe("portal workspace visual contract", () => {
  it("scopes the home palette and controls to portal workspaces", () => {
    expect(css).toContain(".portal-workspace");
    expect(css).toContain("#14334e");
    expect(css).toContain("#188bc1");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain(":focus-visible");
  });

  it("keeps generated A4 document surfaces out of shared overrides", () => {
    expect(css).toContain(".prebudget-paper");
    expect(css).toContain(".closing-a4-page");
    expect(css).toContain(".budget-agenda-a4-page");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm.cmd test -- --run src/features/portal/portalWorkspace.test.tsx`

Expected: FAIL because `portalWorkspace.css` does not exist.

- [ ] **Step 3: Create the minimal scoped CSS foundation and import it once**

```css
/* src/features/portal/portalWorkspace.css */
.portal-workspace {
  --workspace-navy: #14334e;
  --workspace-blue: #188bc1;
  --workspace-teal: #1596a3;
  --workspace-sky: #eef8fc;
  --workspace-mint: #effaf7;
  --workspace-border: #d8e5eb;
  color: var(--workspace-navy);
}

.portal-workspace .page-title h1 { color: var(--workspace-navy); letter-spacing: -0.04em; }
.portal-workspace .page-title > span { color: var(--workspace-teal); font-weight: 800; }
.portal-workspace .form-card,
.portal-workspace .guideline-document-card,
.portal-workspace .resource-card,
.portal-workspace .video-guide-card { border: 1px solid var(--workspace-border); border-radius: 20px; box-shadow: 0 12px 32px rgb(20 51 78 / 6%); }
.portal-workspace button,
.portal-workspace input,
.portal-workspace select,
.portal-workspace textarea { min-height: 44px; font-size: 16px; }
.portal-workspace .primary { background: linear-gradient(135deg, var(--workspace-blue), var(--workspace-teal)); }
.portal-workspace :focus-visible { outline: 3px solid rgb(24 139 193 / 42%); outline-offset: 3px; }

/* Do not target .prebudget-paper, .closing-a4-page, or .budget-agenda-a4-page. */
@media (max-width: 760px) { .portal-workspace { padding-inline: 18px; } }
```

Import it in `src/App.tsx` beside the existing stylesheet imports:

```ts
import "./features/portal/portalWorkspace.css";
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm.cmd test -- --run src/features/portal/portalWorkspace.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the foundation**

```bash
git add src/App.tsx src/features/portal/portalWorkspace.css src/features/portal/portalWorkspace.test.tsx
git commit -m "style: add shared portal workspace foundation"
```

## Task 2: Apply the visual system to guidance, resources, and videos

**Files:**
- Modify: `src/features/guidelines/GuidelinesPage.tsx`
- Modify: `src/features/guidelines/GuidelinesPage.test.tsx`
- Modify: `src/features/resources/ResourcesPage.tsx`
- Modify: `src/features/resources/ResourcesPage.test.tsx`
- Modify: `src/features/videos/VideoGuidePage.tsx`
- Modify: `src/features/videos/VideoGuidePage.test.tsx`
- Modify: `src/features/portal/portalWorkspace.css`

**Interfaces:**
- Consumes: Task 1 `.portal-workspace` CSS contract.
- Produces: visually unified informational pages without changing PDF search, downloads, resource links, or video filtering.

- [ ] **Step 1: Add failing root-class tests**

```tsx
expect(screen.getByRole("heading", { name: /학교예산 지침/i }).closest(".portal-workspace")).not.toBeNull();
expect(screen.getByRole("heading", { name: /자료실/i }).closest(".portal-workspace")).not.toBeNull();
expect(screen.getByRole("heading", { name: /동영상 안내/i }).closest(".portal-workspace")).not.toBeNull();
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npm.cmd test -- --run src/features/guidelines/GuidelinesPage.test.tsx src/features/resources/ResourcesPage.test.tsx src/features/videos/VideoGuidePage.test.tsx`

Expected: FAIL because the roots do not yet include `portal-workspace`.

- [ ] **Step 3: Add only the opt-in root class and scoped support treatments**

Change each outer root from the existing pattern to preserve all existing classes:

```tsx
<div className="content guideline-page portal-workspace">
<div className="content resources-page portal-workspace">
<div className="content video-guide-page portal-workspace">
```

Add scoped CSS for `.guideline-search`, `.guideline-preview-heading`, `.resource-card-actions`, `.video-guide-toolbar`, and empty states using the shared sky/mint surfaces. Do not change click handlers, PDF page selection, resource download functions, or video filter state.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm.cmd test -- --run src/features/guidelines/GuidelinesPage.test.tsx src/features/resources/ResourcesPage.test.tsx src/features/videos/VideoGuidePage.test.tsx`

Expected: PASS with existing search, download, and filtering assertions retained.

- [ ] **Step 5: Commit the informational-page styling**

```bash
git add src/features/guidelines src/features/resources src/features/videos src/features/portal/portalWorkspace.css
git commit -m "style: unify guidance and resource workspace UI"
```

## Task 3: Apply the visual system to editable budget workflows

**Files:**
- Modify: `src/features/prebudget/PrebudgetPage.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.examples.test.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.typography.test.tsx`
- Modify: `src/features/mainBudget/MainBudgetPage.tsx`
- Modify: `src/features/mainBudget/MainBudgetPage.test.tsx`
- Modify: `src/features/supplementary/SupplementaryPage.tsx`
- Modify: `src/features/supplementary/SupplementaryPage.test.tsx`
- Modify: `src/features/portal/portalWorkspace.css`

**Interfaces:**
- Consumes: Task 1 palette/classes.
- Produces: unified forms, upload cards, tabs, KPI cards, tables, and status messages while retaining calculations and temporary storage.

- [ ] **Step 1: Add failing behavior-preservation/root tests**

```tsx
expect(screen.getByRole("heading", { name: /성립전예산 요구서 작성/i }).closest(".portal-workspace")).not.toBeNull();
expect(screen.getByRole("heading", { name: /본예산 편성·검토/i }).closest(".portal-workspace")).not.toBeNull();
expect(screen.getByRole("heading", { name: /집행실적으로 추경자료 만들기/i }).closest(".portal-workspace")).not.toBeNull();
expect(document.querySelector(".prebudget-paper")?.classList.contains("portal-workspace")).toBe(false);
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/PrebudgetPage.typography.test.tsx src/features/mainBudget/MainBudgetPage.test.tsx src/features/supplementary/SupplementaryPage.test.tsx`

Expected: FAIL only on the new root/exclusion assertions; existing amount, example, upload, and export tests remain green.

- [ ] **Step 3: Add root classes and shared scoped workflow styling**

Use these root forms:

```tsx
<div className="content prebudget-page portal-workspace">
<div className="content main-budget-page portal-workspace">
<div className="content supplementary-page portal-workspace">
```

For Prebudget guide and example branches use `<div className="content portal-workspace">` so the selection flow is also styled. In `portalWorkspace.css`, style `.steps`, `.main-budget-tabs`, `.supplementary-tabs`, `.supplementary-kpis`, `.supplementary-source`, `.main-budget-summary`, `.closing-error`, and `.prebudget-errors` under `.portal-workspace`. Keep `.prebudget-paper` outside all shared selectors and do not alter `calculateRequestedAmount`, storage, example application, or export functions.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm.cmd test -- --run src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/PrebudgetPage.typography.test.tsx src/features/mainBudget/MainBudgetPage.test.tsx src/features/supplementary/SupplementaryPage.test.tsx`

Expected: PASS, including amount changes updating totals and existing temporary-storage/export behavior.

- [ ] **Step 5: Commit editable-workflow styling**

```bash
git add src/features/prebudget src/features/mainBudget src/features/supplementary src/features/portal/portalWorkspace.css
git commit -m "style: unify budget workflow workspace UI"
```

## Task 4: Apply the visual system to agenda and closing workspaces without changing A4 previews

**Files:**
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.tsx`
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.test.tsx`
- Modify: `src/features/closing/ClosingPage.tsx`
- Modify: `src/features/closing/ClosingPage.test.tsx`
- Modify: `src/features/portal/portalWorkspace.css`

**Interfaces:**
- Consumes: Task 1 shared styling and existing agenda/closing upload/preview components.
- Produces: unified upload, validation, source-summary, and download controls with unchanged generated document markup.

- [ ] **Step 1: Add failing root and preview-exclusion tests**

```tsx
expect(screen.getByRole("heading", { name: /안건설명서/i }).closest(".portal-workspace")).not.toBeNull();
expect(screen.getByRole("heading", { name: /결산 안건설명서 자동작성/i }).closest(".portal-workspace")).not.toBeNull();
expect(document.querySelector(".budget-agenda-a4-page")?.classList.contains("portal-workspace")).toBe(false);
expect(document.querySelector(".closing-a4-page")?.classList.contains("portal-workspace")).toBe(false);
```

- [ ] **Step 2: Run focused tests to verify they fail**

Run: `npm.cmd test -- --run src/features/budgetAgenda/BudgetAgendaPage.test.tsx src/features/closing/ClosingPage.test.tsx`

Expected: FAIL only on newly added workspace/exclusion checks.

- [ ] **Step 3: Apply classes to outer screen roots and style only non-document surfaces**

```tsx
<div className="content budget-agenda-page portal-workspace">
<div className="content closing-page portal-workspace">
```

Add scoped styles for `.budget-agenda-guide`, `.budget-agenda-upload`, `.budget-agenda-validation`, `.closing-dropzone`, `.closing-source-summary`, `.closing-money-grid`, `.closing-validation`, and `.closing-privacy`. Do not add `portal-workspace` to preview components, do not target `.budget-agenda-a4-page` or `.closing-a4-page`, and do not change download/export functions.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `npm.cmd test -- --run src/features/budgetAgenda/BudgetAgendaPage.test.tsx src/features/closing/ClosingPage.test.tsx`

Expected: PASS with existing XLS/XLSX handling, validation, and preview assertions intact.

- [ ] **Step 5: Commit agenda and closing styling**

```bash
git add src/features/budgetAgenda src/features/closing src/features/portal/portalWorkspace.css
git commit -m "style: unify agenda and closing workspace UI"
```

## Task 5: Verify responsive UI and regressions before handoff

**Files:**
- Modify only if verification exposes a reproducible defect: `src/features/portal/portalWorkspace.css` and the smallest affected feature test.

**Interfaces:**
- Consumes: all four prior tasks.
- Produces: verified Preview-ready workspace styling; no deployment action.

- [ ] **Step 1: Add a failing responsive CSS contract only if a requirement is not represented**

```tsx
it("keeps portal controls touch-safe on narrow screens", () => {
  expect(css).toMatch(/@media \(max-width: 760px\)/);
  expect(css).toContain("min-height: 44px");
});
```

- [ ] **Step 2: Run the complete automated suite**

Run: `npm.cmd test -- --run --testTimeout=10000`

Expected: PASS for all existing and new tests.

- [ ] **Step 3: Build the production bundle**

Run: `npm.cmd run build`

Expected: PASS. Record any existing Vite chunk-size warning separately from a build failure.

- [ ] **Step 4: Perform browser verification at desktop and narrow widths**

Open the local Vite app and inspect the seven target screens at 1440px and 390px. Confirm:

```text
학교예산 지침: PDF search and page movement remain usable.
성립전예산: examples, amount changes, total, and preview remain usable.
본예산: tabs, uploads, review/download controls remain usable.
안건설명서·결산설명서: upload and validation are unified; A4 preview is unchanged.
추경자료: KPI, tabs, table/search, and download remain usable.
자료실·동영상: cards, downloads, search, and filters remain usable.
```

Check browser console for errors, tab through a primary button/input, and confirm no horizontal scrollbar at 390px.

- [ ] **Step 5: Commit any final minimal verification fix**

```bash
git add src/features/portal/portalWorkspace.css src/features/portal/portalWorkspace.test.tsx
git commit -m "fix: polish responsive portal workspace UI"
```

Only make this commit if Task 5 made a code or test change; otherwise leave the preceding commits unchanged.

## Self-Review

- Spec coverage: Task 1 provides the approved token system, cards, controls, badges/focus, and mobile baseline. Task 2 covers 지침·자료실·동영상. Task 3 covers 성립전·본예산·추경. Task 4 covers 안건설명서·결산설명서. Task 5 checks all target screens and avoids deployment.
- Exclusions: Tasks 1, 3, and 4 explicitly preserve `.prebudget-paper`, `.closing-a4-page`, and `.budget-agenda-a4-page`; no export logic is touched.
- Placeholder scan: no TBD/TODO/“similar to” implementation instructions used. Each task contains file paths, exact test commands, expected result, code direction, and commit command.
- Interface consistency: every later task consumes only the `portal-workspace` CSS class produced by Task 1; there are no new React props or data types to drift.
