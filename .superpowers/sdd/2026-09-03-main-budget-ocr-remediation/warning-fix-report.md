# OCR warning display remediation

Date: 2026-09-03

## Root cause

The analysis result intentionally retains one warning for every unreliable OCR body row. `AnalysisWarnings` rendered that raw array without any display bound, so the school scan produced 1,196 expenditure warnings and 166 revenue warnings as individual cards. The parser remained financially safe, but the page became impractically long.

## Implemented behavior

- Analysis output and persisted warnings are unchanged; no warning is marked resolved or removed from the result.
- Only repeated `LOW_CONFIDENCE_REVENUE_ROW` and `LOW_CONFIDENCE_EXPENDITURE_ROW` warnings are grouped, and only when a group exceeds 10 items.
- Each group states its exact total, displays three representative page/row/recognized-text/confidence records, and states the exact number omitted from the visual list.
- Structural, missing-value, mismatch, identity, and other financial-safety warnings remain individual cards.
- Ordinary small warning sets keep the previous fully expanded rendering.

## TDD evidence

- Red: the new 100-row warning test failed because the page rendered all 100 cards and had no group count.
- Green: `npm run test:run -- src/features/mainBudget/MainBudgetPage.test.tsx` passed 15/15 tests after the minimal grouping implementation.
- The tests cover both a two-warning ordinary set and a 101-warning set containing a structural warning plus 100 repeated OCR row warnings.

## Verification

- `npm run test:run -- src/features/mainBudget`: 9 files, 127 tests passed.
- `npx tsc -b --pretty false`: exit 0.
- `npm run build`: exit 0; the existing Rollup large-chunk advisory remains non-fatal.
- School scan: empty fatal reason; summary, revenue, and expenditure structures all valid; warning counts 5 / 166 / 1,196.
- Kindergarten scan: empty fatal reason; summary, revenue, and expenditure structures all valid; warning counts 4 / 38 / 251.
- `git diff --check`: exit 0.

The actual scan results therefore remain structurally reviewable and fail closed on uncertain monetary values, while their repeated row-level warning evidence is presented in a bounded form.
