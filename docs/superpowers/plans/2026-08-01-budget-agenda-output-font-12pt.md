# 예산안건설명서 출력 본문 12pt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 제안이유·근거·주요내용 본문과 주요내용 제목을 웹/PDF/Word/Excel에서 12pt로 통일한다.

**Architecture:** 웹 미리보기 요소에 명시적인 12pt 출력 스타일을 적용하고 PDF는 해당 화면을 그대로 캡처한다. Word와 Excel 생성기는 같은 의미의 문단·셀에 각 파일 형식의 12pt 단위를 지정한다.

**Tech Stack:** React, TypeScript, Vitest, docx, ExcelJS, Vite, Vercel Preview

## Global Constraints

- 표와 번호 항목 제목의 크기는 변경하지 않는다.
- 금액, 계산, 페이지 분할은 변경하지 않는다.
- Preview로만 배포하고 운영 배포는 하지 않는다.

### Task 1: 웹 미리보기 12pt

**Files:** `BudgetAgendaPreview.tsx`, `BudgetAgendaPreview.test.tsx`, `budgetAgenda.css`

- [ ] 본문·주요내용 제목·목록이 12pt인지 확인하는 실패 테스트를 작성한다.
- [ ] 해당 요소에 12pt 출력 스타일을 적용한다.
- [ ] 테스트 통과를 확인한다.

### Task 2: Word·Excel 12pt

**Files:** `exportWord.ts`, `exportExcel.ts`, `exporters.test.ts`

- [ ] Word XML과 Excel 셀 글꼴 크기에 대한 실패 테스트를 작성한다.
- [ ] Word 본문 TextRun에 size 24를 적용한다.
- [ ] Excel의 해당 본문·주요내용 셀에 size 12를 적용한다.
- [ ] 출력 테스트 통과를 확인한다.

### Task 3: 검증 및 Preview 배포

- [ ] 예산안건설명서 관련 테스트를 실행한다.
- [ ] 전체 빌드를 실행한다.
- [ ] `school-budget-portal`에 `target=preview`로 배포한다.
- [ ] 배포가 `READY`인지 확인하고 운영 승격을 하지 않는다.
