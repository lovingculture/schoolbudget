# School Budget Portal Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portal-wide left sidebar with a consistent horizontal navigation shell and recreate the approved character-led homepage without changing any existing budget workflows.

**Architecture:** Keep the current single-page `View` state and feature pages intact, but extract navigation metadata and add a reusable top header that drives the same view transitions. Build the homepage and informational pages as presentational React components, while reusing the existing `setView` navigation boundary so uploaded data, storage keys, calculations, and exporters remain untouched.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, Lucide React, CSS.

## Global Constraints

- Preserve all existing 성립전예산, 본예산, 추경, 안건설명서, 결산, upload, validation, storage, and HWPX/Word/PDF behavior.
- Use a site-wide horizontal header with `홈`, `학교예산 지침`, `예산 업무`, `자료실`, `동영상 안내`, and `통합검색`.
- `예산 업무` must expose every existing work page and route through the existing in-memory `View` navigation.
- Match the approved screenshots: white header, pale mint hero, left-aligned headline/actions, education-office characters on the right, quick-service strip, work cards, news/resources, and search.
- Use the supplied Seoul Metropolitan Office of Education character artwork in accordance with the supplied character manual; do not redraw or distort it.
- Initial video support is a public guide/list structure with category and title search and a clear empty state; no backend/admin upload system is added in this phase.
- Optimize the desktop administrative-office experience first while retaining a usable collapsed mobile navigation.
- Do not deploy or promote to Production; Preview deployment only after verification.
- Follow RED-GREEN-REFACTOR for every behavior change.

---

### Task 1: Portal-wide horizontal navigation shell

**Files:**
- Create: `src/components/PortalHeader.tsx`
- Create: `src/components/PortalHeader.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: existing `View` values and `setView(view)` behavior from `App.tsx`.
- Produces: `PortalHeader({ activeView, onNavigate, schoolName, displayName, onLogout })` and new `resources`/`videos` view values.

- [ ] **Step 1: Write failing navigation tests**

Add tests that render the real portal/header, assert the six top-level navigation controls, open `예산 업무`, select each existing workflow, and verify its real page heading becomes visible. Add a mobile test that opens and closes the collapsed menu.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd test -- --run src/components/PortalHeader.test.tsx src/App.test.tsx`
Expected: FAIL because `PortalHeader` and the approved top-level controls do not exist.

- [ ] **Step 3: Implement the minimal shell**

Create a semantic header/nav with an accessible work-menu toggle, active-state indication, mobile toggle, logo button returning home, and callbacks into `setView`. Replace the sidebar markup in `Portal` while leaving every existing feature component and its props unchanged.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm.cmd test -- --run src/components/PortalHeader.test.tsx src/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/PortalHeader.tsx src/components/PortalHeader.test.tsx src/App.tsx src/App.test.tsx src/styles.css && git commit -m "feat: add portal-wide top navigation"`

---

### Task 2: Approved homepage and official character asset

**Files:**
- Create: `src/features/home/HomePage.tsx`
- Create: `src/features/home/HomePage.test.tsx`
- Create: `src/features/home/home.css`
- Create: `public/characters/seoul-education-characters.png`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `onNavigate(view)` from `Portal`, the existing school/display names, and official source artwork `C:/Users/User/Desktop/디자인/character_design (1).ai`.
- Produces: `HomePage({ onNavigate })` with buttons/cards mapped to existing `View` values.

- [ ] **Step 1: Produce the web character asset without altering proportions**

Extract a transparent or white-background raster rendition from the PDF-compatible AI source at sufficient resolution for the hero. Visually compare it with the supplied manual and screenshots; crop only surrounding canvas and never stretch the character.

- [ ] **Step 2: Write failing homepage behavior tests**

Test the approved headline, `업무 시작하기`, `예산 지침 보기`, five work cards, quick-service links, news/resource cards, search form, and that clicking every actionable card reaches the corresponding real portal page.

- [ ] **Step 3: Run tests to verify RED**

Run: `npm.cmd test -- --run src/features/home/HomePage.test.tsx src/App.test.tsx`
Expected: FAIL because the approved home component and navigation mappings are absent.

- [ ] **Step 4: Implement the approved home layout**

Build the screenshot-matched sections using semantic headings and buttons. Use the official character image with `object-fit: contain`, stable dimensions, descriptive alt text, and a pale mint hero background. Keep copy grounded in current implemented features and do not advertise unavailable exports or workflows.

- [ ] **Step 5: Run focused tests and visually inspect**

Run: `npm.cmd test -- --run src/features/home/HomePage.test.tsx src/App.test.tsx`
Expected: PASS. Then run the Vite dev server and inspect desktop and narrow layouts for overflow, character distortion, keyboard focus, and menu accessibility.

- [ ] **Step 6: Commit**

Run: `git add src/features/home src/App.tsx public/characters/seoul-education-characters.png && git commit -m "feat: redesign portal homepage"`

---

### Task 3: Resources, video guide, responsive polish, and regression verification

**Files:**
- Create: `src/features/resources/ResourcesPage.tsx`
- Create: `src/features/resources/ResourcesPage.test.tsx`
- Create: `src/features/videos/VideoGuidePage.tsx`
- Create: `src/features/videos/VideoGuidePage.test.tsx`
- Create: `src/features/videos/videoGuide.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: new `resources` and `videos` view values from Task 1 and the existing guideline/template downloads.
- Produces: searchable resource cards and `filterVideoGuides(query, category)` for a future in-code video catalog, with a usable empty state today.

- [ ] **Step 1: Write failing resource and video tests**

Test that the resources page links to the existing guideline PDF and expenditure templates, and that the video page renders category controls, title search, and a clear no-video/empty-result message. Unit-test `filterVideoGuides` with literal fixtures for category and case-insensitive title matching.

- [ ] **Step 2: Run tests to verify RED**

Run: `npm.cmd test -- --run src/features/resources/ResourcesPage.test.tsx src/features/videos/VideoGuidePage.test.tsx`
Expected: FAIL because the pages and filter do not exist.

- [ ] **Step 3: Implement resources and video guide**

Build both pages without a backend. Reuse existing browser-local downloads and guideline navigation. Keep the video catalog as a typed array so real thumbnail/video URLs can be added later without changing the page contract.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `npm.cmd test -- --run src/features/resources/ResourcesPage.test.tsx src/features/videos/VideoGuidePage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run full regression verification**

Run: `npm.cmd run test:run`
Expected: all tests PASS.

Run: `npm.cmd run build`
Expected: TypeScript and Vite build PASS without errors.

Use browser verification to check the home, every work-menu destination, resources, videos, desktop layout, mobile menu, and browser console.

- [ ] **Step 6: Commit**

Run: `git add src/features/resources src/features/videos src/App.tsx src/styles.css && git commit -m "feat: add resources and video guide pages"`

