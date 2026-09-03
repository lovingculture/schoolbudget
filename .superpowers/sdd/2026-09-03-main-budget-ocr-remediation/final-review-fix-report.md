# Final review fix report

Date: 2026-09-03

## Review findings addressed

- Strict parsed structure is now separate from OCR-only reviewability. `hasValidStructure` represents a complete, reliably parsed table; `isReviewable` permits a safely rendered OCR result without claiming complete collection.
- OCR-only revenue fallback never infers omitted required revenue items as zero and never marks the verification revenue collection complete.
- OCR-only expenditure fallback never marks an empty general-business-expense collection complete, so total and ratio cannot become a confident zero.
- Review-only fallback requires reliable section anchors. Revenue and expenditure require their reliable section headings. Summary requires either a reliable summary heading or the reliable `예산총칙` heading when OCR fragmented the surrounding summary title.
- The diagnostic wrapper now reports strict validity, reviewability, and the final calculated values.

## Regression coverage

- High-confidence OCR revenue fallback remains reviewable but returns `null` for omitted purpose/beneficiary revenue and `isComplete: false`.
- High-confidence OCR expenditure fallback remains reviewable but returns an incomplete empty collection.
- Low-confidence summary, revenue, and expenditure headings do not qualify for review-only fallback.
- A low-confidence cover title no longer masks a later reliable summary title.
- A fragmented summary title may use a reliable `예산총칙` heading plus OCR total evidence for review-only display.

## Verification

- Focused main-budget tests: 64 passed.
- TypeScript project check: passed (`npx tsc -b`).
- Reference files: XLS, XLSX, and selectable-text PDF all retained exact expected values: revenue baseline 803,573천원, general business expense 23,020천원, ratio 2.86%.
- School-account scan (28 pages): nonfatal; all three sections `hasValidStructure: false`, `isReviewable: true`; revenue baseline, expense total, and ratio are `null`; comparison is `needs-review`.
- Kindergarten-account scan (13 pages): same nonfatal/reviewable result with all calculated values `null` and comparison `needs-review`.
- Full suite: 457 passed; the unrelated `GuidelineSearchPanel.test.tsx` build-in-test exceeded the shared 60-second timeout under full-suite load. It passed alone in 26.0 seconds.
- Production build: passed. Vite emitted the existing large-chunk advisory only.

## Safety outcome

Both supplied image PDFs now open as reviewable analyses instead of failing closed, while uncertain monetary values stay visibly unresolved (`null` / `확인 필요`). No OCR-only path can produce a confident zero expense total or ratio.
