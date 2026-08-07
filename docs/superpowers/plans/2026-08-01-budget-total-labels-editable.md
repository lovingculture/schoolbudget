# 예산 총 규모 표 제목 편집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 총 규모 표의 두 예산 제목을 현재 웹 문구로 초기화하고 사용자가 수정한 문구를 모든 출력에 반영한다.

**Architecture:** 초안 타입이 두 제목을 단일 진실 공급원으로 보관한다. 편집기, 웹 미리보기, Word·Excel 내보내기는 같은 초안 필드를 읽는다.

**Tech Stack:** React, TypeScript, Vitest, docx, ExcelJS, Vite, Vercel Preview

## Global Constraints

- 기본값은 `경정예산액(B)`, `기정예산액(A)`이다.
- 금액과 증감 계산은 변경하지 않는다.
- Preview로만 배포하고 운영 배포는 수행하지 않는다.

---

### Task 1: 초안 데이터와 편집기

**Files:**
- Modify: `src/features/budgetAgenda/types.ts`
- Modify: `src/features/budgetAgenda/createDraft.ts`
- Modify: `src/features/budgetAgenda/BudgetAgendaEditor.tsx`
- Test: `src/features/budgetAgenda/createDraft.test.ts`
- Test: `src/features/budgetAgenda/BudgetAgendaEditor.test.tsx`

- [ ] 기본 제목 두 개에 대한 실패 테스트를 작성하고 실행한다.
- [ ] 초안 타입과 생성 기본값을 추가한다.
- [ ] 편집기 입력 변경 테스트를 작성하고 실패를 확인한다.
- [ ] 총 규모 편집 구역에 두 텍스트 입력을 추가한다.
- [ ] 관련 테스트 통과를 확인한다.

### Task 2: 미리보기와 내보내기

**Files:**
- Modify: `src/features/budgetAgenda/BudgetAgendaPreview.tsx`
- Modify: `src/features/budgetAgenda/exportWord.ts`
- Modify: `src/features/budgetAgenda/exportExcel.ts`
- Test: `src/features/budgetAgenda/BudgetAgendaPreview.test.tsx`
- Test: `src/features/budgetAgenda/exporters.test.ts`

- [ ] 사용자 지정 제목을 사용한 실패 테스트를 작성한다.
- [ ] 미리보기와 Word·Excel 내보내기가 초안 제목 필드를 사용하게 한다.
- [ ] 관련 테스트 통과를 확인한다.

### Task 3: 검증과 Preview 배포

**Files:**
- Verify: `src/features/budgetAgenda/**`
- Verify: Vercel project `school-budget-portal`

- [ ] 예산안건설명서 관련 테스트를 실행한다.
- [ ] 전체 빌드를 실행한다.
- [ ] project/team ID와 `target=preview`를 명시해 배포한다.
- [ ] 배포가 `READY`인지 확인하고 운영 승격을 하지 않는다.
