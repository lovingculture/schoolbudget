# 집행실적 추경자료 Excel 양식 일치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에듀파인 102-2 파일을 올리면 `집행실적정리용엑셀 확정본(2).xlsm`과 같은 네 시트·표·수식·서식을 가진 매크로 없는 `.xlsx` 파일을 다운로드하게 한다.

**Architecture:** 기존 `xlsx` 파서는 입력 호환성을 위해 유지하고, 출력은 브라우저에서 서식·수식·필터·틀 고정·인쇄 설정을 제어할 수 있는 `exceljs` 기반 생성기로 교체한다. 표 데이터 생성과 Excel 표현을 분리하여 데이터 규칙은 순수 함수로 검증하고, workbook 직렬화 결과는 다시 읽어 시트 구조와 셀 메타데이터를 검사한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, SheetJS `xlsx` 0.18.5(입력), `exceljs`(출력), FileSaver 브라우저 다운로드 API

## Global Constraints

- 최종 파일 형식은 매크로 없는 `.xlsx`다.
- 시트 순서는 `불러온원본`, `추경검토`, `정리본`, `단위사업별집계`다.
- 빈 `Sheet1`, 도형 버튼과 VBA 프로젝트는 포함하지 않는다.
- 예산현액은 102-2의 예산액(4) 값을 사용한다.
- 집행잔액은 `예산현액 - 원인행위금액`, 불일치는 `원인행위금액 - 지출금액`, 집행률은 `원인행위금액 / 예산현액`이다.
- 입력 데이터 수에 맞춰 본문, 합계, 필터, 병합, 틀 고정과 인쇄영역을 동적으로 갱신한다.
- 현재 웹 화면의 네 결과 탭과 사용자 입력 기능을 유지한다.
- 화면 검색 상태와 관계없이 다운로드에는 전체 데이터와 사용자 입력값을 포함한다.
- 이 작업공간은 ZIP에서 추출되어 Git 메타데이터가 없으므로 실행 중 커밋 단계는 수행할 수 없다. 검증된 변경 파일을 기존 프로젝트에 배포한다.

---

## File Structure

- Create `src/features/supplementary/excelLayout.ts`: 네 시트의 제목, 열 정의, 너비, 표시 형식, 색상, 테두리와 인쇄 설정 상수.
- Create `src/features/supplementary/excelRows.ts`: `ExecutionWorkbook`과 `CalculatedExecutionRow[]`를 네 시트의 행 모델로 변환하는 순수 함수.
- Create `src/features/supplementary/excelRows.test.ts`: 열 매핑, 계산식, 합계와 집계 규칙 테스트.
- Modify `src/features/supplementary/exportExcel.ts`: ExcelJS workbook 생성, 스타일 적용, `.xlsx` 직렬화와 다운로드.
- Modify `src/features/supplementary/exportExcel.test.ts`: 시트 순서, 셀값, 수식, 서식, 필터, 병합과 틀 고정 테스트.
- Modify `src/features/supplementary/SupplementaryPage.tsx`: 비동기 다운로드 상태와 오류 메시지 처리.
- Modify `src/features/supplementary/SupplementaryPage.test.tsx`: 버튼 비활성화, 성공 호출, 실패 알림 테스트.
- Modify `package.json`, `package-lock.json`: `exceljs` 의존성 추가.
- Create `scripts/verify-supplementary-export.mjs`: 실제 102-2 파일로 생성한 결과를 다시 읽어 기준 합계와 구조를 검증하는 재현 가능한 스크립트.

---

### Task 1: 출력 행 모델과 기준 열 순서 고정

**Files:**
- Create: `src/features/supplementary/excelRows.ts`
- Create: `src/features/supplementary/excelRows.test.ts`
- Create: `src/features/supplementary/excelLayout.ts`

**Interfaces:**
- Consumes: `ExecutionWorkbook`, `CalculatedExecutionRow`, `aggregateByUnitBusiness`.
- Produces: `createSupplementaryExcelModel(source, rows): SupplementaryExcelModel`.

- [ ] **Step 1: 열 이름과 행 구조가 기준 파일과 같아야 하는 실패 테스트 작성**

```ts
import { describe, expect, it } from "vitest";
import { calculateExecutionRow } from "./calculations";
import { createSupplementaryExcelModel } from "./excelRows";

it("기준 파일과 같은 네 시트의 열과 계산값을 만든다", () => {
  const source = {
    fiscalYear: 2026,
    executionDate: "20260801",
    schoolName: "서울옥정초등학교",
    sourceSheetName: "102-2",
    headers: ["학교명", "예산액(4)(1+2+3)"],
    originalRows: [["학교명", "예산액(4)(1+2+3)"], ["서울옥정초등학교", 1000]],
    rows: [],
  };
  const rows = [calculateExecutionRow({
    id: "1", policy: "정책", unitBusiness: "단위", detailBusiness: "세부",
    detailItem: "항목", account: "목", subAccount: "세목",
    costCategory: "일반업무추진비", description: "협의회",
    budgetAmount: 1000, committedAmount: 400, paidAmount: 350, original: {},
  }, 100, -200)];

  const model = createSupplementaryExcelModel(source, rows);
  expect(model.sheetNames).toEqual(["불러온원본", "추경검토", "정리본", "단위사업별집계"]);
  expect(model.status.headers).toEqual([
    "정책사업", "단위사업", "세부사업", "세부항목", "목명", "세목명",
    "원가통계비목", "산출내역", "예산현액", "원인행위금액", "지출금액",
    "집행잔액", "원인행위·지출 불일치", "집행률", "추경반영액",
  ]);
  expect(model.status.rows[0].slice(8, 15)).toEqual([1000, 400, 350, 600, 50, 0.4, -200]);
});
```

- [ ] **Step 2: RED 확인**

Run: `npm test -- --run src/features/supplementary/excelRows.test.ts`

Expected: FAIL because `./excelRows` does not exist.

- [ ] **Step 3: 최소 모델 구현**

```ts
export type SupplementaryExcelModel = {
  sheetNames: ["불러온원본", "추경검토", "정리본", "단위사업별집계"];
  original: { rows: unknown[][] };
  review: { headers: string[]; rows: unknown[][]; total: number[] };
  status: { headers: string[]; rows: unknown[][]; total: number[] };
  summary: { headers: string[]; rows: unknown[][]; total: number[] };
};

export function createSupplementaryExcelModel(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): SupplementaryExcelModel {
  // Use the exact header arrays from the approved design.
  // Map every numeric field as a number, not a formatted string.
  // Compute totals with reduce and summary rows with aggregateByUnitBusiness.
}
```

구현 시 `excelLayout.ts`에 `STATUS_COLUMNS`, `REVIEW_COLUMNS`, `SUMMARY_COLUMNS`와 각 열 너비를 숫자로 선언한다. 기준 파일의 A:O와 A:F 범위를 넘는 열 정의는 만들지 않는다.

- [ ] **Step 4: GREEN 확인**

Run: `npm test -- --run src/features/supplementary/excelRows.test.ts src/features/supplementary/calculations.test.ts`

Expected: PASS, including budget 1000, balance 600, discrepancy 50, rate 0.4.

---

### Task 2: 기준 파일과 같은 네 시트 Workbook 생성

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/features/supplementary/exportExcel.ts`
- Modify: `src/features/supplementary/exportExcel.test.ts`

**Interfaces:**
- Consumes: `createSupplementaryExcelModel(source, rows)` and layout constants.
- Produces: `buildSupplementaryWorkbook(source, rows): Promise<ExcelJS.Workbook>` and `serializeSupplementaryWorkbook(source, rows): Promise<Uint8Array>`.

- [ ] **Step 1: ExcelJS 설치**

Run: `npm install exceljs@4.4.0 --save --cache /tmp/npm-school-budget-cache`

Expected: `package.json` contains `"exceljs": "^4.4.0"` and lockfile is updated.

- [ ] **Step 2: 시트 구조와 메타데이터 실패 테스트 작성**

```ts
it("기준 파일의 시트 순서와 표 설정을 재현한다", async () => {
  const workbook = await buildSupplementaryWorkbook(source, rows);
  expect(workbook.worksheets.map(sheet => sheet.name)).toEqual([
    "불러온원본", "추경검토", "정리본", "단위사업별집계",
  ]);
  const status = workbook.getWorksheet("정리본")!;
  expect(status.getCell("A1").value).toBe("예산집행현황");
  expect(status.autoFilter).toEqual({ from: "A3", to: "O3" });
  expect(status.views[0]).toMatchObject({ state: "frozen", ySplit: 3 });
  expect(status.pageSetup.orientation).toBe("landscape");
  expect(status.pageSetup.fitToWidth).toBe(1);
});
```

- [ ] **Step 3: RED 확인**

Run: `npm test -- --run src/features/supplementary/exportExcel.test.ts`

Expected: FAIL because the current synchronous SheetJS workbook has five differently named sheets and lacks ExcelJS metadata.

- [ ] **Step 4: Workbook 생성기 구현**

```ts
export async function buildSupplementaryWorkbook(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): Promise<ExcelJS.Workbook> {
  const model = createSupplementaryExcelModel(source, rows);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "학교예산 한눈에보기";
  workbook.created = new Date();
  addOriginalSheet(workbook, model.original);
  addReviewSheet(workbook, model.review);
  addStatusSheet(workbook, model.status);
  addSummarySheet(workbook, model.summary);
  return workbook;
}

export async function serializeSupplementaryWorkbook(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): Promise<Uint8Array> {
  const workbook = await buildSupplementaryWorkbook(source, rows);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
```

각 `add*Sheet` 함수는 제목 병합, 3행 머리글, 데이터 행, 동적 합계 행, 열 너비, 행 높이, 필터, 틀 고정과 `pageSetup`을 한 번에 설정한다.

- [ ] **Step 5: 기준 서식 적용**

```ts
const FONT = { name: "맑은 고딕", size: 10 };
const THIN_BORDER = {
  top: { style: "thin", color: { argb: "FFB7C3D0" } },
  left: { style: "thin", color: { argb: "FFB7C3D0" } },
  bottom: { style: "thin", color: { argb: "FFB7C3D0" } },
  right: { style: "thin", color: { argb: "FFB7C3D0" } },
} as const;

sheet.pageSetup = {
  paperSize: 9,
  orientation: "landscape",
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
};
```

숫자 열은 `#,##0`, 집행률은 `0.00%`, 음수 집행잔액 셀은 `FFFF0000` 글꼴로 지정한다. 합계 행은 굵은 글꼴과 별도 채우기를 적용하고, `추경검토` 합계 행은 A:H를 병합한다.

- [ ] **Step 6: GREEN 확인**

Run: `npm test -- --run src/features/supplementary/exportExcel.test.ts src/features/supplementary/excelRows.test.ts`

Expected: PASS for four sheets, titles, headers, merged ranges, total row, styles, filter and frozen views.

---

### Task 3: 브라우저 비동기 다운로드와 오류 처리

**Files:**
- Modify: `src/features/supplementary/exportExcel.ts`
- Modify: `src/features/supplementary/SupplementaryPage.tsx`
- Modify: `src/features/supplementary/SupplementaryPage.test.tsx`

**Interfaces:**
- Consumes: `serializeSupplementaryWorkbook(source, rows)`.
- Produces: `downloadSupplementaryWorkbook(source, rows): Promise<void>`.

- [ ] **Step 1: 다운로드 진행 상태 실패 테스트 작성**

```tsx
it("Excel을 만드는 동안 버튼을 비활성화하고 완료 후 복구한다", async () => {
  const user = userEvent.setup();
  render(<SupplementaryPage />);
  await loadExecutionFixture(user);
  const button = screen.getByRole("button", { name: "Excel 다운로드" });
  await user.click(button);
  expect(button).toBeDisabled();
  expect(button).toHaveTextContent("Excel 생성 중");
  await waitFor(() => expect(button).not.toBeDisabled());
});
```

- [ ] **Step 2: RED 확인**

Run: `npm test -- --run src/features/supplementary/SupplementaryPage.test.tsx`

Expected: FAIL because the current handler is synchronous and has no download state.

- [ ] **Step 3: Blob 다운로드 구현**

```ts
export async function downloadSupplementaryWorkbook(
  source: ExecutionWorkbook,
  rows: CalculatedExecutionRow[],
): Promise<void> {
  const bytes = await serializeSupplementaryWorkbook(source, rows);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${source.fiscalYear}_${source.schoolName}_추경검토자료.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: 화면 상태와 오류 안내 구현**

`SupplementaryPage`에 `downloading` 상태를 추가한다. 클릭 시 `setDownloading(true)` 후 `await downloadSupplementaryWorkbook(source, calculated)`를 호출하고 `finally`에서 false로 되돌린다. 실패하면 `setError("Excel 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.")`를 표시한다.

- [ ] **Step 5: GREEN 확인**

Run: `npm test -- --run src/features/supplementary/SupplementaryPage.test.tsx src/features/supplementary/exportExcel.test.ts`

Expected: PASS for normal download, disabled state and error recovery.

---

### Task 4: 실제 102-2 파일과 기준 결과의 구조·합계 검증

**Files:**
- Create: `scripts/verify-supplementary-export.mjs`
- Modify: `src/features/supplementary/exportExcel.test.ts`

**Interfaces:**
- Consumes: actual fixture `/workspace/scratch/812beceb33cb/upload/2026집행실적_102-2_20260801180031440(1).xlsx` and reference `/workspace/scratch/812beceb33cb/upload/집행실적정리용엑셀 확정본(2).xlsm`.
- Produces: `/tmp/school-budget-verification/2026_서울옥정초등학교_추경검토자료.xlsx` plus a non-zero exit code on mismatch.

- [ ] **Step 1: 실제 파일 검증 스크립트 작성**

스크립트는 실제 102-2 파일을 기존 파서로 읽고 계산한 후 `serializeSupplementaryWorkbook`으로 저장한다. 생성 파일과 기준 파일을 `xlsx`로 다시 읽어 다음 값을 비교한다.

```js
const requiredSheets = ["불러온원본", "추경검토", "정리본", "단위사업별집계"];
assert.deepEqual(generated.SheetNames, requiredSheets);
assert.equal(generated.Sheets["정리본"]["!ref"], "A1:O528");
assert.equal(generated.Sheets["단위사업별집계"]["A1"].v, "단위사업별 집행현황");
assert.equal(generated.Sheets["단위사업별집계"]["D42"].v, 2341568000);
assert.equal(generated.Sheets["단위사업별집계"]["E42"].v, 1311300066);
```

- [ ] **Step 2: 첫 실행으로 차이 확인**

Run: `node scripts/verify-supplementary-export.mjs`

Expected: FAIL on any remaining reference mismatch and print the exact sheet/cell/property.

- [ ] **Step 3: 한 번에 한 차이씩 레이아웃 상수 보정**

각 실패에 대해 `excelLayout.ts`의 열 너비, 행 높이, 색상, 병합 또는 표시 형식 하나만 수정하고 같은 검증 스크립트를 다시 실행한다. 데이터 계산식을 기준 파일에 맞추기 위해 하드코딩하지 않는다.

- [ ] **Step 4: 구조와 합계 GREEN 확인**

Run: `node scripts/verify-supplementary-export.mjs`

Expected: exit code 0 and output `4 sheets, 527 source rows, totals and layout checks passed`.

- [ ] **Step 5: 전체 테스트와 빌드 확인**

Run: `npm test -- --run`

Expected: all tests pass; the closing fixture test may run only when its separate uploaded `.xls` fixture is present.

Run: `npm run build`

Expected: TypeScript and Vite build exit code 0.

---

### Task 5: 시각 검증과 Vercel 미리보기 배포

**Files:**
- Verify: `/tmp/school-budget-verification/2026_서울옥정초등학교_추경검토자료.xlsx`
- Deploy: current project files excluding `node_modules`, `dist`, tests and docs.

**Interfaces:**
- Consumes: Task 4의 검증된 `.xlsx`와 production build.
- Produces: Vercel preview URL for user approval.

- [ ] **Step 1: Excel 파일 시각 확인**

LibreOffice headless가 있으면 다음 명령으로 PDF를 만든다.

Run: `libreoffice --headless --convert-to pdf --outdir /tmp/school-budget-verification /tmp/school-budget-verification/2026_서울옥정초등학교_추경검토자료.xlsx`

Expected: PDF is created without conversion errors. Render every PDF page and inspect the first, middle and total rows of all four sheets for clipped headings, missing borders, incorrect red negatives and broken totals.

- [ ] **Step 2: 최종 회귀 확인**

Run: `npm test -- --run src/features/supplementary && npm run build`

Expected: all supplementary tests pass and build succeeds.

- [ ] **Step 3: Vercel 미리보기 배포**

Deploy the verified source to project `school-budget-portal` (`prj_PtuDzxhtmljjwTeshRdirwAY3GzD`) under team `team_LZ9fBwtJ5Z6i4ONPgTYynxbh` with target `preview`.

Expected: deployment reaches `READY`; authenticated fetch or share URL returns the built index page.

- [ ] **Step 4: 사용자 승인 대기**

미리보기 주소와 실제 생성 `.xlsx`를 사용자에게 제공한다. 사용자가 운영 배포를 명시적으로 승인하기 전에는 production target을 변경하지 않는다.

---

## Plan Self-Review

- Spec coverage: 네 시트, 동적 행, 계산식, 사용자 입력, 스타일, 필터, 틀 고정, 인쇄, 오류 처리, 실제 파일 검증과 배포가 Tasks 1–5에 포함됐다.
- Placeholder scan: 구현을 미루는 미확정 항목이 없다.
- Type consistency: `createSupplementaryExcelModel` → `buildSupplementaryWorkbook` → `serializeSupplementaryWorkbook` → `downloadSupplementaryWorkbook` 흐름의 이름과 인수가 일치한다.
- Scope: 결산 안건설명서와 다른 탭은 변경하지 않는다.
