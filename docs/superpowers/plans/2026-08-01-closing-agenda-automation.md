# 결산 안건설명서 자동화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에듀파인 세입세출결산총괄표를 브라우저에서 분석하고 전체 내용을 수정한 뒤 A4 2쪽 PDF·Word·Excel 안건설명서를 생성한다.

**Architecture:** 파일은 서버로 전송하지 않고 브라우저에서 SheetJS로 읽는다. 결산 데이터 분석, 합계 검증, 편집 상태, A4 미리보기, 세 가지 내보내기를 독립 모듈로 분리하며 `ClosingPage`가 전체 흐름을 조정한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, SheetJS xlsx 0.18.5, docx 9.5.1, jsPDF 3.0.1, Vitest, Testing Library

## Global Constraints

- 입력 형식은 에듀파인 `세입세출결산총괄표`의 `.xls`, `.xlsx`만 허용한다.
- 원본 파일은 브라우저 메모리에서만 처리하고 Supabase나 다른 서버로 전송하지 않는다.
- 제안연월일·안건번호·제안자·제안설명자를 포함한 모든 출력 항목을 수정 가능하게 한다.
- 기준 출력은 제공된 PDF와 같은 A4 세로 2쪽이다.
- PDF·Word·Excel을 각각 내려받을 수 있어야 한다.
- 금액은 원 단위 정수와 천 단위 쉼표를 사용하고, 출력 문서에서는 0원을 `-`로 표시한다.
- 현재 비활성화된 카카오 인증 흐름을 변경하거나 다시 활성화하지 않는다.
- 현재 작업 폴더에는 Git 저장소가 없으므로 각 작업의 commit 단계는 검증 완료 시점의 소스 체크포인트 기록으로 대체한다.

---

## File Structure

- `src/features/closing/types.ts`: 결산 원본·편집문서·검증결과의 공통 타입
- `src/features/closing/parser.ts`: 에듀파인 통합문서 판별과 데이터 추출
- `src/features/closing/parser.test.ts`: 제공된 실제 `.xls` 픽스처 기반 파서 검사
- `src/features/closing/validation.ts`: 총괄·세입·세출·잉여금 검증
- `src/features/closing/validation.test.ts`: 정상·불일치 검증
- `src/features/closing/createDraft.ts`: 추출 데이터에서 수정 가능한 안건 초안 생성
- `src/features/closing/createDraft.test.ts`: 기본 문구·학년도·사용자 입력 기본값 검사
- `src/features/closing/ClosingPage.tsx`: 업로드부터 편집·미리보기·다운로드까지 상태 조정
- `src/features/closing/ClosingPage.test.tsx`: 드래그, 오류, 편집 진입, 다운로드 버튼 UI 검사
- `src/features/closing/ClosingEditor.tsx`: 모든 문구·금액·비율 편집 폼
- `src/features/closing/ClosingAgendaPreview.tsx`: A4 2쪽 화면 미리보기
- `src/features/closing/exportPdf.ts`: 한글 폰트를 포함한 2쪽 PDF
- `src/features/closing/exportWord.ts`: 수정 가능한 DOCX
- `src/features/closing/exportExcel.ts`: 검증 시트와 심의안건 시트를 포함한 XLSX
- `src/features/closing/exporters.test.ts`: 세 출력 파일의 형식·핵심 문자열·시트 검사
- `src/features/closing/format.ts`: 금액·비율 표시와 파일명 생성
- `src/features/closing/format.test.ts`: 0원·천 단위·파일명 검사
- `src/App.tsx`: 기존 `closing` 준비 중 화면을 `ClosingPage`로 교체
- `src/styles.css`: 드롭존·편집기·검증표·A4 미리보기 반응형 스타일
- `public/fonts/NotoSansKR-Regular.ttf`: PDF 한글 글꼴
- `public/fonts/NotoSansKR-Bold.ttf`: PDF 한글 굵은 글꼴
- `test/fixtures/세입세출결산총괄표.xls`: 사용자가 제공한 실제 입력 예시

### Task 1: 결산 도메인 타입과 표시 규칙

**Files:**
- Create: `src/features/closing/types.ts`
- Create: `src/features/closing/format.ts`
- Create: `src/features/closing/format.test.ts`

**Interfaces:**
- Produces: `ClosingSource`, `ClosingAgendaDraft`, `ValidationResult`, `formatWon(value)`, `formatRatio(value)`, `closingFileBaseName(year)`

- [ ] **Step 1: 표시 규칙의 실패 테스트 작성**

```ts
expect(formatWon(0)).toBe("-");
expect(formatWon(2724818217)).toBe("2,724,818,217");
expect(formatRatio(5)).toBe("5.0");
expect(closingFileBaseName(2025)).toBe("1.(심의안건) 2025학년도 학교회계 세입세출 결산 (안)");
```

- [ ] **Step 2: 테스트가 함수 미정의로 실패하는지 확인**

Run: `npm run test:run -- src/features/closing/format.test.ts`

Expected: FAIL with missing export errors.

- [ ] **Step 3: 공통 타입과 최소 표시 함수 구현**

```ts
export type IncomeRow = { chapter: string; section: string; amount: number; ratio: number };
export type ExpenseRow = { policy: string; amount: number; ratio: number };
export type ClosingSource = {
  fiscalYear: number; schoolName: string; budget: number; currentBudget: number;
  incomeTotal: number; expenseTotal: number; surplus: number;
  carryovers: { specified: number; accident: number; continuing: number };
  subsidyReturn: number; priorTransfer: number; afterTransfer: number; netSurplus: number;
  incomeRows: IncomeRow[]; expenseRows: ExpenseRow[];
};
export type ValidationResult = { id: string; label: string; expected: number; actual: number; ok: boolean };
export const formatWon = (value: number) => value === 0 ? "-" : Math.round(value).toLocaleString("ko-KR");
export const formatRatio = (value: number) => Number(value).toFixed(1);
export const closingFileBaseName = (year: number) =>
  `1.(심의안건) ${year}학년도 학교회계 세입세출 결산 (안)`;
```

- [ ] **Step 4: 표시 테스트 통과 확인**

Run: `npm run test:run -- src/features/closing/format.test.ts`

Expected: PASS.

- [ ] **Step 5: 전체 테스트 실행 후 체크포인트 기록**

Run: `npm run test:run`

Expected: existing tests and new tests all PASS.

### Task 2: 에듀파인 파일 판별과 데이터 추출

**Files:**
- Create: `src/features/closing/parser.ts`
- Create: `src/features/closing/parser.test.ts`
- Create: `test/fixtures/세입세출결산총괄표.xls`

**Interfaces:**
- Consumes: `ClosingSource`
- Produces: `parseClosingWorkbook(data: ArrayBuffer): ClosingSource`, `ClosingParseError`

- [ ] **Step 1: 제공 파일의 핵심 추출값 실패 테스트 작성**

```ts
const source = parseClosingWorkbook(fixture.buffer);
expect(source.fiscalYear).toBe(2025);
expect(source.schoolName).toContain("서울옥정초등학교");
expect(source.incomeTotal).toBe(2724818217);
expect(source.expenseTotal).toBe(2698568069);
expect(source.surplus).toBe(26250148);
expect(source.carryovers.specified).toBe(4466880);
expect(source.incomeRows).toHaveLength(6);
expect(source.expenseRows).toHaveLength(7);
```

- [ ] **Step 2: 파서가 없어 실패하는지 확인**

Run: `npm run test:run -- src/features/closing/parser.test.ts`

Expected: FAIL with `parseClosingWorkbook` missing.

- [ ] **Step 3: 표제어 우선 탐색 파서 구현**

```ts
const workbook = XLSX.read(data, { type: "array" });
const sheetName = workbook.SheetNames.find(name => name.includes("세입세출결산총괄표"));
if (!sheetName) throw new ClosingParseError("세입세출결산총괄표 시트를 찾을 수 없습니다.");
const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
  header: 1, raw: true, defval: "",
});
const titleCell = rows.flat().find(value => typeof value === "string" && /\d{4}년도 학교회계 결산총괄표/.test(value));
if (typeof titleCell !== "string") throw new ClosingParseError("결산총괄표 제목을 찾을 수 없습니다.");
```

표제행을 찾은 뒤 병합 셀의 좌측 상단값과 숫자 열을 기준으로 총괄·잉여금·세입·세출 영역을 각각 읽는다. 현재 양식의 알려진 위치는 표제 탐색 실패 시가 아니라 값 교차검증에만 사용한다.

- [ ] **Step 4: 다른 통합문서 거절 테스트 추가**

```ts
const otherWorkbook = XLSX.write(
  { SheetNames: ["다른보고서"], Sheets: { 다른보고서: XLSX.utils.aoa_to_sheet([["집행현황"]]) } },
  { type: "array", bookType: "xlsx" },
);
expect(() => parseClosingWorkbook(otherWorkbook))
  .toThrow("에듀파인 세입세출결산총괄표가 아닙니다");
```

- [ ] **Step 5: 실제 픽스처 테스트 통과 확인**

Run: `npm run test:run -- src/features/closing/parser.test.ts`

Expected: both extraction and rejection tests PASS.

- [ ] **Step 6: 전체 테스트 실행 후 체크포인트 기록**

Run: `npm run test:run`

Expected: all tests PASS.

### Task 3: 결산 합계 검증과 수정 가능한 초안

**Files:**
- Create: `src/features/closing/validation.ts`
- Create: `src/features/closing/validation.test.ts`
- Create: `src/features/closing/createDraft.ts`
- Create: `src/features/closing/createDraft.test.ts`

**Interfaces:**
- Consumes: `ClosingSource`
- Produces: `validateClosing(source): ValidationResult[]`, `createClosingDraft(source): ClosingAgendaDraft`

- [ ] **Step 1: 네 가지 검증의 실패 테스트 작성**

```ts
const results = validateClosing(source);
expect(results.map(result => result.ok)).toEqual([true, true, true, true]);
const broken = { ...source, surplus: source.surplus + 1 };
expect(validateClosing(broken)[0].ok).toBe(false);
```

- [ ] **Step 2: 초안 기본 문구의 실패 테스트 작성**

```ts
const draft = createClosingDraft(source);
expect(draft.title).toBe("2025학년도 학교회계 세입·세출 결산(안)");
expect(draft.proposer).toBe("학교장");
expect(draft.presenter).toBe("행정실장");
expect(draft.attachment).toContain("2025학년도 결산서 및 부속자료");
```

- [ ] **Step 3: 두 테스트가 함수 미정의로 실패하는지 확인**

Run: `npm run test:run -- src/features/closing/validation.test.ts src/features/closing/createDraft.test.ts`

Expected: FAIL with missing exports.

- [ ] **Step 4: 검증 함수 구현**

```ts
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export function validateClosing(source: ClosingSource): ValidationResult[] {
  return [
    compare("surplus", "세입결산액 - 세출결산액 = 세계잉여금", source.incomeTotal - source.expenseTotal, source.surplus),
    compare("income", "세입 결산내역 합계 = 세입결산액", sum(source.incomeRows.map(row => row.amount)), source.incomeTotal),
    compare("expense", "세출 결산내역 합계 = 세출결산액", sum(source.expenseRows.map(row => row.amount)), source.expenseTotal),
    compare("surplus-use", "이월·반환·순세계잉여금 합계 = 세계잉여금",
      source.carryovers.specified + source.carryovers.accident + source.carryovers.continuing + source.subsidyReturn + source.netSurplus,
      source.surplus),
  ];
}
```

- [ ] **Step 5: 모든 필드가 복제된 편집 초안 구현**

`ClosingAgendaDraft`는 제안정보, 제목·근거·이유·별첨, 총괄금액, 잉여금 행, 세입 행, 세출 행을 모두 포함한다. 배열과 중첩 객체를 새로 생성해 원본 `ClosingSource`를 수정하지 않는다.

- [ ] **Step 6: 검증·초안 테스트와 전체 테스트 통과 확인**

Run: `npm run test:run`

Expected: all tests PASS.

### Task 4: 드래그 업로드와 검증 결과 화면

**Files:**
- Create: `src/features/closing/ClosingPage.tsx`
- Create: `src/features/closing/ClosingPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `parseClosingWorkbook`, `validateClosing`, `createClosingDraft`
- Produces: 결산 탭 업로드·오류·검증·편집 상태

- [ ] **Step 1: 업로드 안내 문구와 파일 선택 실패 테스트 작성**

```tsx
render(<ClosingPage />);
expect(screen.getByText(/세입세출결산총괄표.*끌어다 놓으세요/)).toBeVisible();
expect(screen.getByText(/학교회계.*예산결산.*결산서 일괄 출력/)).toBeVisible();
expect(screen.getByRole("button", { name: "파일 선택" })).toBeVisible();
```

- [ ] **Step 2: 잘못된 파일 오류 테스트 작성**

```tsx
await user.upload(input, new File(["bad"], "다른보고서.csv", { type: "text/csv" }));
expect(screen.getByRole("alert")).toHaveTextContent("세입세출결산총괄표");
```

- [ ] **Step 3: UI 테스트 실패 확인**

Run: `npm run test:run -- src/features/closing/ClosingPage.test.tsx`

Expected: FAIL because `ClosingPage` is missing.

- [ ] **Step 4: 접근 가능한 드롭존과 상태 전환 구현**

```tsx
<label className={dragging ? "closing-dropzone dragging" : "closing-dropzone"}>
  <input type="file" accept=".xls,.xlsx" onChange={handleFiles} />
  <strong>에듀파인 「세입세출결산총괄표」를 여기에 끌어다 놓으세요</strong>
  <span>학교회계 → 예산결산 → 결산서 → 결산서 일괄 출력 → 세입세출결산총괄표 → 엑셀 다운로드</span>
  <button type="button">파일 선택</button>
</label>
```

`dragenter`, `dragover`, `dragleave`, `drop`을 처리하고 확장자·파서 오류를 한국어로 표시한다. 정상 파일은 학교명·학년도·주요금액과 검증 결과를 먼저 표시한다.

- [ ] **Step 5: 앱의 결산설명서 메뉴 연결**

```tsx
{view === "closing" && <ClosingPage />}
```

기존 `ComingSoon` 조건에서 `closing`을 제거한다.

- [ ] **Step 6: UI 테스트와 전체 테스트 통과 확인**

Run: `npm run test:run`

Expected: all tests PASS.

### Task 5: 전체 편집기와 원본값 복구

**Files:**
- Create: `src/features/closing/ClosingEditor.tsx`
- Create: `src/features/closing/ClosingEditor.test.tsx`
- Modify: `src/features/closing/ClosingPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `ClosingAgendaDraft`, 원본 초안
- Produces: `onChange(nextDraft)`, `onResetField(path)`

- [ ] **Step 1: 제안정보와 표 금액 편집 실패 테스트 작성**

```tsx
await user.clear(screen.getByLabelText("안건번호"));
await user.type(screen.getByLabelText("안건번호"), "7");
await user.clear(screen.getByLabelText("예산액"));
await user.type(screen.getByLabelText("예산액"), "2727447001");
expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ agendaNumber: "7" }));
```

- [ ] **Step 2: 수정 표시와 원본 복구 실패 테스트 작성**

```tsx
expect(screen.getByText("수정됨")).toBeVisible();
await user.click(screen.getByRole("button", { name: "예산액 원본값으로 되돌리기" }));
expect(screen.getByLabelText("예산액")).toHaveValue(2727447000);
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test:run -- src/features/closing/ClosingEditor.test.tsx`

Expected: FAIL because editor is missing.

- [ ] **Step 4: 섹션별 편집 컴포넌트 구현**

제안정보, 본문, 총괄표, 잉여금표, 세입표, 세출표, 별첨 순서로 접을 수 있는 섹션을 제공한다. 숫자 입력은 빈 문자열을 임시 허용하고 blur 시 0 또는 유효한 숫자로 정규화한다. 각 입력은 명시적인 `label`과 오류 설명을 갖는다.

- [ ] **Step 5: 원본 초안과 현재 초안의 경로별 비교 구현**

```ts
const changed = current.budget !== original.budget;
<button aria-label="예산액 원본값으로 되돌리기" disabled={!changed}
  onClick={() => update("budget", original.budget)}>원본값</button>
```

중첩 행은 행 ID와 필드명을 함께 사용해 비교한다.

- [ ] **Step 6: 편집기와 전체 테스트 통과 확인**

Run: `npm run test:run`

Expected: all tests PASS.

### Task 6: A4 2쪽 미리보기

**Files:**
- Create: `src/features/closing/ClosingAgendaPreview.tsx`
- Create: `src/features/closing/ClosingAgendaPreview.test.tsx`
- Modify: `src/features/closing/ClosingPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `ClosingAgendaDraft`, `formatWon`, `formatRatio`
- Produces: 두 개의 `article.closing-a4-page`

- [ ] **Step 1: 두 쪽 구조와 핵심 항목 실패 테스트 작성**

```tsx
render(<ClosingAgendaPreview draft={draft} />);
expect(screen.getAllByTestId("closing-a4-page")).toHaveLength(2);
expect(screen.getByText("2025학년도 학교회계 세입·세출 결산(안)")).toBeVisible();
expect(screen.getByText("2,724,818,217")).toBeVisible();
expect(screen.getByText(/별첨 1.*결산서 및 부속자료/)).toBeVisible();
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- src/features/closing/ClosingAgendaPreview.test.tsx`

Expected: FAIL because preview is missing.

- [ ] **Step 3: 기준 PDF를 따르는 두 페이지 구현**

1쪽은 제목, 안건번호 상자, 우측 제안정보, 제안 근거·이유, 총괄표, 잉여금표를 배치한다. 2쪽은 세입표·세출표·별첨을 배치한다. 표 제목 행은 연한 청회색, 금액은 우측 정렬, 합계는 굵게 표시한다.

- [ ] **Step 4: 화면과 인쇄 CSS 구현**

```css
.closing-a4-page{width:210mm;min-height:297mm;padding:20mm 17mm;background:#fff}
@media print{
  body *{visibility:hidden}
  .closing-preview,.closing-preview *{visibility:visible}
  .closing-a4-page{page-break-after:always;box-shadow:none;margin:0}
}
```

모바일에서는 페이지를 축소하지 않고 가로 스크롤로 읽을 수 있게 한다.

- [ ] **Step 5: 미리보기와 전체 테스트 통과 확인**

Run: `npm run test:run`

Expected: all tests PASS.

### Task 7: PDF·Word·Excel 생성

**Files:**
- Create: `public/fonts/NotoSansKR-Regular.ttf`
- Create: `public/fonts/NotoSansKR-Bold.ttf`
- Create: `src/features/closing/exportPdf.ts`
- Create: `src/features/closing/exportWord.ts`
- Create: `src/features/closing/exportExcel.ts`
- Create: `src/features/closing/exporters.test.ts`
- Modify: `src/features/closing/ClosingPage.tsx`

**Interfaces:**
- Consumes: `ClosingAgendaDraft`, 표시 함수, 파일명 함수
- Produces: `exportClosingPdf(draft): Promise<Blob>`, `exportClosingWord(draft): Promise<Blob>`, `exportClosingExcel(draft, validations): Promise<Blob>`

- [ ] **Step 1: 출력 파일 기본 검사 실패 테스트 작성**

```ts
expect((await exportClosingPdf(draft)).type).toBe("application/pdf");
expect((await exportClosingWord(draft)).size).toBeGreaterThan(1000);
const xlsxBlob = await exportClosingExcel(draft, validations);
const book = XLSX.read(await xlsxBlob.arrayBuffer(), { type: "array" });
expect(book.SheetNames).toEqual(["입력·검증", "심의안건"]);
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test:run -- src/features/closing/exporters.test.ts`

Expected: FAIL because exporters are missing.

- [ ] **Step 3: PDF 생성 구현**

`jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })`를 사용한다. 두 Noto Sans KR 글꼴을 `fetch`로 읽어 VFS에 등록하고, 기준 PDF 좌표에 맞춰 두 페이지의 본문과 표 선을 그린다. 긴 문구는 `splitTextToSize`로 나누고 페이지 하단 15mm를 침범하면 생성 오류로 처리한다.

- [ ] **Step 4: Word 생성 구현**

`docx`의 `Document`, `Paragraph`, `Table`, `TableRow`, `TableCell`, `PageBreak`를 사용한다. A4 여백을 밀리포인트로 지정하고 1쪽과 2쪽 사이에 명시적 페이지 나누기를 넣는다. 모든 값은 일반 텍스트와 표 셀로 작성해 Word에서 수정 가능하게 한다.

- [ ] **Step 5: Excel 생성 구현**

`xlsx`로 `입력·검증`과 `심의안건` 시트를 만든다. 검증 시트에는 원본값·계산값·결과를 쓰고, 심의안건 시트에는 A:H 병합과 열 너비·행 높이·인쇄영역 `A1:H47`을 설정한다. 총괄 합계와 세입·세출 합계는 셀 수식으로 유지한다.

- [ ] **Step 6: 세 다운로드 버튼 연결**

```tsx
<button onClick={() => download("pdf")}>PDF 내려받기</button>
<button onClick={() => download("docx")}>Word 내려받기</button>
<button onClick={() => download("xlsx")}>Excel 내려받기</button>
```

생성 중 버튼 비활성화, 개별 오류 표시, 수정 내용 유지, 같은 형식 재시도를 구현한다.

- [ ] **Step 7: 출력 테스트와 전체 테스트 통과 확인**

Run: `npm run test:run && npm run build`

Expected: all tests PASS and Vite production build succeeds.

### Task 8: 실제 파일·문서 시각 검증과 운영 배포

**Files:**
- Modify: `src/features/closing/parser.ts`
- Modify: `src/features/closing/ClosingAgendaPreview.tsx`
- Modify: `src/features/closing/exportPdf.ts`
- Modify: `src/features/closing/exportWord.ts`
- Modify: `src/features/closing/exportExcel.ts`

**Interfaces:**
- Consumes: 완료된 웹 흐름과 제공된 실제 입력 파일
- Produces: 검증된 운영 배포

- [ ] **Step 1: 실제 `.xls` 업로드 전체 흐름 실행**

결산설명서 탭에서 제공된 `세입세출결산총괄표(2).xls`를 드래그하고 학년도 2025, 세입 2,724,818,217원, 세출 2,698,568,069원, 세계잉여금 26,250,148원이 표시되는지 확인한다.

- [ ] **Step 2: 편집과 원본복구 확인**

안건번호·제안연월일·제안자·제안설명자와 표의 금액 하나를 수정한다. `수정됨` 표시와 원본값 복구가 작동하는지 확인한다.

- [ ] **Step 3: PDF 시각 검증**

PDF를 생성해 `pdfinfo`로 A4 2쪽을 확인하고 `pdftoppm -png`으로 두 페이지를 렌더링한다. 제목, 안건번호, 표, 금액, 별첨이 잘리지 않고 기준 PDF와 같은 순서로 배치되는지 육안 확인한다.

- [ ] **Step 4: Word 시각 검증**

DOCX를 PDF로 렌더링할 수 있는 환경에서 A4 2쪽, 한글, 표 너비, 페이지 나누기를 확인한다. 렌더러가 없으면 DOCX ZIP 내부의 `word/document.xml`과 `word/settings.xml`에서 핵심 문자열, A4 크기, 페이지 나누기를 검사하고 사용자에게 Word 화면 확인을 요청한다.

- [ ] **Step 5: Excel 값·수식·화면 검증**

`심의안건!A1:H47`과 `입력·검증!A1:D10`의 값·수식을 검사하고 오류값 `#REF!`, `#VALUE!`, `#DIV/0!`가 없는지 확인한다. 모든 시트를 렌더링해 제목·표·금액이 잘리지 않는지 확인한다.

- [ ] **Step 6: 반응형·오류 흐름 확인**

데스크톱과 모바일 너비에서 드롭존, 편집 폼, A4 미리보기, 다운로드 버튼을 확인한다. 잘못된 확장자와 다른 보고서가 한국어 오류 메시지로 거절되는지 확인한다.

- [ ] **Step 7: 최종 자동검사와 빌드**

Run: `npm run test:run && npm run build`

Expected: zero failing tests and successful production build.

- [ ] **Step 8: 운영 배포와 복구 체크포인트 갱신**

운영 별칭 `https://school-budget-portal.vercel.app`에 배포하고 상태가 `READY`인지 확인한다. 현재 소스와 설계·계획 문서를 포함한 복구용 ZIP을 새 버전으로 보존한다.
