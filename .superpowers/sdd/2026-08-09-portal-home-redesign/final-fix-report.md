# Portal home redesign final fix report

## Scope

- Base HEAD: `982c141` (`feat: add resources and video guide pages`)
- Scoped commit: `fix: close portal review findings` (this report ships in the same commit)
- Existing untracked `docs/superpowers/plans/2026-08-09-portal-home-redesign.md` and `.tmp-spreadsheet-analysis/` were excluded.

## Fixes

- Added a mobile-only logout button inside the expanded primary navigation when `onLogout` exists, while retaining the desktop profile logout.
- Replaced the header and home search affordances with clearly labelled `통합검색 준비 중` navigation and removed the misleading query inputs/forms.
- Made the search destination an informational preparation notice with no implied submit or results behavior.
- Removed `menu`/`menuitem`/`aria-haspopup="menu"` semantics from the workflow disclosure; its choices remain ordinary accessible buttons.
- Corrected `작성하면기안문` to `작성하면 기안문`.
- Removed the dead inline `ResourcesPage` and `VideoGuideLanding` implementations from `src/App.tsx`; routed feature pages remain unchanged.

## TDD evidence

### RED

Command:

```text
npm.cmd test -- --run src/components/PortalHeader.test.tsx src/features/home/HomePage.test.tsx src/App.test.tsx
```

Result: exit 1 with 6 expected failures. The failures showed the missing `통합검색 준비 중` controls/destination, missing logout inside the expanded primary navigation, old `menuitem` semantics, the still-present search form/input, and the uncorrected copy.

### GREEN

Command:

```text
npm.cmd test -- --run src/components/PortalHeader.test.tsx src/features/home/HomePage.test.tsx src/App.test.tsx
```

Result: exit 0; 3 test files passed, 23 tests passed.

## Full verification

The first default parallel full-suite run passed 182 of 183 tests; the existing home route integration test completed its assertions too slowly under full parallel load and exceeded Vitest's 5-second per-test default at 5.124 seconds. A single-worker diagnostic then exceeded the 180-second shell budget without reporting an assertion failure. No source or test-timeout configuration was changed.

Final full-suite command:

```text
npm.cmd run test:run -- --testTimeout=10000
```

Result: exit 0; 52 test files passed, 183 tests passed in 57.87 seconds.

Build command:

```text
npm.cmd run build
```

Result: exit 0; TypeScript and Vite production build completed, 1,967 modules transformed, build finished in 41.92 seconds. Vite retained its non-blocking existing warning that a minified chunk exceeds 500 kB.

Additional checks:

```text
git diff --check
rg -n 'role="menu"|role="menuitem"|aria-haspopup="menu"|작성하면기안문|function ResourcesPage|function VideoGuideLanding|home-search-query|portal-search-query|검색어를 입력하면 통합검색' src
```

Result: `git diff --check` clean; no reviewed leftovers in the modified portal code. The routed `src/features/resources/ResourcesPage.tsx` correctly remains.

## Concerns

- The home all-destinations integration test is sensitive to parallel machine load and can exceed Vitest's 5-second default despite passing consistently when focused; final full verification used a command-line-only 10-second timeout.
- The Vite large-chunk warning is pre-existing and outside this review-fix scope.
