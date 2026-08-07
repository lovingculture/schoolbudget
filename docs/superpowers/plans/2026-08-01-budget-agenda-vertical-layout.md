# Budget Agenda Vertical Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display the budget agenda editor above the A4 preview at every desktop width, matching the closing agenda's vertical flow.

**Architecture:** Preserve the existing React component order and data flow. Change only the workspace layout contract and its regression coverage so the editor and preview remain a single-column stack regardless of viewport width.

**Tech Stack:** React, TypeScript, CSS, Vitest, React Testing Library, Vite

## Global Constraints

- Preserve workbook parsing, editing, validation, document preview, and download behavior.
- Keep the editor before the preview in DOM and visual order.
- Use a single-column workspace at all viewport widths.
- Keep the A4 preview centered within its full-width preview container.

---

### Task 1: Protect and implement the vertical workspace layout

**Files:**
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.test.tsx`
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.tsx`
- Modify: `src/features/budgetAgenda/budgetAgenda.css`

**Interfaces:**
- Consumes: `BudgetAgendaPage`, `BudgetAgendaEditor`, `BudgetAgendaPreview`
- Produces: `.budget-agenda-workspace.budget-agenda-workspace-vertical` layout contract

- [ ] **Step 1: Write the failing regression test**

Add a page test that loads a valid workbook and asserts the rendered workspace has the `budget-agenda-workspace-vertical` class, with the editor preceding the preview.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx`

Expected: FAIL because the vertical layout class is absent.

- [ ] **Step 3: Implement the minimal layout change**

Add the vertical class to the workspace and define it as `display:grid; grid-template-columns:minmax(0,1fr)`. Remove the obsolete desktop two-column declaration and 1500px column switch. Center the preview pages inside the full-width preview container.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx src/features/budgetAgenda/BudgetAgendaEditor.test.tsx src/features/budgetAgenda/BudgetAgendaPreview.test.tsx`

Expected: all selected tests pass.

- [ ] **Step 5: Verify the complete build**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 6: Deploy and inspect Vercel Preview**

Deploy the current source to the existing `school-budget-portal` project with target `preview`, poll until `READY`, and provide the protected share URL.

