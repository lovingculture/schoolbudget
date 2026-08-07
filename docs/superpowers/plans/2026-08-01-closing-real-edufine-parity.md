# 실제 에듀파인 결산자료 지원 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 에듀파인 결산총괄표의 원본 명칭과 금액을 읽고, 없는 구성비를 자동 계산하여 결산안 A4 2쪽을 생성한다.

**Architecture:** `parser.ts`가 총괄금액을 먼저 읽은 뒤 세입·세출 행에 합계 기반 구성비를 주입한다. 원본 명칭은 변환하지 않고 현재 편집·미리보기·다운로드 흐름에 전달한다.

**Tech Stack:** TypeScript, SheetJS, React, Vitest, Vite, Vercel Preview

## Global Constraints

- 정책사업명은 에듀파인 원본을 그대로 사용한다.
- 구성비는 결산액 ÷ 해당 결산합계 × 100을 소수점 첫째 자리로 반올림한다.
- Vercel `school-budget-portal` 프로젝트에 Preview로만 배포한다.
- 운영 배포와 운영 승격은 수행하지 않는다.

---

### Task 1: 실제 원본 구조 회귀 테스트

**Files:**
- Modify: `src/features/closing/parser.test.ts`

**Interfaces:**
- Consumes: `parseClosingWorkbook(data: ArrayBuffer)`
- Produces: 구성비 열이 없는 에듀파인 구조에 대한 실패 테스트

- [ ] 실제 원본과 동일한 셀 배치의 테스트 워크북을 생성한다.
- [ ] 세입·세출 구성비와 `학교시설 확충` 원본명 유지 기대값을 추가한다.
- [ ] `npm run test:run -- src/features/closing/parser.test.ts`로 기존 파서의 실패를 확인한다.

### Task 2: 합계 기반 구성비 계산

**Files:**
- Modify: `src/features/closing/parser.ts`

**Interfaces:**
- Consumes: 세입결산액, 세출결산액, 각 원본 행 결산액
- Produces: `IncomeRow.ratio`, `ExpenseRow.ratio`의 소수점 한 자리 구성비

- [ ] `ratioOf(amount: number, total: number): number`를 추가한다.
- [ ] 세입·세출 추출 함수에 해당 합계를 전달한다.
- [ ] 구성비 열 탐색 의존성을 제거하고 원본 명칭은 그대로 반환한다.
- [ ] 파서 테스트를 다시 실행해 통과를 확인한다.

### Task 3: 실제 업로드 파일 및 화면 회귀검증

**Files:**
- Verify: `/workspace/scratch/eb956e669181/upload/세입세출결산총괄표(3).xls`
- Verify: `src/features/closing/**`

**Interfaces:**
- Consumes: 실제 사용자 업로드 파일
- Produces: 예시 금액·행 명칭과 일치하는 파싱 결과

- [ ] 실제 파일을 파서로 읽어 총괄금액과 `학교시설 확충`을 확인한다.
- [ ] `npm run test:run -- src/features/closing`을 실행한다.
- [ ] `npm run build`를 실행한다.

### Task 4: Preview 배포

**Files:**
- Verify: Vercel project `school-budget-portal`

**Interfaces:**
- Consumes: 검증된 수정 소스
- Produces: `READY` 상태의 Preview URL

- [ ] project/team ID와 `target=preview`를 명시해 배포한다.
- [ ] 배포 상태가 `READY`인지 확인한다.
- [ ] 운영 배포·promote·운영 별칭 변경을 실행하지 않는다.
