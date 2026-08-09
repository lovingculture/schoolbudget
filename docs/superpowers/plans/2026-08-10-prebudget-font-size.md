# Prebudget Font Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성립전예산 작성 화면의 라벨, 입력값, 안내문과 비목 설명을 읽기 쉬운 크기로 확대하되 다른 포털 화면과 기존 기능은 그대로 유지한다.

**Architecture:** `PrebudgetPage`의 직접 작성 화면에 전용 `prebudget-page` 범위를 추가하고, 기존 전역 폼 규칙을 건드리지 않는 범위 지정 CSS를 추가한다. 렌더 구조와 CSS 규칙을 각각 자동 테스트하고, 데스크톱·모바일 실제 렌더로 겹침과 넘침을 확인한다.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Vite

## Global Constraints

- 성립전예산 직접 작성 화면에만 적용한다.
- 입력 항목 라벨과 입력값은 16px로 표시한다.
- 비목 설명 제목은 16px, 본문과 일반 보조 설명은 15px로 표시한다.
- 중요 안내 제목은 18px, 중요 안내 본문·목록은 15px 이상으로 표시한다.
- 기존 자동계산, 예시 불러오기, 임시저장, 문서 생성 기능과 반응형 열 구조를 유지한다.
- 운영 배포는 이 계획의 범위에 포함하지 않는다.

---

### Task 1: 성립전예산 작성 화면 타이포그래피 확대

**Files:**
- Create: `src/features/prebudget/PrebudgetPage.typography.test.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.tsx:63`
- Modify: `src/styles.css:1-12`

**Interfaces:**
- Consumes: `PrebudgetPage({ initialSchoolName, storage })`, 기존 `.form-grid`, `.item-fields`, `.category-help`, `.prebudget-errors` 구조
- Produces: 작성 화면 최상위의 `.prebudget-page` 범위와 그 아래에만 적용되는 글자·입력 높이 규칙

- [ ] **Step 1: 작성 화면 범위와 글자 크기를 고정하는 실패 테스트 작성**

`src/features/prebudget/PrebudgetPage.typography.test.tsx`를 만들고 다음 테스트를 작성한다.

```tsx
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PrebudgetPage } from "./PrebudgetPage";
import type { DraftStorage } from "./storage";

const storage: DraftStorage = {
  load: () => null,
  save: vi.fn(),
  clear: vi.fn(),
};

const styles = readFileSync("src/styles.css", "utf8");

describe("성립전예산 작성 화면 글자 크기", () => {
  it("작성 화면에만 전용 범위를 적용한다", () => {
    const { container } = render(
      <PrebudgetPage initialSchoolName="서울한빛초등학교" storage={storage} />,
    );
    expect(container.querySelector(".content.prebudget-page")).not.toBeNull();
  });

  it("라벨 입력값 설명과 중요 안내의 최소 크기를 선언한다", () => {
    expect(styles).toMatch(/\.prebudget-page \.form-grid label[^}]*font-size:\s*16px/);
    expect(styles).toMatch(/\.prebudget-page \.form-grid (?:input|input,)[^}]*font-size:\s*16px/);
    expect(styles).toMatch(/\.prebudget-page \.category-help b[^}]*font-size:\s*16px/);
    expect(styles).toMatch(/\.prebudget-page \.category-help p[^}]*font-size:\s*15px/);
    expect(styles).toMatch(/\.prebudget-page \.prebudget-errors>b[^}]*font-size:\s*18px/);
  });
});
```

- [ ] **Step 2: 새 테스트가 예상 원인으로 실패하는지 확인**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/PrebudgetPage.typography.test.tsx
```

Expected: `.content.prebudget-page`가 없고 전용 CSS 규칙이 없어 FAIL.

- [ ] **Step 3: 작성 화면에 전용 범위 추가**

`src/features/prebudget/PrebudgetPage.tsx`의 직접 작성 화면 반환부만 다음처럼 변경한다. 재원 안내와 예시 목록 화면의 `.content`는 그대로 둔다.

```tsx
return <div className="content prebudget-page">
```

- [ ] **Step 4: 전용 범위 안에서만 글자와 입력 높이 확대**

`src/styles.css`에 아래 규칙을 추가한다. 기존 전역 `.form-grid`와 `.item-fields` 규칙은 수정하지 않는다.

```css
.prebudget-page .form-grid label,
.prebudget-page .item-fields label {
  font-size: 16px;
  line-height: 1.5;
}

.prebudget-page .form-grid input,
.prebudget-page .form-grid select,
.prebudget-page .item-fields input,
.prebudget-page .item-fields select {
  min-height: 50px;
  font-size: 16px;
}

.prebudget-page .card-title-row h2 {
  font-size: 20px;
}

.prebudget-page .card-title-row p {
  font-size: 15px;
  line-height: 1.7;
}

.prebudget-page .card-title-row .secondary,
.prebudget-page .add-row {
  font-size: 18px;
}

.prebudget-page .category-help b {
  font-size: 16px;
}

.prebudget-page .category-help p {
  font-size: 15px;
  line-height: 1.75;
}

.prebudget-page .prebudget-errors > b {
  font-size: 18px;
}

.prebudget-page .prebudget-errors p,
.prebudget-page .prebudget-errors ul {
  font-size: 15px;
  line-height: 1.75;
}

.prebudget-page .formula output,
.prebudget-page .total span {
  font-size: 18px;
}
```

- [ ] **Step 5: 집중 테스트와 기존 성립전예산 회귀 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/PrebudgetPage.typography.test.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx
```

Expected: 두 파일의 모든 테스트 PASS. 예시 불러오기 후 금액 수정 시 항목 금액과 합계가 함께 갱신되는 기존 테스트도 PASS.

- [ ] **Step 6: 전체 테스트와 빌드 검증**

Run:

```powershell
npm.cmd test -- --run --testTimeout=10000
npm.cmd run build
```

Expected: 전체 테스트 PASS, TypeScript와 Vite 빌드 PASS. 기존 대형 청크 경고는 비차단 경고로 기록한다.

- [ ] **Step 7: 데스크톱·모바일 실제 화면 확인**

개발 서버를 실행하고 성립전예산 화면을 1440px와 390px 폭에서 확인한다.

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

확인 항목:

- 기본정보 라벨과 입력값이 16px로 보인다.
- 단위사업·세부사업·세부항목·원가통계비목과 산출내역이 잘리지 않는다.
- 비목 설명이 15px로 읽히며 카드 밖으로 넘치지 않는다.
- 예시 초안 중요 안내가 18px로 강조된다.
- 390px에서 기존 1열 전환이 유지되고 가로 스크롤이 생기지 않는다.
- 브라우저 콘솔 오류가 없다.

- [ ] **Step 8: 변경 파일만 커밋**

```powershell
git add -- src/features/prebudget/PrebudgetPage.tsx src/features/prebudget/PrebudgetPage.typography.test.tsx src/styles.css
git commit -m "style: improve prebudget form readability"
```

커밋 전 `.tmp-spreadsheet-analysis/` 등 사용자 소유의 관련 없는 파일은 스테이징하지 않는다.
