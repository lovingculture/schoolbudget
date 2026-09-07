# Budget Webtoon and Q&A Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a six-episode budget webtoon with episode detail navigation and a home-page link to the school-budget Q&A service.

**Architecture:** Store immutable episode metadata in a focused webtoon module, render list/detail states inside one `BudgetWebtoonPage`, and connect it through the portal's existing view navigation. Keep the Q&A card independent as a direct external link in the existing home news grid.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS, static PNG assets

**Spec:** `docs/superpowers/specs/2026-09-07-budget-webtoon-design.md`

## Global Constraints

- Preserve the existing portal colors, rounded-card styling, header behavior, and mobile navigation.
- Use the six supplied PNG files without editing, regenerating, or changing their aspect ratios.
- Open the Q&A URL in a new browser tab with safe external-link attributes.
- Keep the webtoon list usable by keyboard and touch.
- On mobile, use a one-column list and reduce detail-page side margins so comic text remains readable.
- Commit only project files; do not add `.superpowers/brainstorm/` or `.tmp-spreadsheet-analysis/`.

---

### Task 1: Webtoon catalog, assets, and list/detail page

**Files:**
- Create: `public/webtoons/budget/episode-1.png`
- Create: `public/webtoons/budget/episode-2.png`
- Create: `public/webtoons/budget/episode-3.png`
- Create: `public/webtoons/budget/episode-4.png`
- Create: `public/webtoons/budget/episode-5.png`
- Create: `public/webtoons/budget/episode-6.png`
- Create: `src/features/webtoon/budgetWebtoons.ts`
- Create: `src/features/webtoon/BudgetWebtoonPage.tsx`
- Create: `src/features/webtoon/BudgetWebtoonPage.test.tsx`
- Create: `src/features/webtoon/budgetWebtoon.css`

**Interfaces:**
- Produces: `BudgetWebtoon { episode: number; title: string; imageSrc: string }`
- Produces: `budgetWebtoons: readonly BudgetWebtoon[]`
- Produces: `BudgetWebtoonPage(): JSX.Element`
- Consumes: source PNG files `C:/Users/User/Desktop/예산만화/1화.png` through `6화.png`

- [ ] **Step 1: Write failing component tests**

```tsx
it("1화부터 6화까지 순서대로 보여주고 선택한 회차를 연다", async () => {
  const user = userEvent.setup();
  render(<BudgetWebtoonPage />);
  expect(screen.getAllByRole("button", { name: /화 .* 읽어보기/ })).toHaveLength(6);
  await user.click(screen.getByRole("button", { name: "3화 성립전예산, 언제 어떻게 편성할까? 읽어보기" }));
  expect(screen.getByRole("img", { name: "3화 성립전예산, 언제 어떻게 편성할까?" })).toHaveAttribute("src", "/webtoons/budget/episode-3.png");
});

it("상세페이지에서 이전 화·다음 화·목록 이동을 제공한다", async () => {
  const user = userEvent.setup();
  render(<BudgetWebtoonPage />);
  await user.click(screen.getByRole("button", { name: /3화 .* 읽어보기/ }));
  await user.click(screen.getByRole("button", { name: "다음 화 4화" }));
  expect(screen.getByRole("heading", { name: "성립전예산, 어떻게 편성하지?" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "웹툰 목록으로" }));
  expect(screen.getByRole("heading", { name: "예산 웹툰" })).toBeVisible();
});
```

- [ ] **Step 2: Run the new test and confirm the missing component failure**

Run: `npm test -- --run src/features/webtoon/BudgetWebtoonPage.test.tsx`

Expected: FAIL because `BudgetWebtoonPage` does not exist.

- [ ] **Step 3: Copy the six approved originals into public assets**

```powershell
New-Item -ItemType Directory -Force -Path public/webtoons/budget
Copy-Item -LiteralPath 'C:/Users/User/Desktop/예산만화/1화.png' -Destination public/webtoons/budget/episode-1.png
Copy-Item -LiteralPath 'C:/Users/User/Desktop/예산만화/2화.png' -Destination public/webtoons/budget/episode-2.png
Copy-Item -LiteralPath 'C:/Users/User/Desktop/예산만화/3화.png' -Destination public/webtoons/budget/episode-3.png
Copy-Item -LiteralPath 'C:/Users/User/Desktop/예산만화/4화.png' -Destination public/webtoons/budget/episode-4.png
Copy-Item -LiteralPath 'C:/Users/User/Desktop/예산만화/5화.png' -Destination public/webtoons/budget/episode-5.png
Copy-Item -LiteralPath 'C:/Users/User/Desktop/예산만화/6화.png' -Destination public/webtoons/budget/episode-6.png
```

- [ ] **Step 4: Implement the catalog and page state**

```ts
export const budgetWebtoons = [
  { episode: 1, title: "학교예산, 왜 중요할까?", imageSrc: "/webtoons/budget/episode-1.png" },
  { episode: 2, title: "학교예산, 어떻게 편성될까?", imageSrc: "/webtoons/budget/episode-2.png" },
  { episode: 3, title: "성립전예산, 언제 어떻게 편성할까?", imageSrc: "/webtoons/budget/episode-3.png" },
  { episode: 4, title: "성립전예산, 어떻게 편성하지?", imageSrc: "/webtoons/budget/episode-4.png" },
  { episode: 5, title: "추가경정예산(추경)이란?", imageSrc: "/webtoons/budget/episode-5.png" },
  { episode: 6, title: "추경예산, 언제 어떻게 편성할까?", imageSrc: "/webtoons/budget/episode-6.png" },
] as const;
```

`BudgetWebtoonPage` starts with `selectedEpisode: number | null`, renders cards when null, and renders the matching episode plus boundary-aware previous/next buttons when selected. An invalid selection resets to the list.

- [ ] **Step 5: Add responsive styling**

Use a three-column grid above 900px, two columns between 600px and 900px, and one column below 600px. Detail images use `width: 100%; height: auto; max-width: 900px`, with mobile page padding reduced to `12px`.

- [ ] **Step 6: Run the focused test and confirm it passes**

Run: `npm test -- --run src/features/webtoon/BudgetWebtoonPage.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit the webtoon feature**

```bash
git add public/webtoons/budget src/features/webtoon
git commit -m "feat: add budget webtoon reader"
```

---

### Task 2: Portal navigation for the webtoon

**Files:**
- Modify: `src/components/PortalHeader.tsx`
- Modify: `src/components/PortalHeader.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `BudgetWebtoonPage` from Task 1
- Extends: `PortalHeaderView` with `"webtoon"`
- Produces: top-level `예산 웹툰` navigation button

- [ ] **Step 1: Write failing navigation tests**

```tsx
expect(screen.getByRole("button", { name: "예산 웹툰" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "예산 웹툰" }));
expect(onNavigate).toHaveBeenCalledWith("webtoon");
```

Add an app-level assertion that clicking the same button opens the `예산 웹툰` heading and six episode cards.

- [ ] **Step 2: Run navigation tests and confirm failure**

Run: `npm test -- --run src/components/PortalHeader.test.tsx src/App.test.tsx`

Expected: FAIL because the `webtoon` view and navigation button are absent.

- [ ] **Step 3: Add the header view and app rendering branch**

Add `"webtoon"` to `PortalHeaderView`, render a top-level button with a book/panels icon, import `BudgetWebtoonPage`, and render it for `view === "webtoon"`.

- [ ] **Step 4: Run navigation tests and confirm pass**

Run: `npm test -- --run src/components/PortalHeader.test.tsx src/App.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit navigation**

```bash
git add src/components/PortalHeader.tsx src/components/PortalHeader.test.tsx src/App.tsx src/App.test.tsx
git commit -m "feat: add budget webtoon navigation"
```

---

### Task 3: Home-page school-budget Q&A card

**Files:**
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/HomePage.test.tsx`
- Modify: `src/features/home/home.css`

**Interfaces:**
- Produces: external link with accessible name `학교예산 질의응답 질문하러 가기`
- Opens: `https://notebook.google.com/notebook/db7666d9-8e19-4d43-8f3e-b8f1345e7d08/preview`

- [ ] **Step 1: Write a failing home-card test**

```tsx
const link = screen.getByRole("link", { name: "학교예산 질의응답 질문하러 가기" });
expect(link).toHaveAttribute("href", "https://notebook.google.com/notebook/db7666d9-8e19-4d43-8f3e-b8f1345e7d08/preview");
expect(link).toHaveAttribute("target", "_blank");
expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
expect(screen.getByText("학교예산 업무와 관련해 궁금한 내용을 질문하고 답변을 확인해 보세요.")).toBeVisible();
```

- [ ] **Step 2: Run the home test and confirm failure**

Run: `npm test -- --run src/features/home/HomePage.test.tsx`

Expected: FAIL because the link is absent.

- [ ] **Step 3: Add the fourth news card**

Render an external `<a>` styled like existing card actions, labeled `질문하러 가기`, with `target="_blank"` and `rel="noreferrer"`. Keep the current grid responsive and allow four cards to wrap evenly.

- [ ] **Step 4: Run the home test and confirm pass**

Run: `npm test -- --run src/features/home/HomePage.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the Q&A card**

```bash
git add src/features/home/HomePage.tsx src/features/home/HomePage.test.tsx src/features/home/home.css
git commit -m "feat: add school budget Q&A card"
```

---

### Task 4: Full verification and publishing

**Files:**
- Verify only: all changed source, tests, and static assets

**Interfaces:**
- Produces: validated GitHub commit and a new public Sites version

- [ ] **Step 1: Run all automated tests**

Run: `npm test -- --run --maxWorkers=2`

Expected: all tests pass with the existing intentionally skipped actual-sample test unchanged.

- [ ] **Step 2: Build the production site**

Run: `npm run build`

Expected: exit code 0 and `dist/client/index.html` exists.

- [ ] **Step 3: Check source scope and asset presence**

Run: `git status --short`, `git diff --check`, and list `public/webtoons/budget`.

Expected: only intended changes, no whitespace errors, and six PNG assets.

- [ ] **Step 4: Push the validated branch to GitHub**

Run: `git push origin HEAD`

Expected: the current branch updates successfully.

- [ ] **Step 5: Publish through Sites**

Push the exact HEAD to the Sites source repository, package the validated static build with the Sites packaging helper, save the next version with the full HEAD SHA, deploy to the existing public audience, and wait for a succeeded status.

- [ ] **Step 6: Open the deployed version**

Append the exact version number returned by Sites as the `v` query value on `https://school-budget-hannune.ekego1102.chatgpt.site/`, open that URL in the existing Site tab, and report it.
