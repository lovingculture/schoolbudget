# Home Welcome Caption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the white speech-bubble styling from the homepage character caption and display only `환영합니다` as plain teal text.

**Architecture:** Keep the existing `figure` and `figcaption` structure so accessibility and positioning remain stable. Change only the caption copy and its isolated CSS presentation; all character assets, homepage navigation, and workflow components remain unchanged.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library.

## Global Constraints

- The visible caption text must be exactly `환영합니다`.
- Remove the caption's white background, box shadow, rounded bubble shape, and bubble padding.
- Keep the caption positioned near the character's upper-right area as bold teal text.
- Preserve the official character image, dimensions, aspect ratio, homepage layout, and all navigation behavior.
- Retain a usable caption position on narrow screens.
- Follow RED-GREEN-REFACTOR.

---

### Task 1: Replace the character speech bubble with plain welcome text

**Files:**
- Modify: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/home.css`

**Interfaces:**
- Consumes: the existing `.home-character` figure and `figcaption` presentation.
- Produces: a visible plain-text `figcaption` containing exactly `환영합니다`.

- [ ] **Step 1: Write the failing behavior test**

Add a homepage test that renders `HomePage`, verifies `환영합니다` is visible, verifies the former display-name sentence is absent, and checks the caption's computed presentation has transparent background, no box shadow, and zero padding.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- --run src/features/home/HomePage.test.tsx`

Expected: FAIL because the existing caption contains the display name and uses white bubble styling.

- [ ] **Step 3: Implement the minimal caption change**

In `HomePage.tsx`, replace the dynamic caption content with:

```tsx
<figcaption>환영합니다</figcaption>
```

In `home.css`, retain the absolute upper-right positioning but set the caption to a transparent background, no shadow, no radius, and no padding. Use the existing portal teal family and bold type without changing the character image rules.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm.cmd test -- --run src/features/home/HomePage.test.tsx src/App.test.tsx`

Expected: all focused tests PASS.

- [ ] **Step 5: Run full regression and build verification**

Run: `npm.cmd test -- --run --testTimeout=10000`

Expected: all test files PASS.

Run: `npm.cmd run build`

Expected: TypeScript and Vite build PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add src/features/home/HomePage.test.tsx src/features/home/HomePage.tsx src/features/home/home.css
git commit -m "fix: simplify homepage welcome caption"
```
