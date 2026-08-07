# 집행실적으로 추경자료 만들기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** K-에듀파인 102-2 엑셀을 드래그하면 예산액(4) 기준 추경자료를 웹에서 검토·수정하고 5개 시트 Excel로 내려받게 한다.

**Architecture:** 파싱·계산·집계를 순수 TypeScript 도메인으로 분리하고 React 화면은 해당 결과와 사용자 입력만 관리한다. Excel 입력·출력은 xlsx 패키지로 브라우저 안에서 처리하며 기존 Vite 단일 페이지 구조와 결산 기능을 유지한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, xlsx 0.18.5, lucide-react

## Global Constraints

- 본예산만 준비 중 배지를 유지한다.
- 예산안건 설명서와 결산설명서에는 준비 중 배지를 표시하지 않는다.
- 계산 기준은 예산현액(16)이 아닌 예산액(4)이다.
- 업로드 안내에 K-에듀파인 학교회계 → 사업관리 → 사업관리카드 → 집행실적 엑셀저장(실시간) → 자료코드 102-2 경로를 표시한다.
- 결과 Excel 시트 순서는 불러온원본, 추경검토자료, 예산집행현황, 단위사업 집계, 추경검토안이다.

---

### Task 1: 102-2 파서와 계산 도메인

**Files:**
- Create: src/features/supplementary/types.ts
- Create: src/features/supplementary/parser.ts
- Create: src/features/supplementary/parser.test.ts
- Create: src/features/supplementary/calculations.ts
- Create: src/features/supplementary/calculations.test.ts

**Interfaces:**
- Produces: parseExecutionWorkbook(buffer: ArrayBuffer): ExecutionWorkbook
- Produces: calculateExecutionRow(row: ExecutionRow, planned: number): CalculatedExecutionRow
- Produces: aggregateByUnitBusiness(rows: CalculatedExecutionRow[]): UnitBusinessSummary[]

- [ ] **Step 1: 실제 102-2 고정파일과 누락 머리글을 검사하는 실패 테스트 작성**

검증값은 학교명 서울옥정초등학교, 회계연도 2026, 첫 행 예산액 3,000,000, 원인행위 0, 지출 0이다.

- [ ] **Step 2: 실패 확인**

Run: npm run test:run -- src/features/supplementary/parser.test.ts
Expected: FAIL because parseExecutionWorkbook does not exist.

- [ ] **Step 3: 머리글 이름 기반 최소 파서 구현**

머리글 행을 탐색하고 정책사업, 단위사업, 세부사업, 세부항목, 목명, 세목명, 원가통계비목명, 산출내역, 예산액(4), 원인행위금액(17), 지출금액(18)을 매핑한다. 필수 열이 없으면 102-2 안내 오류를 던진다.

- [ ] **Step 4: 계산 실패 테스트 작성**

예산액 1000, 원인행위 400, 지출 350, 집행예정액 100이면 잔액 600, 불일치 50, 집행률 40, 추경 가능금액 500이어야 한다. 예산액 0의 집행률은 0이어야 한다.

- [ ] **Step 5: 계산과 단위사업 집계 구현 후 테스트**

Run: npm run test:run -- src/features/supplementary/parser.test.ts src/features/supplementary/calculations.test.ts
Expected: PASS.

### Task 2: 업로드·검토 화면

**Files:**
- Create: src/features/supplementary/SupplementaryPage.tsx
- Create: src/features/supplementary/SupplementaryPage.test.tsx
- Create: src/features/supplementary/ExecutionTable.tsx
- Modify: src/App.tsx
- Modify: src/App.test.tsx
- Modify: src/styles.css

**Interfaces:**
- Consumes: parseExecutionWorkbook, calculateExecutionRow, aggregateByUnitBusiness
- Produces: SupplementaryPage React component

- [ ] **Step 1: 메뉴 배지와 새 메뉴 실패 테스트 작성**

본예산에는 준비 중이 있고 예산안건 설명서·결산설명서에는 없으며 집행실적으로 추경자료 만들기 메뉴가 존재하는지 검사한다.

- [ ] **Step 2: 실패 확인**

Run: npm run test:run -- src/App.test.tsx
Expected: FAIL on badge count or missing menu.

- [ ] **Step 3: App 메뉴와 라우팅 최소 수정**

새 View 값 supplementary를 추가하고 해당 메뉴에서 SupplementaryPage를 렌더링한다. 준비 중 조건은 id === budget으로 제한한다.

- [ ] **Step 4: 업로드 안내와 실제 파일 처리 실패 테스트 작성**

정확한 K-에듀파인 경로 문구, 102-2 드롭 안내, 파일 선택, 요약 카드, 네 결과 탭, 초기화 버튼을 검사한다.

- [ ] **Step 5: 화면 구현과 테스트 통과**

부서별 집행예정액·추경(안)을 행별 상태로 관리하고 변경 시 추경 가능금액과 합계를 즉시 재계산한다. 표에 검색, 음수 클래스, 고정 머리글과 가로 스크롤을 적용한다.

Run: npm run test:run -- src/App.test.tsx src/features/supplementary/SupplementaryPage.test.tsx
Expected: PASS.

### Task 3: 5개 시트 Excel 생성

**Files:**
- Create: src/features/supplementary/exportExcel.ts
- Create: src/features/supplementary/exportExcel.test.ts
- Modify: src/features/supplementary/SupplementaryPage.tsx

**Interfaces:**
- Consumes: ExecutionWorkbook, CalculatedExecutionRow[], UnitBusinessSummary[]
- Produces: buildSupplementaryWorkbook(data): XLSX.WorkBook
- Produces: downloadSupplementaryWorkbook(data): void

- [ ] **Step 1: 시트명·순서·핵심값 실패 테스트 작성**

생성된 SheetNames가 불러온원본, 추경검토자료, 예산집행현황, 단위사업 집계, 추경검토안과 정확히 일치하고 첫 행 계산값과 사용자 입력값을 검사한다.

- [ ] **Step 2: 실패 확인**

Run: npm run test:run -- src/features/supplementary/exportExcel.test.ts
Expected: FAIL because exporter does not exist.

- [ ] **Step 3: 최소 Excel 생성 구현**

원본 값을 보존하고 결과 시트별 머리글·행·합계를 만든다. 자동필터, 고정 머리글, 열 너비, 금액 형식, 집행률 형식과 음수 글꼴 색상을 설정한다.

- [ ] **Step 4: 다운로드 연결 후 테스트**

Run: npm run test:run -- src/features/supplementary/exportExcel.test.ts src/features/supplementary/SupplementaryPage.test.tsx
Expected: PASS.

### Task 4: 전체 검증과 운영 배포

**Files:**
- Verify all source and test files

**Interfaces:**
- Consumes: completed feature
- Produces: READY production deployment at school-budget-portal.vercel.app

- [ ] **Step 1: 전체 테스트 실행**

Run: npm run test:run
Expected: all runnable tests PASS. 외부 고정파일 누락이 있으면 해당 파일 경로와 영향 범위를 명시한다.

- [ ] **Step 2: 프로덕션 빌드**

Run: npm run build
Expected: tsc and vite build exit 0.

- [ ] **Step 3: 미리보기 배포·응답 검증**

Vercel preview가 READY이고 루트 HTML과 JavaScript asset이 HTTP 200인지 확인한다.

- [ ] **Step 4: 운영 배포·응답 검증**

school-budget-portal 프로젝트 production이 READY이고 https://school-budget-portal.vercel.app 가 HTTP 200인지 확인한다.
