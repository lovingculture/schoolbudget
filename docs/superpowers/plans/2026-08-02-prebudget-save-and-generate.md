# 성립전예산 임시저장·자동점검·기안문 생성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성립전예산 입력 전체를 브라우저에 임시저장·자동복원하고, 빈 행을 제외해 자동점검한 뒤 K-에듀파인 복사용 기안문 미리보기와 복사·Word·PDF·Excel 다운로드를 제공한다.

**Architecture:** 성립전예산을 `src/features/prebudget/` 독립 기능으로 분리한다. 입력 상태는 `PrebudgetFormDraft` 하나로 관리하고, 저장소·검증·기안문 변환·각 파일 출력은 순수 모듈 또는 좁은 UI 컴포넌트로 분리한다. 이번 저장 구현은 `localStorage` 어댑터를 사용하되 `DraftStorage` 인터페이스를 통해 추후 Supabase 어댑터로 교체한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, React Testing Library, docx 9.5, xlsx 0.18, jsPDF 3, html2canvas 1.4, localStorage, Vercel CLI

## Global Constraints

- 카카오 로그인은 활성화하지 않는다.
- 현재 브라우저의 고정 키 `school-budget-portal:prebudget-draft:v1`에 최신 초안 1개만 저장한다.
- 다른 PC나 브라우저에서는 복원되지 않는다.
- 기본정보에 편집 가능한 `학교명`을 추가하고 저장·기안문·파일명에 사용한다.
- 완전히 빈 행은 검증·미리보기·출력·총액에서 제외한다.
- 일부 입력된 행은 누락 필드와 항목 번호를 오류로 표시한다.
- 기안문은 같은 페이지 입력 화면 아래에 표시하고 생성 후 해당 영역으로 이동한다.
- 결과는 기안문 전체 복사, Word, PDF, Excel 다운로드를 제공한다.
- 기존 단위사업·세부사업 연동, 원가통계비목 20개·설명, 금액 계산을 유지한다.
- 구현 후 Vercel Preview로만 배포하며 별도 승인 전 운영 배포·promote·운영 도메인 연결을 실행하지 않는다.
- 이 폴더는 Git 저장소가 아니므로 커밋 단계는 수행하지 않는다.

---

### Task 1: 초안 타입·기본값·빈 행 정리·검증

**Files:**
- Create: `src/features/prebudget/types.ts`
- Create: `src/features/prebudget/draft.ts`
- Create: `src/features/prebudget/draft.test.ts`
- Create: `src/features/prebudget/validation.ts`
- Create: `src/features/prebudget/validation.test.ts`

**Interfaces:**
- Produces: `PrebudgetFormDraft`, `PrebudgetValidationIssue`, `createPrebudgetDraft(initialSchoolName)`, `isBlankPrebudgetItem(item)`, `activePrebudgetItems(items)`, `validatePrebudgetDraft(draft)`

- [ ] **Step 1: 빈 행 제외와 기본 초안 실패 테스트 작성**

```ts
it("기본 초안에 학교명과 빈 예산항목 5개를 만들고 빈 항목을 출력에서 제외한다", () => {
  const draft = createPrebudgetDraft("서울한빛초등학교");
  expect(draft.schoolName).toBe("서울한빛초등학교");
  expect(draft.source).toBe("목적사업비(교육청)");
  expect(draft.items).toHaveLength(5);
  expect(activePrebudgetItems(draft.items)).toEqual([]);
});
```

- [ ] **Step 2: 검증 규칙 실패 테스트 작성**

```ts
it("빈 행은 무시하고 일부 입력 행의 누락 필드와 0원 금액을 안내한다", () => {
  const draft = createPrebudgetDraft("서울한빛초등학교");
  draft.title = "안전인력 성립전예산";
  draft.department = "체육안전부";
  draft.requester = "김담당";
  draft.officialDocument = "교육지원과-1234(2026. 8. 1.)";
  draft.items[0] = { ...draft.items[0], unitBusiness: "학생 복지", description: "안전인력 봉사비" };
  expect(validatePrebudgetForm(draft).map((issue) => issue.message)).toEqual([
    "1번 항목: 세부사업을 선택하세요.",
    "1번 항목: 세부항목을 입력하세요.",
    "1번 항목: 요구금액은 0원보다 커야 합니다.",
  ]);
});
```

- [ ] **Step 3: 새 테스트가 모듈 부재로 실패하는지 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/draft.test.ts src/features/prebudget/validation.test.ts
```

Expected: FAIL. 새 모듈을 찾을 수 없다.

- [ ] **Step 4: 타입과 기본 초안 구현**

`types.ts`에 다음 타입을 정의한다.

```ts
import type { DraftItem } from "../../domain/prebudget";

export interface PrebudgetFormDraft {
  schoolName: string;
  fiscalYear: number;
  source: "보조금(구청)" | "목적사업비(교육청)" | "수익자부담경비(학부모)";
  title: string;
  department: string;
  requester: string;
  officialDocument: string;
  items: DraftItem[];
  savedAt?: string;
}

export interface PrebudgetValidationIssue {
  field: string;
  itemIndex?: number;
  message: string;
}
```

`draft.ts`는 기존 `blankItem()`과 같은 기본 항목을 만들고 `category: "일반수용비"`, 숫자값 0을 보장한다. 빈 행 판단은 단위사업·세부사업·세부항목·산출내역이 빈 문자열이고 단가·수량·횟수가 0인지 확인하며 category는 판단에서 제외한다.

- [ ] **Step 5: 자동점검 구현**

`validation.ts`는 학교명, 문서 제목, 부서명, 요구자, 관련 공문을 순서대로 검사한다. 각 활성 항목은 단위사업, 세부사업, 세부항목, 원가통계비목, 산출내역, `calculateRequestedAmount(item) > 0`을 검사하고 위 테스트의 한국어 메시지를 반환한다.

- [ ] **Step 6: 대상 테스트 통과 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/draft.test.ts src/features/prebudget/validation.test.ts
```

Expected: 두 테스트 파일 모두 PASS.

---

### Task 2: 브라우저 저장소와 자동 복원

**Files:**
- Create: `src/features/prebudget/storage.ts`
- Create: `src/features/prebudget/storage.test.ts`

**Interfaces:**
- Consumes: `PrebudgetFormDraft`
- Produces: `DraftStorage`, `createBrowserDraftStorage(storage?: Storage)`, `PREBUDGET_DRAFT_KEY`

- [ ] **Step 1: 저장·복원·손상 복구 실패 테스트 작성**

```ts
it("학교명을 포함한 최신 초안을 저장하고 복원한다", () => {
  const memory = createMemoryStorage();
  const storage = createBrowserDraftStorage(memory);
  const draft = { ...createPrebudgetDraft("서울한빛초등학교"), title: "체험학습 성립전예산" };
  storage.save(draft);
  expect(storage.load()).toMatchObject({ schoolName: "서울한빛초등학교", title: "체험학습 성립전예산" });
});

it("손상된 JSON은 제거하고 null을 반환한다", () => {
  const memory = createMemoryStorage({ [PREBUDGET_DRAFT_KEY]: "{" });
  const storage = createBrowserDraftStorage(memory);
  expect(storage.load()).toBeNull();
  expect(memory.getItem(PREBUDGET_DRAFT_KEY)).toBeNull();
});
```

테스트 파일 안에 다음 메모리 저장소를 정의한다.

```ts
function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(key) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); },
    setItem(key, value) { values.set(key, value); },
  };
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/storage.test.ts
```

Expected: FAIL. storage 모듈이 없다.

- [ ] **Step 3: 저장소 인터페이스와 localStorage 어댑터 구현**

```ts
export const PREBUDGET_DRAFT_KEY = "school-budget-portal:prebudget-draft:v1";

export interface DraftStorage {
  load(): PrebudgetFormDraft | null;
  save(draft: PrebudgetFormDraft): void;
  clear(): void;
}

export function createBrowserDraftStorage(storage: Storage = window.localStorage): DraftStorage {
  return {
    load() {
      const raw = storage.getItem(PREBUDGET_DRAFT_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw) as PrebudgetFormDraft; }
      catch { storage.removeItem(PREBUDGET_DRAFT_KEY); return null; }
    },
    save(draft) { storage.setItem(PREBUDGET_DRAFT_KEY, JSON.stringify(draft)); },
    clear() { storage.removeItem(PREBUDGET_DRAFT_KEY); },
  };
}
```

- [ ] **Step 4: 저장소 테스트 통과 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/storage.test.ts
```

Expected: 모든 저장소 테스트 PASS.

---

### Task 3: 기안문 표시 데이터·복사 텍스트·미리보기

**Files:**
- Create: `src/features/prebudget/createDocument.ts`
- Create: `src/features/prebudget/createDocument.test.ts`
- Create: `src/features/prebudget/testFixtures.ts`
- Create: `src/features/prebudget/PrebudgetPreview.tsx`
- Create: `src/features/prebudget/PrebudgetPreview.test.tsx`

**Interfaces:**
- Produces: `PrebudgetDocument`, `createPrebudgetDocument(draft)`, `PrebudgetPreview({ document, onCopy })`

`testFixtures.ts`에 다음 고정 fixture를 만든다.

```ts
export function createPrebudgetDocumentFixture() {
  const draft = createPrebudgetDraft("서울한빛초등학교");
  Object.assign(draft, {
    title: "안전인력 성립전예산",
    department: "체육안전부",
    requester: "김담당",
    officialDocument: "교육지원과-1234(2026. 8. 1.)",
  });
  draft.items[0] = {
    ...draft.items[0], unitBusiness: "학생 복지", business: "학생 복지운영",
    detail: "안전인력", description: "봉사비", unitPrice: 30_000, quantity: 10, count: 1,
  };
  return createPrebudgetDocument(draft);
}
```

- [ ] **Step 1: 기안문 내용·총액 실패 테스트 작성**

```ts
it("활성 항목만 포함한 기안문과 복사용 본문을 만든다", () => {
  const draft = createPrebudgetDraft("서울한빛초등학교");
  Object.assign(draft, { title: "안전인력 성립전예산", department: "체육안전부", requester: "김담당", officialDocument: "교육지원과-1234(2026. 8. 1.)" });
  draft.items[0] = { ...draft.items[0], unitBusiness: "학생 복지", business: "학생 복지운영", detail: "안전인력", description: "봉사비", unitPrice: 30_000, quantity: 10, count: 1 };
  const document = createPrebudgetDocument(draft);
  expect(document.items).toHaveLength(1);
  expect(document.total).toBe(300_000);
  expect(document.copyText).toContain("예산요구 총액: 300,000원");
  expect(document.copyText).toContain("붙임  성립전예산 요구내역 1부.  끝.");
});
```

- [ ] **Step 2: 미리보기와 복사 요청 실패 테스트 작성**

```tsx
it("기안문 표를 표시하고 전체 복사를 요청한다", async () => {
  const user = userEvent.setup();
  let copied = "";
  const documentFixture = createPrebudgetDocumentFixture();
  render(<PrebudgetPreview document={documentFixture} onCopy={async (text) => { copied = text; }} />);
  expect(screen.getByRole("heading", { name: "안전인력 성립전예산" })).toBeVisible();
  expect(screen.getByText("300,000원")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "기안문 전체 복사" }));
  expect(copied).toBe(documentFixture.copyText);
});
```

- [ ] **Step 3: 실패 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/createDocument.test.ts src/features/prebudget/PrebudgetPreview.test.tsx
```

Expected: FAIL. 기안문 모듈과 컴포넌트가 없다.

- [ ] **Step 4: 기안문 데이터 변환 구현**

`PrebudgetDocument`는 `schoolName`, `fiscalYear`, `source`, `title`, `department`, `requester`, `officialDocument`, `items`, `total`, `copyText`를 가진다. `items`는 `activePrebudgetItems()` 결과에 `amount`를 추가한 배열이다. `copyText`는 설계서 순서의 1~7 항목을 줄바꿈과 탭으로 조합한다.

- [ ] **Step 5: 미리보기와 복사 UI 구현**

`PrebudgetPreview`는 `.prebudget-a4-page` 안에 제목, 관련 공문, 편성 요청 문구, 회계연도·재원구분·총액, 6개 열 상세 표, 붙임 문구를 표시한다. `기안문 전체 복사` 클릭은 `onCopy(document.copyText)`를 호출하고 성공 시 `복사했습니다.`를 표시한다.

- [ ] **Step 6: 대상 테스트 통과 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/createDocument.test.ts src/features/prebudget/PrebudgetPreview.test.tsx
```

Expected: 모두 PASS.

---

### Task 4: Word·PDF·Excel 출력과 다운로드 UI

**Files:**
- Create: `src/features/prebudget/exportWord.ts`
- Create: `src/features/prebudget/exportPdf.ts`
- Create: `src/features/prebudget/exportExcel.ts`
- Create: `src/features/prebudget/exporters.test.ts`
- Create: `src/features/prebudget/exportPdf.test.ts`
- Create: `src/features/prebudget/PrebudgetDownloads.tsx`

**Interfaces:**
- Consumes: `PrebudgetDocument`
- Produces: `exportPrebudgetWord(document): Promise<Blob>`, `exportPrebudgetPdf(pages): Promise<Blob>`, `exportPrebudgetExcel(document): Blob`, `safePrebudgetFilename(document)`, `PrebudgetDownloads`

- [ ] **Step 1: Word·Excel Blob과 파일명 실패 테스트 작성**

```ts
it("Word와 두 시트 Excel 파일을 만든다", async () => {
  const documentFixture = createPrebudgetDocumentFixture();
  const word = await exportPrebudgetWord(documentFixture);
  const excel = exportPrebudgetExcel(documentFixture);
  expect(word.type).toContain("wordprocessingml");
  expect(word.size).toBeGreaterThan(1000);
  expect(excel.type).toContain("spreadsheetml");
  expect(excel.size).toBeGreaterThan(1000);
  const workbook = XLSX.read(await excel.arrayBuffer());
  expect(workbook.SheetNames).toEqual(["기안문", "예산요구내역"]);
  expect(safePrebudgetFilename(documentFixture)).toBe("2026학년도_서울한빛초등학교_안전인력_성립전예산");
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/exporters.test.ts
```

Expected: FAIL. exporter 모듈이 없다.

- [ ] **Step 3: Word와 Excel 구현**

Word는 `docx`의 `Document`, `Paragraph`, `Table`, `TableRow`, `TableCell`, `Packer`를 사용해 제목·본문·상세표·붙임을 만든다. Excel은 `xlsx`로 `기안문`과 `예산요구내역` 두 시트를 만들고 상세 시트의 머리글은 `단위사업, 세부사업, 세부항목, 원가통계비목, 산출내역, 단가, 수량, 횟수, 요구금액` 순서로 고정한다. 마지막 행에 합계를 숫자 셀로 넣고 금액 열에 `#,##0` 형식을 지정한다.

`safePrebudgetFilename()`은 문서 제목 끝의 `성립전예산`을 한 번 제거한 뒤 `<회계연도>학년도_<학교명>_<정리된 제목>_성립전예산`을 만들고 `\\ / : * ? " < > |` 문자를 `_`로, 연속 공백을 `_`로 바꾼다.

- [ ] **Step 4: PDF와 다운로드 UI 구현**

PDF는 기존 `exportClosingPdf` 패턴과 동일하게 `.prebudget-a4-page` 요소를 html2canvas로 렌더링하고 A4 세로 jsPDF Blob을 반환한다. `PrebudgetDownloads`는 PDF·Word·Excel 버튼, 작업 중 상태, 실패 메시지를 관리하며 안전한 파일명에 `.pdf`, `.docx`, `.xlsx` 확장자를 붙여 브라우저 다운로드를 실행한다.

`exportPdf.test.ts`에서는 html2canvas가 `toDataURL()`을 가진 canvas를 반환하도록 하고 jsPDF 테스트 대역이 `output("blob")`에서 `new Blob(["pdf"], { type: "application/pdf" })`를 반환하도록 모듈 경계만 대체한다. 실제 `.prebudget-a4-page` HTMLElement 두 개를 전달해 `addPage`가 1회, `addImage`가 2회 호출되고 반환 Blob type이 `application/pdf`인지 검증한다.

- [ ] **Step 5: exporter 테스트 통과 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/exporters.test.ts
npm run test:run -- src/features/prebudget/exportPdf.test.ts
```

Expected: Word, Excel, PDF orchestration 테스트 PASS.

---

### Task 5: 입력 화면·저장·검증·미리보기 통합

**Files:**
- Create: `src/features/prebudget/PrebudgetPage.tsx`
- Create: `src/features/prebudget/PrebudgetPage.test.tsx`
- Create: `src/features/prebudget/prebudget.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: Tasks 1~4의 타입, 저장소, 검증, 기안문, 미리보기, 다운로드
- Produces: `<PrebudgetPage initialSchoolName={schoolName} />`

- [ ] **Step 1: 임시저장·자동복원 통합 실패 테스트 작성**

```tsx
it("학교명과 입력값을 임시저장하고 다시 렌더링하면 자동 복원한다", async () => {
  const user = userEvent.setup();
  const storage = createBrowserDraftStorage(window.localStorage);
  const first = render(<PrebudgetPage initialSchoolName="학교예산 업무공간" storage={storage} />);
  await user.clear(screen.getByLabelText("학교명"));
  await user.type(screen.getByLabelText("학교명"), "서울한빛초등학교");
  await user.clear(screen.getByLabelText("문서 제목"));
  await user.type(screen.getByLabelText("문서 제목"), "안전인력 성립전예산");
  await user.click(screen.getByRole("button", { name: "임시저장" }));
  expect(screen.getByText(/임시저장 완료/)).toBeVisible();
  first.unmount();
  render(<PrebudgetPage initialSchoolName="학교예산 업무공간" storage={storage} />);
  expect(screen.getByLabelText("학교명")).toHaveValue("서울한빛초등학교");
  expect(screen.getByLabelText("문서 제목")).toHaveValue("안전인력 성립전예산");
});
```

- [ ] **Step 2: 자동점검 오류와 생성 성공 실패 테스트 작성**

```tsx
it("빈 행은 무시하고 유효한 한 항목으로 기안문을 생성한다", async () => {
  const user = userEvent.setup();
  window.localStorage.clear();
  const storage = createBrowserDraftStorage(window.localStorage);
  render(<PrebudgetPage initialSchoolName="서울한빛초등학교" storage={storage} />);
  await user.clear(screen.getByLabelText("문서 제목"));
  await user.type(screen.getByLabelText("문서 제목"), "안전인력 성립전예산");
  await user.clear(screen.getByLabelText("부서명"));
  await user.type(screen.getByLabelText("부서명"), "체육안전부");
  await user.clear(screen.getByLabelText("요구자"));
  await user.type(screen.getByLabelText("요구자"), "김담당");
  await user.type(screen.getByLabelText("관련 공문"), "교육지원과-1234(2026. 8. 1.)");
  await user.selectOptions(screen.getAllByLabelText("단위사업")[0], "학생 복지");
  await user.selectOptions(screen.getAllByLabelText("세부사업")[0], "학생 복지운영");
  await user.type(screen.getAllByLabelText("세부항목")[0], "안전인력");
  await user.type(screen.getAllByLabelText("산출내역")[0], "봉사비");
  await user.type(screen.getAllByLabelText("단가")[0], "30000");
  await user.type(screen.getAllByLabelText("수량")[0], "10");
  await user.type(screen.getAllByLabelText("횟수")[0], "1");
  await user.click(screen.getByRole("button", { name: "자동점검 후 기안문 생성" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "안전인력 성립전예산" })).toBeVisible();
  expect(screen.getByText("300,000원")).toBeVisible();
});
```

- [ ] **Step 3: 통합 테스트 실패 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/PrebudgetPage.test.tsx
```

Expected: FAIL. PrebudgetPage가 없다.

- [ ] **Step 4: 기존 Prebudget JSX를 새 페이지로 이동하고 모든 기본정보를 제어 입력으로 연결**

`PrebudgetPage`는 `useState(() => storage.load() ?? createPrebudgetDraft(initialSchoolName))`로 시작한다. 학교명, 회계연도, 재원구분, 문서 제목, 부서명, 요구자, 관련 공문과 items를 모두 draft 상태에 연결한다. 기존 단위사업 변경 시 세부사업 초기화, 항목 추가·삭제, 원가통계비목 설명, 금액 합계 동작을 그대로 이동한다.

- [ ] **Step 5: 임시저장과 자동점검 버튼 연결**

임시저장은 `savedAt: new Date().toISOString()`을 포함한 초안을 `storage.save()`에 전달하고 상태 메시지를 갱신한다. 생성 버튼은 `validatePrebudgetForm(draft)`를 실행하여 오류가 있으면 `role="alert"` 목록을 표시하고, 없으면 `createPrebudgetDocument(draft)` 결과를 상태에 저장하여 `PrebudgetPreview`와 `PrebudgetDownloads`를 렌더링한다. 생성 후 `requestAnimationFrame`에서 preview ref의 `scrollIntoView({ behavior: "smooth", block: "start" })`를 호출한다.

- [ ] **Step 6: App 연결 단순화**

`Portal`의 `items`, `total`, `updateItem` 상태와 기존 내부 `Prebudget` 함수를 제거한다. prebudget view는 다음 코드만 렌더링한다.

```tsx
{view === "prebudget" && <PrebudgetPage initialSchoolName={schoolName} />}
```

`App.test.tsx`의 기존 성립전예산 금액·단위사업·재원구분·원가통계비목 테스트는 새 페이지를 통해 그대로 통과해야 한다.

- [ ] **Step 7: 화면과 기존 App 테스트 통과 확인**

Run:

```bash
npm run test:run -- src/features/prebudget/PrebudgetPage.test.tsx src/App.test.tsx
```

Expected: 두 테스트 파일 모두 PASS.

- [ ] **Step 8: 반응형·인쇄 스타일 구현**

`prebudget.css`에 검증 오류 상자, 저장 상태, 다운로드 카드, `.prebudget-a4-page` A4 세로 미리보기, 표, 복사 버튼을 정의한다. 900px 이하에서는 입력과 설명을 한 열로 만들고 미리보기는 가로 스크롤을 허용한다. `@media print`에서는 앱의 다른 요소를 숨기고 `.prebudget-a4-page`만 인쇄한다.

---

### Task 6: 전체 검증과 Vercel Preview 배포

**Files:**
- Read: `.vercel/project.json`
- No source files modified

- [ ] **Step 1: 전체 테스트와 빌드 실행**

Run:

```bash
npm run test:run
npm run build
```

Expected: 전체 테스트 PASS, TypeScript 오류 없음, Vite build 성공.

- [ ] **Step 2: Preview 배포만 실행**

Run:

```bash
env npm_config_cache=/tmp/school-budget-vercel-npm-cache \
  XDG_CACHE_HOME=/tmp/school-budget-vercel-xdg-cache \
  XDG_CONFIG_HOME=/tmp/school-budget-vercel-xdg-config \
  XDG_DATA_HOME=/tmp/school-budget-vercel-xdg-data \
  npx --yes vercel@latest deploy --yes
```

Expected: `school-budget-portal`에 target이 Production이 아닌 새 Preview를 생성한다. `--prod`, `promote`, 도메인 명령은 실행하지 않는다.

- [ ] **Step 3: Preview 상태와 접근 검증**

새 배포가 `READY`, target `null`인지 확인하고 Vercel 인증 curl로 루트 페이지 HTTP 200을 확인한다. 사용자에게 Preview URL과 운영 미배포 사실을 전달한다.
