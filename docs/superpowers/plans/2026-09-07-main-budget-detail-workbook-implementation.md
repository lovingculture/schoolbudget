# Main Budget Detail Workbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** K-에듀파인에서 세입예산명세서와 세출예산명세서를 함께 내려받은 Excel 한 파일만으로 업무추진비 3% 편성 비율을 계산하고, 비교 경고 없이 각 계산 합계를 명확히 표시한다.

**Architecture:** 기존 통합 예산서 파서는 유지하되, 총괄표가 없는 명세서 전용 통합 문서를 별도 구조 탐지기로 식별한다. 행 번호가 아니라 반복되는 제목·열 머리글·세입/세출 합계 경계를 기준으로 세입과 세출 구역을 나누고, 분석 결과 모델은 8개 세입 항목 합계와 일반업무추진비 합계만을 핵심 값으로 저장한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, SheetJS (`xlsx`)

**Spec:** `docs/superpowers/specs/2026-09-07-main-budget-detail-workbook-design.md`

## Global Constraints

- 사용자 입력 형식은 `.xls`, `.xlsx` 한 파일만 허용한다.
- PDF/OCR은 이 화면에서 안내·선택·분석하지 않는다.
- 학교별·연도별 행과 열 위치를 고정값으로 가정하지 않는다.
- 세입 기준금액은 `학교운영비전입금`, `사용료`, `수수료`, `자산매각대`, `지난년도수입`, `이자수입`, `기타행정활동수입`, `순세계잉여금`의 합계다.
- 문서에 존재하지 않는 8개 항목은 0원으로 처리하되, 존재하지만 금액을 읽지 못한 항목은 확인 경고를 유지한다.
- 세출 대상은 원가통계비목이 정확히 `일반업무추진비`인 행만 포함한다.
- 기존 `세입세출예산총괄` 포함 Excel도 계속 분석한다.
- 원본 세입합계 비교와 `REVENUE_BASELINE_MISMATCH` 경고는 제거한다.
- 테스트와 빌드가 모두 성공한 뒤 GitHub 푸시와 Sites 배포를 수행한다.

---

### Task 1: 명세서 통합 문서의 구조와 문서 정보 탐지

**Files:**
- Create: `src/features/mainBudget/parseDetailWorkbookIdentity.ts`
- Modify: `src/features/mainBudget/analysisTypes.ts`
- Test: `src/features/mainBudget/parseDetailWorkbookIdentity.test.ts`
- Test: `src/features/mainBudget/__fixtures__/detailStatementWorkbook.ts`

**Interfaces:**
- Consumes: `BudgetLogicalRow[]`, 업로드 파일명
- Produces: `parseDetailWorkbookIdentity(rows, fileName): { identity: BudgetDocumentIdentity; hasRevenueSection: boolean; hasExpenditureSection: boolean; warnings: AnalysisWarning[] }`

- [ ] **Step 1: 행 위치가 다른 두 합성 명세서 문서에 대한 실패 테스트를 작성한다.**

```ts
expect(parseDetailWorkbookIdentity(rows2026, "옥정.xls")).toMatchObject({
  identity: { accountingYear: 2026, budgetType: "본예산" },
  hasRevenueSection: true,
  hasExpenditureSection: true,
});
expect(parseDetailWorkbookIdentity(rows2025, "옥정2025.xlsx").identity.accountingYear).toBe(2025);
```

- [ ] **Step 2: 탐지 테스트를 실행해 함수가 없어 실패하는지 확인한다.**

Run: `npm test -- --run src/features/mainBudget/parseDetailWorkbookIdentity.test.ts`
Expected: FAIL with module/function not found.

- [ ] **Step 3: 정규화된 행 텍스트에서 `세입예산명세서`, `세출예산명세서`, `세입합계`, `세출합계`, 회계연도를 탐지하고 학교명은 제목 우선·파일명 차선으로 만드는 최소 구현을 작성한다.**

```ts
export function parseDetailWorkbookIdentity(rows: BudgetLogicalRow[], fileName: string): DetailWorkbookIdentityResult {
  const texts = rows.map(normalizedRowText);
  const year = findAccountingYear(texts) ?? findAccountingYear([fileName]);
  return {
    identity: { schoolName: findSchoolName(texts) ?? fallbackSchoolName(fileName), accountingYear: year, budgetType: "본예산" },
    hasRevenueSection: texts.some(isRevenueHeading),
    hasExpenditureSection: texts.some(isExpenditureHeading),
    warnings: year ? [] : [identityWarning("회계연도")],
  };
}
```

- [ ] **Step 4: 탐지 테스트를 다시 실행해 통과하는지 확인한다.**

Run: `npm test -- --run src/features/mainBudget/parseDetailWorkbookIdentity.test.ts`
Expected: PASS.

- [ ] **Step 5: 구조 탐지 변경을 커밋한다.**

```bash
git add src/features/mainBudget/analysisTypes.ts src/features/mainBudget/parseDetailWorkbookIdentity.ts src/features/mainBudget/parseDetailWorkbookIdentity.test.ts src/features/mainBudget/__fixtures__/detailStatementWorkbook.ts
git commit -m "feat: detect combined budget detail workbooks"
```

### Task 2: 총괄표 없이 명세서만으로 Excel 분석

**Files:**
- Modify: `src/features/mainBudget/analyzeBudgetFile.ts`
- Modify: `src/features/mainBudget/parseRevenueStatement.ts`
- Modify: `src/features/mainBudget/parseExpenditureStatement.ts`
- Test: `src/features/mainBudget/analyzeBudgetFile.test.ts`
- Test: `src/features/mainBudget/budgetParsers.test.ts`

**Interfaces:**
- Consumes: Task 1의 `parseDetailWorkbookIdentity`
- Produces: 총괄표가 없어도 `ParsedMainBudgetInput`을 생성하는 `parsedInput(source, rows, onDiagnostic)`

- [ ] **Step 1: 총괄표가 없고 반복 머리글과 가변 행 간격을 가진 문서가 분석되는 실패 테스트를 작성한다.**

```ts
const result = await analyzeBudgetFile(detailWorkbookFile, options);
expect(result.identity.accountingYear).toBe(2026);
expect(result.verificationRevenue.facts).toHaveLength(8);
expect(result.generalBusinessExpenses.every(({ costItem }) => costItem === "일반업무추진비")).toBe(true);
```

- [ ] **Step 2: 관련 파서 테스트를 실행해 `세입세출예산총괄` 누락 오류를 확인한다.**

Run: `npm test -- --run src/features/mainBudget/analyzeBudgetFile.test.ts src/features/mainBudget/budgetParsers.test.ts`
Expected: FAIL mentioning missing `세입세출예산총괄`.

- [ ] **Step 3: 총괄표가 유효하면 기존 문서 정보를, 없으면 Task 1의 문서 정보를 사용하고 세입·세출 명세서만 필수로 검사하도록 수정한다.**

```ts
const detailIdentity = parseDetailWorkbookIdentity(rows, source.fileName);
const identity = summary.identity ?? detailIdentity.identity;
const missingSections = [
  [revenue.hasValidStructure || revenue.isReviewable, "세입예산명세서"],
  [expenditure.hasValidStructure || expenditure.isReviewable, "세출예산명세서"],
].filter(([valid]) => !valid).map(([, label]) => label);
```

- [ ] **Step 4: 머리글 이름으로 예산액 열과 원가통계비목 열을 찾고 `세입합계`/`세출합계` 경계를 넘지 않도록 파서를 보강한다.**

```ts
const columns = findColumns(header.cells, {
  amount: ["예산액", "본예산액"],
  costItem: ["원가통계비목"],
});
```

- [ ] **Step 5: 명세서 및 기존 통합 예산서 회귀 테스트를 실행한다.**

Run: `npm test -- --run src/features/mainBudget/analyzeBudgetFile.test.ts src/features/mainBudget/budgetParsers.test.ts`
Expected: PASS for detail-only and existing summary workbook cases.

- [ ] **Step 6: 실제 네 파일을 로컬 검증 스크립트/테스트 실행 환경에서 각각 분석해 2025/2026 문서와 `.xls`/`.xlsx`가 모두 완료되는지 확인한다.**

Run: `npm test -- --run src/features/mainBudget/analyzeBudgetFile.test.ts --reporter=verbose`
Expected: PASS for cases labelled `옥정2.xls`, `옥정.xls`, `옥정추가 xlsx.xlsx`, `옥정2025.xlsx`; sample binaries are not added to Git.

- [ ] **Step 7: 명세서 분석 변경을 커밋한다.**

```bash
git add src/features/mainBudget/analyzeBudgetFile.ts src/features/mainBudget/parseRevenueStatement.ts src/features/mainBudget/parseExpenditureStatement.ts src/features/mainBudget/analyzeBudgetFile.test.ts src/features/mainBudget/budgetParsers.test.ts
git commit -m "feat: analyze revenue and expense detail workbook"
```

### Task 3: 8개 항목 합계를 유일한 세입 기준액으로 단순화

**Files:**
- Modify: `src/features/mainBudget/analysisTypes.ts`
- Modify: `src/features/mainBudget/analyzeMainBudget.ts`
- Modify: `src/features/mainBudget/analyzeMainBudget.test.ts`
- Modify: `src/features/mainBudget/analysisStorage.ts`
- Modify: `src/features/mainBudget/analysisStorage.test.ts`

**Interfaces:**
- Consumes: `verificationRevenue`, `generalBusinessExpenses`
- Produces: comparison 없는 `MainBudgetAnalysisResult`와 storage schema version 4

- [ ] **Step 1: 8개 합계가 세입 기준액이 되고 원본 비교 경고가 없다는 실패 테스트를 작성한다.**

```ts
expect(result.revenueBaseline).toBe(result.verificationRevenueTotal);
expect(result.warnings).not.toContainEqual(expect.objectContaining({ code: "REVENUE_BASELINE_MISMATCH" }));
expect(result).not.toHaveProperty("comparison");
```

- [ ] **Step 2: 계산 및 저장 테스트를 실행해 기존 comparison 의존으로 실패하는지 확인한다.**

Run: `npm test -- --run src/features/mainBudget/analyzeMainBudget.test.ts src/features/mainBudget/analysisStorage.test.ts`
Expected: FAIL because comparison and original revenue fields are still required.

- [ ] **Step 3: `ParsedMainBudgetInput`과 결과에서 `totalRevenue`, `purposeRevenue`, `beneficiaryRevenue`, `comparison`을 제거하고 8개 검증 항목 합계를 바로 기준액으로 사용한다.**

```ts
const verificationRevenueTotal = missingVerificationFact
  ? null
  : verificationFacts.reduce((sum, fact) => sum + fact!.amount!, 0);
const revenueBaseline = verificationRevenueTotal;
```

- [ ] **Step 4: 저장 스키마를 4로 올리고 새 결과 필드만 검증하며 이전 스키마는 안전하게 폐기하도록 수정한다.**

```ts
const SCHEMA_VERSION = 4;
if (!safeSource || !safeIdentity || !verificationRevenue || !generalBusinessExpenses || !warnings) return null;
```

- [ ] **Step 5: 계산 및 저장 테스트를 다시 실행한다.**

Run: `npm test -- --run src/features/mainBudget/analyzeMainBudget.test.ts src/features/mainBudget/analysisStorage.test.ts`
Expected: PASS.

- [ ] **Step 6: 단순화 변경을 커밋한다.**

```bash
git add src/features/mainBudget/analysisTypes.ts src/features/mainBudget/analyzeMainBudget.ts src/features/mainBudget/analyzeMainBudget.test.ts src/features/mainBudget/analysisStorage.ts src/features/mainBudget/analysisStorage.test.ts
git commit -m "refactor: use verification revenue as budget baseline"
```

### Task 4: 결과 화면의 비교 상자 제거와 합계 행 추가

**Files:**
- Modify: `src/features/mainBudget/MainBudgetSummary.tsx`
- Modify: `src/features/mainBudget/RevenueBreakdownTable.tsx`
- Modify: `src/features/mainBudget/GeneralBusinessExpenseTable.tsx`
- Modify: `src/features/mainBudget/MainBudgetPage.tsx`
- Modify: `src/features/mainBudget/mainBudget.css`
- Modify: `src/features/mainBudget/MainBudgetPage.test.tsx`

**Interfaces:**
- Consumes: `verificationRevenueTotal`, `generalBusinessExpenseTotal`
- Produces: `RevenueBreakdownTable({ revenue, total })`, `GeneralBusinessExpenseTable({ expenses, total })`

- [ ] **Step 1: 비교 문구가 없고 두 표의 `합계` 행과 상단 세 값이 보이는 실패 UI 테스트를 작성한다.**

```tsx
expect(screen.queryByText("원본 세입합계 대조")).not.toBeInTheDocument();
expect(screen.getByRole("row", { name: /세입 검증 항목 합계/ })).toBeInTheDocument();
expect(screen.getByRole("row", { name: /일반업무추진비 합계/ })).toBeInTheDocument();
```

- [ ] **Step 2: 화면 테스트를 실행해 합계 행 부재로 실패하는지 확인한다.**

Run: `npm test -- --run src/features/mainBudget/MainBudgetPage.test.tsx`
Expected: FAIL on missing total rows and existing comparison content.

- [ ] **Step 3: 요약에서 comparison 블록을 제거하고 두 표에 `tfoot` 합계 행을 추가한다.**

```tsx
<tfoot><tr><th scope="row">세입 검증 항목 합계</th><td>{formatThousandWon(total)}</td><td>{formatWon(total)}</td><td>8개 항목 합계</td></tr></tfoot>
```

```tsx
<tfoot><tr><th scope="row" colSpan={4}>일반업무추진비 합계</th><td>{formatThousandWon(total)} / {formatWon(total)}</td><td colSpan={2}>전체 내역 합계</td></tr></tfoot>
```

- [ ] **Step 4: `MainBudgetPage`에서 두 합계를 전달하고 모바일에서도 합계 행이 고정 폭 표 안에서 읽히도록 CSS를 보강한다.**

```tsx
<RevenueBreakdownTable revenue={result.verificationRevenue} total={result.verificationRevenueTotal} />
<GeneralBusinessExpenseTable expenses={result.generalBusinessExpenses} total={result.generalBusinessExpenseTotal} />
```

- [ ] **Step 5: 화면 테스트를 다시 실행한다.**

Run: `npm test -- --run src/features/mainBudget/MainBudgetPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: 결과 UI 변경을 커밋한다.**

```bash
git add src/features/mainBudget/MainBudgetSummary.tsx src/features/mainBudget/RevenueBreakdownTable.tsx src/features/mainBudget/GeneralBusinessExpenseTable.tsx src/features/mainBudget/MainBudgetPage.tsx src/features/mainBudget/mainBudget.css src/features/mainBudget/MainBudgetPage.test.tsx
git commit -m "feat: show budget calculation totals"
```

### Task 5: Excel 전용 업로드와 K-에듀파인 다운로드 안내

**Files:**
- Create: `public/guides/edu-finance-main-budget-statements.png`
- Modify: `src/features/mainBudget/MainBudgetUpload.tsx`
- Modify: `src/features/mainBudget/analyzeBudgetFile.ts`
- Modify: `src/features/mainBudget/mainBudget.css`
- Modify: `src/features/mainBudget/MainBudgetPage.test.tsx`
- Modify: `src/features/mainBudget/analyzeBudgetFile.test.ts`

**Interfaces:**
- Consumes: 사용자 제공 화면 캡처 `codex-clipboard-39a3a87b-5e1b-4e3b-aa68-57576cfc3a6f.png`
- Produces: `.xls,.xlsx` 전용 파일 선택과 단계별 다운로드 안내

- [ ] **Step 1: PDF가 거부되고 Excel만 선택 가능하며 정확한 다운로드 경로가 보이는 실패 테스트를 작성한다.**

```ts
expect(screen.getByLabelText("본예산 파일 선택")).toHaveAttribute("accept", ".xls,.xlsx");
expect(screen.getByText(/학교회계.*예산관리.*예산현황\(학교\).*예산서현황/)).toBeInTheDocument();
await expect(analyzeBudgetFile(pdfFile, options)).rejects.toThrow("XLS, XLSX");
```

- [ ] **Step 2: 업로드 및 파일 분석 테스트를 실행해 PDF 허용 때문에 실패하는지 확인한다.**

Run: `npm test -- --run src/features/mainBudget/MainBudgetPage.test.tsx src/features/mainBudget/analyzeBudgetFile.test.ts`
Expected: FAIL because `.pdf` is accepted.

- [ ] **Step 3: 업로드 accept와 파일 형식 검증을 Excel 전용으로 변경한다.**

```ts
if (extension !== "xls" && extension !== "xlsx") {
  throw new Error(`${file.name}: XLS, XLSX 형식의 Excel 파일만 선택해 주세요.`);
}
```

- [ ] **Step 4: 안내 영역에 경로, 두 보고서 동시 선택, Excel 저장 순서를 번호로 표시하고 캡처 이미지를 반응형으로 배치한다.**

```tsx
<ol>
  <li>학교회계 &gt; 예산관리 &gt; 예산현황(학교) &gt; 예산서현황으로 이동</li>
  <li>세입세출예산총괄에서 세입예산명세서와 세출예산명세서를 함께 선택</li>
  <li>Excel(.xls 또는 .xlsx) 파일로 저장</li>
</ol>
```

- [ ] **Step 5: 업로드 및 분석 테스트를 다시 실행한다.**

Run: `npm test -- --run src/features/mainBudget/MainBudgetPage.test.tsx src/features/mainBudget/analyzeBudgetFile.test.ts`
Expected: PASS.

- [ ] **Step 6: Excel 전용 안내 변경을 커밋한다.**

```bash
git add public/guides/edu-finance-main-budget-statements.png src/features/mainBudget/MainBudgetUpload.tsx src/features/mainBudget/analyzeBudgetFile.ts src/features/mainBudget/mainBudget.css src/features/mainBudget/MainBudgetPage.test.tsx src/features/mainBudget/analyzeBudgetFile.test.ts
git commit -m "feat: add main budget Excel download guide"
```

### Task 6: 전체 회귀 검증, GitHub 푸시, Sites 배포

**Files:**
- Modify only if verification exposes an in-scope regression.

**Interfaces:**
- Consumes: Tasks 1–5의 완성된 변경
- Produces: 검증된 GitHub 커밋과 공개 Sites 배포

- [ ] **Step 1: 본예산 기능 테스트 전체를 실행한다.**

Run: `npm test -- --run src/features/mainBudget`
Expected: all main-budget tests PASS.

- [ ] **Step 2: 전체 프로젝트 테스트를 실행한다.**

Run: `npm run test:run`
Expected: all tests PASS with only previously documented skips.

- [ ] **Step 3: 배포용 빌드를 실행한다.**

Run: `npm run build`
Expected: TypeScript, Vite, and Sites build preparation complete successfully.

- [ ] **Step 4: 변경 범위와 미추적 사용자 파일 보존 여부를 확인한다.**

Run: `git status --short && git diff --check`
Expected: no whitespace errors; `.superpowers/brainstorm/` and `.tmp-spreadsheet-analysis/` remain untracked and unstaged.

- [ ] **Step 5: 필요한 검증 수정이 있었다면 별도 커밋한다.**

```bash
git add <only-in-scope-files>
git commit -m "test: verify main budget workbook analysis"
```

- [ ] **Step 6: 현재 브랜치를 GitHub origin에 푸시한다.**

Run: `git push -u origin codex/fix-closing-xlsx`
Expected: remote branch updated successfully.

- [ ] **Step 7: Sites 프로젝트에 새 빌드를 배포하고 공개 주소에서 업로드 안내와 결과 화면을 확인한다.**

Expected: `https://school-budget-hannune.ekego1102.chatgpt.site/`에서 Excel 전용 안내, 비교 상자 제거, 두 합계 행, 상단 비율이 정상 표시된다.

