# School Budget Analysis Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive `학교별 예산 분석` tab that exposes the verified 2025 settlement analysis and all 1,653 Seoul schools from `lovingculture/sen-budget` without changing existing portal behavior.

**Architecture:** Keep the existing Vite React portal and port the reusable `sen-budget` domain calculations into a lazy-loaded feature module. Commit a small manifest plus one validated JSON file per school under `public/data/school-analysis`; fetch and cache only the selected school's file in the browser. Recreate the source analysis experience with the portal's existing visual language and use ECharts only inside the lazy feature chunk.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, ECharts 6, static JSON assets, CSS media queries

**Spec:** `docs/superpowers/specs/2026-09-11-school-budget-analysis-integration-design.md`

## Global Constraints

- Preserve every existing portal view and menu behavior, including `결산 설명서 만들기`.
- The new menu label is exactly `학교별 예산 분석`.
- Include exactly 1,653 verified 2025 school and kindergarten settlement records from `lovingculture/sen-budget`.
- Mobile and desktop expose the same schools and analysis content; only presentation changes.
- Never put all school datasets in a JavaScript bundle or fetch all datasets on initial load.
- Preserve original won amounts and public source URLs; formatting conversions are display-only.
- Do not publish or merge to `main` from this branch. Completion means tested code committed and pushed to `codex/integrate-school-analysis`.

## File Structure

- `scripts/import-school-analysis-data.mjs`: validate and convert the external repository's manifest, per-school datasets, and profile index into browser assets.
- `public/data/school-analysis/manifest.json`: compact searchable school index.
- `public/data/school-analysis/schools/*.json`: one validated settlement dataset per school, including only that school's linked profile.
- `src/features/schoolAnalysis/types.ts`: shared dataset, school, analysis-node, and loading-state types.
- `src/features/schoolAnalysis/data.ts`: manifest and selected-school fetch functions plus in-memory cache.
- `src/features/schoolAnalysis/calculations.ts`: framework-independent totals, hierarchy, rates, top-item, and school-scale calculations ported from `sen-budget`.
- `src/features/schoolAnalysis/SchoolAnalysisPage.tsx`: feature shell, school search, loading/error states, selected-school heading, and analysis tabs.
- `src/features/schoolAnalysis/SchoolAnalysisDashboard.tsx`: summary, income, expense, drill-down table, and chart composition.
- `src/features/schoolAnalysis/SchoolTreemap.tsx`: lazy ECharts treemap wrapper with an accessible tabular fallback.
- `src/features/schoolAnalysis/schoolAnalysis.css`: portal-matched desktop and mobile layout.
- `src/features/schoolAnalysis/*.test.ts(x)`: data, calculation, and interaction regression tests.
- `src/components/PortalHeader.tsx`, `src/App.tsx`, and their tests: menu registration and lazy view routing.

---

### Task 1: Produce validated per-school browser assets

**Files:**
- Create: `scripts/import-school-analysis-data.mjs`
- Create: `scripts/import-school-analysis-data.test.ts`
- Create: `public/data/school-analysis/manifest.json`
- Create: `public/data/school-analysis/schools/B*.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: a local checkout path whose `school-budget/data/fixtures/manifest.json`, `school-budget/data/fixtures/schools`, and `school-budget/data/school-profiles/school-profiles_2025.json` come from reviewed `lovingculture/sen-budget` commit `8f34e840c04b7f9285e81b78a32ec70f99213d6a`.
- Produces: `npm run import:school-analysis -- <sen-budget-root>` and JSON `SchoolManifestEntry[]` with `{ schoolName, schoolCode, fiscalYear, referenceMonth, file }`.

- [ ] **Step 1: Write the failing importer test**

Create a two-school temporary source fixture, run the importer, and assert validation, sorting, profile attachment, and one output file per school:

```ts
expect(manifest).toEqual([
  { schoolName: "가람초등학교", schoolCode: "B100000001", fiscalYear: 2025, referenceMonth: "202603", file: "B100000001_2025_202603.json" },
  { schoolName: "한빛중학교", schoolCode: "B100000002", fiscalYear: 2025, referenceMonth: "202603", file: "B100000002_2025_202603.json" },
]);
expect(first.schoolProfile.schoolCode).toBe("B100000001");
expect(first.summary.schoolCode).toBe("B100000001");
```

- [ ] **Step 2: Run the importer test to verify it fails**

Run: `npx vitest run scripts/import-school-analysis-data.test.ts`

Expected: FAIL because `importSchoolAnalysisData` does not exist.

- [ ] **Step 3: Implement strict import and validation**

Export this callable interface and keep the CLI as a thin wrapper:

```js
export async function importSchoolAnalysisData(sourceRoot, outputRoot) {
  const source = path.join(sourceRoot, "school-budget", "data");
  const manifest = JSON.parse(await readFile(path.join(source, "fixtures", "manifest.json"), "utf8"));
  if (manifest.length !== 1653 && process.env.NODE_ENV !== "test") {
    throw new Error(`학교 자료는 1,653건이어야 합니다: ${manifest.length}`);
  }
  // Reject duplicate schoolCode+fiscalYear+referenceMonth keys.
  // Read each referenced file, verify summary identity, attach the exact-code profile,
  // write one JSON file, then write a Korean-name-sorted compact manifest.
}
```

Add `"import:school-analysis": "node scripts/import-school-analysis-data.mjs"` to `package.json`. Run it against the reviewed checkout and assert the final manifest count with a separate postcondition.

- [ ] **Step 4: Run data verification**

Run:

```powershell
npm run import:school-analysis -- C:\Users\User\AppData\Local\Temp\sen-budget-review-20260911
node -e "const m=require('./public/data/school-analysis/manifest.json'); if(m.length!==1653) process.exit(1); console.log(m.length)"
npx vitest run scripts/import-school-analysis-data.test.ts
```

Expected: `1653`, then PASS.

- [ ] **Step 5: Commit the importer and generated assets**

```bash
git add package.json scripts/import-school-analysis-data.mjs scripts/import-school-analysis-data.test.ts public/data/school-analysis
git commit -m "Add validated school settlement data assets"
```

### Task 2: Port typed calculations and verify parity

**Files:**
- Create: `src/features/schoolAnalysis/types.ts`
- Create: `src/features/schoolAnalysis/calculations.ts`
- Create: `src/features/schoolAnalysis/calculations.test.ts`

**Interfaces:**
- Consumes: `BudgetDataset`, `IncomeRow`, and `ExpenseRow` shapes stored by Task 1.
- Produces: `getSummaryMetrics(dataset)`, `getIncomeStructure(rows, bundle)`, `getExpenseInsights(rows, bundle)`, `getRigidExpenseSummary(rows, bundle)`, `getIncomeLevel(rows, bundle, path)`, `getExpenseLevel(rows, bundle, path)`, and `getTopExpenseItems(rows, bundle, sortKey)`.

- [ ] **Step 1: Write parity tests from three source datasets**

Use 가락고등학교, 강동중학교, and 서울버들초등학교 fixtures. Assert exact won totals and representative hierarchy paths, then assert rates using `toBeCloseTo`:

```ts
const root = getExpenseLevel(dataset.expenseRows, 1, []);
expect(root.reduce((sum, row) => sum + row.settlementAmount, 0)).toBe(expectedExpenseTotal);
expect(getIncomeStructure(dataset.incomeRows, 1).incomeSettlementRate.rate)
  .toBeCloseTo(expectedRate, 6);
```

- [ ] **Step 2: Run the calculation test to verify it fails**

Run: `npx vitest run src/features/schoolAnalysis/calculations.test.ts`

Expected: FAIL because the calculation module is absent.

- [ ] **Step 3: Port framework-independent source logic**

Copy only the required logic from `sen-budget/school-budget/src/domain/budget/{calculations,filters,hierarchy,school-scale,treemap,format}.ts`. Remove `server-only`, Next.js, filesystem, and repository imports. Keep these stable types:

```ts
export type Won = number;
export interface SchoolManifestEntry { schoolName: string; schoolCode: string; fiscalYear: number; referenceMonth: string; file: string; }
export interface BudgetDataset { schoolProfile?: LinkedSchoolProfile | null; summary: BudgetSummary; incomeRows: IncomeRow[]; expenseRows: ExpenseRow[]; findings: string[]; collectedAt: string; }
export interface BudgetNode { id: string; name: string; path: string[]; hasChildren: boolean; currentBudget: Won; settlementAmount: Won; difference: Won; sourceDifference: Won; settlementRate: number | null; share: number | null; sourceUrl: string; sourceRowNumber: number; }
```

- [ ] **Step 4: Run parity tests**

Run: `npx vitest run src/features/schoolAnalysis/calculations.test.ts`

Expected: PASS for all three representative schools.

- [ ] **Step 5: Commit the domain port**

```bash
git add src/features/schoolAnalysis/types.ts src/features/schoolAnalysis/calculations.ts src/features/schoolAnalysis/calculations.test.ts
git commit -m "Port school settlement analysis calculations"
```

### Task 3: Add lazy data loading, cache, and failure isolation

**Files:**
- Create: `src/features/schoolAnalysis/data.ts`
- Create: `src/features/schoolAnalysis/data.test.ts`

**Interfaces:**
- Consumes: `SchoolManifestEntry` and `BudgetDataset` from Task 2.
- Produces: `loadSchoolManifest(fetcher = fetch): Promise<SchoolManifestEntry[]>`, `loadSchoolDataset(entry, fetcher = fetch): Promise<BudgetDataset>`, and `clearSchoolAnalysisCache(): void`.

- [ ] **Step 1: Write failing fetch and cache tests**

```ts
const first = await loadSchoolDataset(entry, fetcher);
const second = await loadSchoolDataset(entry, fetcher);
expect(first).toBe(second);
expect(fetcher).toHaveBeenCalledTimes(1);
```

Also verify a non-OK response throws `선택한 학교의 결산자료를 불러오지 못했습니다.` and does not poison the cache.

- [ ] **Step 2: Run the data tests to verify they fail**

Run: `npx vitest run src/features/schoolAnalysis/data.test.ts`

Expected: FAIL because the loader module is absent.

- [ ] **Step 3: Implement selected-file loading**

```ts
const datasetCache = new Map<string, Promise<BudgetDataset>>();
export async function loadSchoolDataset(entry: SchoolManifestEntry, fetcher = fetch) {
  const key = `${entry.schoolCode}:${entry.fiscalYear}:${entry.referenceMonth}`;
  if (!datasetCache.has(key)) {
    datasetCache.set(key, fetcher(`/data/school-analysis/schools/${encodeURIComponent(entry.file)}`)
      .then(assertOk)
      .then(response => response.json())
      .catch(error => { datasetCache.delete(key); throw error; }));
  }
  return datasetCache.get(key)!;
}
```

Manifest loading uses the same retry-safe pattern but a separate cache.

- [ ] **Step 4: Run loader tests**

Run: `npx vitest run src/features/schoolAnalysis/data.test.ts`

Expected: PASS with one dataset request across repeated selection.

- [ ] **Step 5: Commit the loaders**

```bash
git add src/features/schoolAnalysis/data.ts src/features/schoolAnalysis/data.test.ts
git commit -m "Load school analysis data on demand"
```

### Task 4: Build the searchable responsive analysis experience

**Files:**
- Create: `src/features/schoolAnalysis/SchoolAnalysisPage.tsx`
- Create: `src/features/schoolAnalysis/SchoolAnalysisDashboard.tsx`
- Create: `src/features/schoolAnalysis/SchoolTreemap.tsx`
- Create: `src/features/schoolAnalysis/schoolAnalysis.css`
- Create: `src/features/schoolAnalysis/SchoolAnalysisPage.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Task 2 calculation functions and Task 3 loaders.
- Produces: default-exported `SchoolAnalysisPage` suitable for `React.lazy`, displaying search, selection, and `총괄 | 세입결산 | 세출결산` tabs.

- [ ] **Step 1: Write failing interaction tests**

Mock the loaders with at least three schools and assert:

```ts
expect(await screen.findByText("1,653개 학교·유치원")).toBeVisible();
await user.type(screen.getByRole("searchbox", { name: "학교 검색" }), "버들");
expect(screen.getByRole("option", { name: "서울버들초등학교" })).toBeVisible();
await user.click(screen.getByRole("option", { name: "서울버들초등학교" }));
expect(await screen.findByRole("heading", { name: "서울버들초등학교" })).toBeVisible();
expect(screen.getByRole("tab", { name: "세출결산" })).toBeVisible();
```

Add tests for a failed school request, retry, switching schools without mixed values, and a maximum of 50 rendered search results.

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npx vitest run src/features/schoolAnalysis/SchoolAnalysisPage.test.tsx`

Expected: FAIL because the page components do not exist.

- [ ] **Step 3: Install the source chart dependency**

Run: `npm install echarts@6.1.0`

Expected: dependency and lockfile record exactly ECharts 6.1.0.

- [ ] **Step 4: Implement the page states and capped search**

Use these explicit states:

```ts
type PageState =
  | { status: "loading-manifest" }
  | { status: "selecting"; schools: SchoolManifestEntry[] }
  | { status: "loading-school"; schools: SchoolManifestEntry[]; selected: SchoolManifestEntry }
  | { status: "ready"; schools: SchoolManifestEntry[]; selected: SchoolManifestEntry; dataset: BudgetDataset }
  | { status: "error"; schools: SchoolManifestEntry[]; selected?: SchoolManifestEntry; message: string };
```

Normalize trimmed Korean search text, return exact-code matches plus name matches, deduplicate by school code, and render `matches.slice(0, 50)`. Keep the selector usable during a selected-school error.

- [ ] **Step 5: Implement dashboard and accessible treemap**

Port the source's summary, school-scale, income structure, expense insight, rigid expense, breadcrumb drill-down, top items, and detail table composition. `SchoolTreemap` imports ECharts inside `useEffect`, disposes the chart on cleanup, and renders the same nodes in an accessible list/table so figures remain available without canvas:

```ts
useEffect(() => {
  let disposed = false;
  void import("echarts").then(({ init }) => {
    if (disposed || !host.current) return;
    const chart = init(host.current);
    chart.setOption(toTreemapOption(nodes));
    chart.on("click", ({ data }) => onSelect(data as BudgetNode));
    cleanup.current = () => chart.dispose();
  });
  return () => { disposed = true; cleanup.current?.(); };
}, [nodes, onSelect]);
```

- [ ] **Step 6: Add portal-matched responsive styling**

Desktop uses multi-column KPI cards, chart/table pairings, and sticky-free normal page flow. At `max-width: 720px`, use one-column cards, full-width controls, touch targets at least 44px high, and `.school-analysis-table-wrap { overflow-x: auto; }`. Do not hide analysis sections with media queries.

- [ ] **Step 7: Run interaction tests and build**

Run:

```bash
npx vitest run src/features/schoolAnalysis/SchoolAnalysisPage.test.tsx
npm run build
```

Expected: tests PASS and the Vite build exits 0.

- [ ] **Step 8: Commit the feature UI**

```bash
git add package.json package-lock.json src/features/schoolAnalysis
git commit -m "Add responsive school budget analysis dashboard"
```

### Task 5: Register the new portal tab without changing existing routes

**Files:**
- Modify: `src/components/PortalHeader.tsx`
- Modify: `src/components/PortalHeader.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: default `SchoolAnalysisPage` from Task 4.
- Produces: `PortalHeaderView` value `school-analysis` and the top-level `학교별 예산 분석` navigation action.

- [ ] **Step 1: Write failing menu and routing tests**

```ts
expect(screen.getByRole("button", { name: "학교별 예산 분석" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "학교별 예산 분석" }));
expect(await screen.findByRole("heading", { name: "학교별 예산 분석" })).toBeVisible();
expect(screen.getByRole("button", { name: "결산 설명서 만들기" })).toBeVisible();
```

Assert the new view does not appear under the existing `예산 업무` submenu and that all existing menu labels remain.

- [ ] **Step 2: Run routing tests to verify they fail**

Run: `npx vitest run src/components/PortalHeader.test.tsx src/App.test.tsx`

Expected: FAIL because the new header action and view are absent.

- [ ] **Step 3: Add the lazy view and header action**

```tsx
const SchoolAnalysisPage = lazy(() => import("./features/schoolAnalysis/SchoolAnalysisPage"));
// ...
{view === "school-analysis" && (
  <Suspense fallback={<div role="status">학교별 분석 화면을 불러오는 중…</div>}>
    <SchoolAnalysisPage />
  </Suspense>
)}
```

Extend `PortalHeaderView` with `school-analysis`; add a top-level button beside the existing navigation items and include it in search metadata. Do not alter `GUIDE_DESTINATIONS`, because this is an independent browsing page rather than a document workflow.

- [ ] **Step 4: Run routing and existing portal tests**

Run: `npx vitest run src/components/PortalHeader.test.tsx src/App.test.tsx`

Expected: PASS, including all pre-existing menu and navigation assertions.

- [ ] **Step 5: Commit the portal integration**

```bash
git add src/components/PortalHeader.tsx src/components/PortalHeader.test.tsx src/App.tsx src/App.test.tsx
git commit -m "Add school budget analysis portal tab"
```

### Task 6: Verify the complete branch and push it for review

**Files:**
- Modify only files required to fix failures proven by this task.

**Interfaces:**
- Consumes: the complete branch from Tasks 1–5.
- Produces: a tested remote branch `origin/codex/integrate-school-analysis` without merging or deploying it.

- [ ] **Step 1: Verify generated data identity and repository status**

Run:

```powershell
node -e "const m=require('./public/data/school-analysis/manifest.json'); const k=new Set(m.map(x=>x.schoolCode+':'+x.fiscalYear+':'+x.referenceMonth)); if(m.length!==1653||k.size!==1653) process.exit(1); console.log('schools',m.length)"
git diff --check
git status --short
```

Expected: `schools 1653`, no whitespace errors, and only intentional changes.

- [ ] **Step 2: Run all automated tests**

Run: `npx vitest run src scripts --exclude ".worktrees/**"`

Expected: all enabled tests PASS; the existing real-sample test may remain explicitly skipped.

- [ ] **Step 3: Run a production build and inspect chunking**

Run: `npm run build`

Expected: exit 0; school JSON files are static assets, and the initial JavaScript chunk does not contain the 1,653 datasets or ECharts feature chunk.

- [ ] **Step 4: Verify the main browser journey at desktop and mobile widths**

Start the existing Vite preview, then verify: open `학교별 예산 분석`; search and select 서울버들초등학교; switch through 총괄, 세입결산, and 세출결산; drill into one hierarchy; follow the source link; switch to another school; simulate one failed dataset request and retry. Repeat the same content checks at a mobile viewport and confirm there is no page-level horizontal overflow.

- [ ] **Step 5: Confirm the branch did not modify main or the public Site**

Run:

```bash
git branch --show-current
git merge-base --is-ancestor main HEAD
git rev-parse main
git rev-parse HEAD
```

Expected: current branch is `codex/integrate-school-analysis`, it descends from `main`, and the SHAs differ.

- [ ] **Step 6: Push the reviewed branch**

```bash
git push -u origin codex/integrate-school-analysis
git rev-parse --verify HEAD
git rev-parse --verify origin/codex/integrate-school-analysis
```

Expected: local and remote full SHAs match. Do not merge or deploy.
