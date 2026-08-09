# Homepage Character Artwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the official hero artwork's embedded `환영해!!` greeting, remove the separate speech bubble, and replace four work-card text marks with the approved official character poses.

**Architecture:** Continue using the existing hero PNG without adding a separate caption. Add four isolated transparent character assets under `public/characters/cards/`, then map them declaratively to the four existing work cards without changing their navigation callbacks or surrounding card layout.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Poppler image rendering and lossless PNG processing.

## Global Constraints

- The home hero must use the official image containing the embedded text `환영해!!` exactly as supplied.
- Remove the separate `figcaption`, white speech bubble, shadow, rounded shape, and dynamic display-name message.
- Never redraw, generate, stretch, rotate, recolor, or modify the embedded lettering of official artwork.
- Map the card images exactly: 성립전예산 → writing 자라나; 본예산 → `Good!` 자라나; 안건설명서 → calm 열리미; 결산 설명서 → musical 열리미.
- Remove only edge-connected white canvas when producing transparency; preserve enclosed whites, outlines, colors, lettering, and aspect ratio.
- The text marks `₩`, `本`, `案`, and `決` must no longer render in the four cards.
- Keep card size, card copy, tags, navigation callbacks, hero image dimensions, and all existing workflows unchanged.
- Use `object-fit: contain` and responsive dimensions so artwork is not cropped or distorted.
- Follow RED-GREEN-REFACTOR for user-visible behavior.

---

### Task 1: Produce the four approved transparent card assets

**Files:**
- Create: `public/characters/cards/prebudget-writing.png`
- Create: `public/characters/cards/main-budget-good.png`
- Create: `public/characters/cards/budget-agenda-calm.png`
- Create: `public/characters/cards/closing-musical.png`

**Interfaces:**
- Consumes: official source `C:/Users/User/Desktop/디자인/character_design (1).ai`, official manual `C:/Users/User/Desktop/디자인/서을특별시 교육청 캐릭터 매뉴얼 가이드.pdf`, and pose references:
  - `C:/Users/User/AppData/Local/Temp/codex-clipboard-3a438df1-31b6-4b50-8300-b3e95a3c90eb.png`
  - `C:/Users/User/AppData/Local/Temp/codex-clipboard-ef0709e0-500e-47bd-94b1-6d2129e8e525.png`
  - `C:/Users/User/AppData/Local/Temp/codex-clipboard-b11a07e8-6cd6-407b-9973-fda6728ea619.png`
  - `C:/Users/User/AppData/Local/Temp/codex-clipboard-7653696e-9abf-45ca-a127-448996203cb8.png`
- Produces: four RGBA PNG files with tightly cropped transparent outer canvases and unchanged character pixels.

- [ ] **Step 1: Locate exact poses in the official source**

Render a low-resolution contact sheet of every page in the PDF-compatible AI source and compare each pose to the four supplied references. Record the four matching page numbers in the implementation report.

- [ ] **Step 2: Render and crop losslessly**

Render each matching source page at 144 dpi. Convert only near-white pixels connected to the outer canvas edge to alpha with four-neighbour flood fill, crop to the non-transparent bounding box, and add 16–24 transparent pixels of padding. Do not resize the character content.

- [ ] **Step 3: Verify asset integrity**

For each PNG, record dimensions, RGBA mode, non-empty alpha range, and aspect ratio. Compare the visible opaque pixels against the matching source render and visually inspect outlines, internal whites, facial features, text, and colors.

- [ ] **Step 4: Commit assets**

Run:

```powershell
git add public/characters/cards
git commit -m "feat: add homepage card character assets"
```

---

### Task 2: Remove the speech bubble and render character card icons

**Files:**
- Modify: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/home.css`

**Interfaces:**
- Consumes: the four PNG paths from Task 1 and the existing `/characters/seoul-education-characters.png` hero image.
- Produces: hero artwork with no separate caption and four work cards with accessible character images.

- [ ] **Step 1: Write failing homepage behavior tests**

Add tests that assert the hero figure has the official `환영해!!` artwork image but no `figcaption`, the previous display-name sentence is absent, and the four work cards render the exact four new image paths with descriptive Korean `alt` text. Assert that `₩`, `本`, `案`, and `決` are absent from the card icon containers while the existing card buttons still navigate to their original views.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- --run src/features/home/HomePage.test.tsx src/App.test.tsx`

Expected: FAIL because the separate speech bubble and text marks still exist and the four character assets are not rendered.

- [ ] **Step 3: Implement the minimal UI change**

Remove the hero `figcaption` markup and its CSS block. Extend the existing work-card data with `imageSrc` and `imageAlt`, replace the text-mark element with an `<img>`, and size it using `object-fit: contain`. Do not change card click handlers, titles, descriptions, tags, or section ordering.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm.cmd test -- --run src/features/home/HomePage.test.tsx src/App.test.tsx`

Expected: all focused tests PASS.

- [ ] **Step 5: Run full regression and build verification**

Run: `npm.cmd test -- --run --testTimeout=10000`

Expected: all test files PASS.

Run: `npm.cmd run build`

Expected: TypeScript and Vite build PASS.

- [ ] **Step 6: Commit UI changes**

Run:

```powershell
git add src/features/home/HomePage.test.tsx src/features/home/HomePage.tsx src/features/home/home.css
git commit -m "feat: use characters across homepage cards"
```
