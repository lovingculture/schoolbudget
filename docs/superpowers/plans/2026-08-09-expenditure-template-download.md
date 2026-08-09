# 본예산 세출 요구서 양식 다운로드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예산지침 화면에서 동일한 세출 요구서 양식을 XLS와 XLSX로 내려받고 다시 포털에 업로드할 수 있게 한다.

**Architecture:** SheetJS로 매크로 없는 빈 통합문서를 메모리에서 생성한다. 생성기와 다운로드 함수는 지침 UI와 분리하고, 두 형식의 결과를 기존 세출 파서로 재검증한다.

**Tech Stack:** TypeScript, SheetJS, React, Vitest, Testing Library

## Global Constraints

- 11개 열 이름과 순서는 `budget.xls` 표본과 동일하게 유지한다.
- VBA·개인 메타정보·외부 전송을 사용하지 않는다.
- XLS와 XLSX 모두 기존 본예산 세출 업로드 파서와 호환되어야 한다.

### Task 1: 양식 생성기와 호환성 검사

**Files:**
- Create: `src/features/guidelines/buildExpenditureTemplate.ts`
- Test: `src/features/guidelines/buildExpenditureTemplate.test.ts`

- [ ] XLS·XLSX 생성 결과의 시트명과 11개 제목 열을 검증하는 실패 테스트를 작성한다.
- [ ] 테스트가 모듈 부재로 실패하는지 실행한다.
- [ ] `buildExpenditureTemplate(format: "xls" | "xlsx"): Uint8Array`를 구현한다.
- [ ] 생성한 두 파일을 `parseExpenditureWorkbook`에 전달해 빈 양식으로 정상 인식하는지 검증한다.
- [ ] 테스트를 실행해 통과시킨다.

### Task 2: 지침 게시판 다운로드 카드

**Files:**
- Modify: `src/features/guidelines/GuidelinesPage.tsx`
- Modify: `src/features/guidelines/GuidelinesPage.test.tsx`
- Modify: `src/features/guidelines/guidelines.css`

- [ ] 양식 카드 제목과 두 다운로드 버튼을 요구하는 실패 테스트를 작성한다.
- [ ] 테스트가 실패하는지 실행한다.
- [ ] 두 버튼이 각각 XLS·XLSX 생성 및 다운로드 함수를 호출하도록 구현한다.
- [ ] 지침 PDF 카드와 구분되는 양식 카드 서식을 추가한다.
- [ ] 지침 테스트와 전체 빌드를 실행한다.
