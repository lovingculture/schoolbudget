# 예산 안건설명서 가독성 및 드래그 업로드 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예산 안건설명서의 입력·미리보기 글자를 읽기 쉽게 키우고, 큰 업로드 상자 전체에서 엑셀 드래그앤드롭이 작동하도록 한다.

**Architecture:** 기존 `BudgetAgendaPage`의 파서와 상태 흐름은 유지하면서 드롭 이벤트의 연결 위치만 큰 업로드 섹션으로 옮긴다. 글자 크기와 긴 세입 항목 표시 방식은 `budgetAgenda.css`의 범위 지정 선택자로 제한하여 다른 화면에 영향을 주지 않는다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, Vercel Preview

## Global Constraints

- `school-budget-portal` 프로젝트에 Preview로만 배포한다.
- 운영 배포, 운영 별칭 변경, Preview의 운영 승격을 수행하지 않는다.
- 기존 파서, 계산 결과, 다운로드 결과는 변경하지 않는다.

---

### Task 1: 큰 업로드 상자 드래그앤드롭

**Files:**
- Modify: `src/features/budgetAgenda/BudgetAgendaPage.tsx`
- Test: `src/features/budgetAgenda/BudgetAgendaPage.test.tsx`

**Interfaces:**
- Consumes: 기존 `load(file?: File): Promise<void>`와 `parseBudgetAgendaWorkbook`
- Produces: 큰 `.budget-agenda-upload` 영역의 `onDragOver`, `onDragLeave`, `onDrop` 동작

- [ ] **Step 1: 실패하는 테스트 작성**

큰 업로드 상자에 엑셀 파일을 드롭한 뒤 편집 화면의 `제안정보`가 나타나는지 검사한다. 테스트 파일은 기존 parser 테스트의 워크북 생성 패턴을 재사용한다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx`

Expected: 큰 `.budget-agenda-upload` 영역에 드롭 핸들러가 없어 편집 화면이 나타나지 않아 FAIL.

- [ ] **Step 3: 최소 구현**

`budget-agenda-upload` 섹션에 다음 동작을 연결한다.

```tsx
className={`budget-agenda-upload ${dragging ? "dragging" : ""}`}
onDragEnter={() => setDragging(true)}
onDragOver={event => { event.preventDefault(); setDragging(true); }}
onDragLeave={() => setDragging(false)}
onDrop={drop}
```

별도 작은 드롭 안내 섹션은 제거하고 안내 문장을 큰 업로드 상자 안에 유지한다.

- [ ] **Step 4: 통과 확인**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx`

Expected: PASS.

---

### Task 2: 입력 화면 글자 확대

**Files:**
- Modify: `src/features/budgetAgenda/budgetAgenda.css`

**Interfaces:**
- Consumes: 기존 `.budget-agenda-edit-section`, `.budget-agenda-edit-grid`, `.budget-agenda-field`, `.budget-agenda-row` 클래스
- Produces: 제목 20px, 항목명 14px, 입력값 16px, 표 입력값 14px, 원본값 12px

- [ ] **Step 1: CSS 계약 테스트 작성**

`BudgetAgendaPage.test.tsx`에서 화면 요소가 기존 범위 지정 클래스 구조를 유지하는지 확인한다. CSS 수치는 빌드 산출물 검사 대상으로 둔다.

- [ ] **Step 2: 최소 CSS 구현**

```css
.budget-agenda-edit-section h2{font-size:20px}
.budget-agenda-edit-grid label,.budget-agenda-field{font-size:14px}
.budget-agenda-edit-grid input,.budget-agenda-edit-grid textarea,.budget-agenda-field input,.budget-agenda-field textarea{font-size:16px}
.budget-agenda-row input{font-size:14px}
.budget-agenda-input-row span{font-size:12px}
```

- [ ] **Step 3: 관련 테스트 실행**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPage.test.tsx src/features/budgetAgenda/BudgetAgendaEditor.test.tsx`

Expected: PASS.

---

### Task 3: 출력 미리보기 가독성

**Files:**
- Modify: `src/features/budgetAgenda/BudgetAgendaPreview.tsx`
- Modify: `src/features/budgetAgenda/budgetAgenda.css`
- Test: `src/features/budgetAgenda/BudgetAgendaPreview.test.tsx`

**Interfaces:**
- Consumes: `draft.reason`, `draft.basis`, `draft.majorContents`, 세입예산의 관 항목 문자열
- Produces: `.budget-agenda-body-text`, `.budget-agenda-major`, 긴 세입 항목용 셀 클래스

- [ ] **Step 1: 실패하는 테스트 작성**

제안이유·근거·주요내용에 전용 본문 클래스가 적용되고, `지방교육행정기관이전수입` 셀에 긴 항목용 클래스가 적용되는지 검사한다.

- [ ] **Step 2: 실패 확인**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPreview.test.tsx`

Expected: 전용 클래스가 없어 FAIL.

- [ ] **Step 3: 최소 구현**

본문 요소에 `.budget-agenda-body-text`를 적용하고 12px로 표시한다. 주요내용 목록은 12px로 변경한다. 긴 세입 관 항목 셀에는 `.budget-agenda-long-income-label`을 조건부 적용한다.

```css
.budget-agenda-body-text,.budget-agenda-major{font-size:12px}
.budget-agenda-long-income-label{font-size:11px;word-break:break-word;overflow-wrap:anywhere}
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test:run -- src/features/budgetAgenda/BudgetAgendaPreview.test.tsx`

Expected: PASS.

---

### Task 4: 회귀검증과 Preview 배포

**Files:**
- Verify: `src/features/budgetAgenda/**`
- Verify: Vercel project `school-budget-portal`

**Interfaces:**
- Consumes: Tasks 1-3 결과
- Produces: 상태가 `READY`인 Vercel Preview URL

- [ ] **Step 1: 예산 안건설명서 테스트 실행**

Run: `npm run test:run -- src/features/budgetAgenda`

Expected: 관련 테스트 전부 PASS.

- [ ] **Step 2: 전체 빌드 실행**

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Preview 배포**

Vercel API에 `projectId=prj_PtuDzxhtmljjwTeshRdirwAY3GzD`, `teamId=team_LZ9fBwtJ5Z6i4ONPgTYynxbh`, `target=preview`를 명시하고 수정 소스를 배포한다.

- [ ] **Step 4: 배포 상태 확인**

배포 ID를 조회해 `readyState=READY`와 Preview URL을 확인한다. `--prod`, production target, promote 명령은 사용하지 않는다.
