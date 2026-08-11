# Prebudget Home-Style Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성립전예산의 예시 선택·입력·자동점검·미리보기·다운로드 화면을 홈과 같은 네이비·하늘색·민트색 체계로 통일하면서 기존 계산·저장·문서 생성 결과를 보존한다.

**Architecture:** 기존 `PrebudgetPage` 상태와 도메인 로직은 그대로 두고, 상단 소개·단계 표시를 표현 전용 `PrebudgetHeader`로 분리한다. 성립전 전용 `prebudget.css`는 `.prebudget-page` 아래로만 범위를 제한하며 홈 색상 토큰을 복제해 독립적으로 사용한다. 예시 화면과 작성 화면의 마크업은 접근 가능한 의미 구조만 보강하고 기존 이벤트·데이터 흐름은 변경하지 않는다.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, Vite, 기존 HWPX·docx·jsPDF 내보내기 모듈

## Global Constraints

- 선택한 디자인은 `A. 홈 화면 일치형`이다.
- 색상은 네이비 `#14334E`, 파랑 `#188BC1`, 청록 `#1596A3`, 진한 청록 글자 `#0B5F66`, 하늘색 `#EEF8FC`, 민트색 `#EFFAF7`, 테두리 `#D8E5EB`를 사용한다.
- 기본 글꼴은 `Noto Sans KR`이며 작성 입력과 버튼 글자는 16px 이상, 주요 클릭 영역은 최소 44px이다.
- 기존 16개 예시, 사업 분류, 원가통계비목, 계산, 임시저장, 자동점검, 기안문 생성 로직을 변경하지 않는다.
- `.prebudget-paper`의 A4 크기·여백·글꼴·문안과 HWPX·Word·PDF 생성 로직을 변경하지 않는다.
- 상단 캐릭터는 `public/characters/cards/prebudget-writing.png` 공식 자산만 사용하고 색·비율을 변형하지 않는다.
- 예시는 상세 미리보기를 확인한 뒤 `이 예시로 작성하기`를 눌러야만 초안에 적용한다.
- 성립전예산 Excel 다운로드를 추가하지 않는다.
- 새 CSS는 `.prebudget-page` 또는 성립전 전용 클래스 아래로 제한한다.
- 1440px와 390px에서 페이지 수준 가로 넘침이 없어야 하며 일반 크기 텍스트는 WCAG AA 대비를 충족해야 한다.
- 이번 구현에서 성립전예산 문구와 기안문 본문을 전면 수정하거나 Production에 배포하지 않는다.

---

## File Structure

- Create: `src/features/prebudget/prebudgetCopy.ts` — 후속 문구 수정이 쉬운 상단·단계·예시 안내 문구 상수
- Create: `src/features/prebudget/PrebudgetHeader.tsx` — 홈 일치형 상단 소개와 4단계 진행 표시
- Create: `src/features/prebudget/PrebudgetHeader.test.tsx` — 상단 구조·단계·예시 진입 계약
- Create: `src/features/prebudget/prebudget.css` — 성립전 전용 홈 색상·레이아웃·반응형 규칙
- Create: `src/features/prebudget/prebudgetStyles.test.ts` — 색상 토큰·범위·A4 경계·44px 계약
- Modify: `src/features/prebudget/PrebudgetPage.tsx` — 새 상단 컴포넌트와 전용 스타일 연결, 표현용 클래스 보강
- Modify: `src/features/prebudget/PrebudgetPage.examples.test.tsx` — 예시 진입·작성·미리보기·다운로드 기능 보존
- Modify: `src/features/prebudget/PrebudgetPage.typography.test.tsx` — 새 전용 CSS의 16px 가독성 계약
- Modify: `src/features/prebudget/examples/PrebudgetFundingGuide.tsx` — 홈 카드형 재원 안내의 의미 구조
- Modify: `src/features/prebudget/examples/PrebudgetExampleLibrary.tsx` — 예시 목록·상세·주의 안내의 의미 구조
- Modify: `src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx` — 검색·선택·적용 기능과 새 구조 검증

### Task 1: 홈 일치형 상단 소개와 단계 표시

**Files:**
- Create: `src/features/prebudget/prebudgetCopy.ts`
- Create: `src/features/prebudget/PrebudgetHeader.tsx`
- Create: `src/features/prebudget/PrebudgetHeader.test.tsx`
- Create: `src/features/prebudget/prebudget.css`
- Create: `src/features/prebudget/prebudgetStyles.test.ts`
- Modify: `src/features/prebudget/PrebudgetPage.tsx`

**Interfaces:**
- Consumes: `documentReady: boolean`, `onOpenExamples(): void`
- Produces: `PREBUDGET_COPY`, `PrebudgetHeader({ documentReady, onOpenExamples })`, `.prebudget-page` 전용 디자인 토큰

- [ ] **Step 1: 문구와 상단 구조의 실패 테스트 작성**

`src/features/prebudget/PrebudgetHeader.test.tsx`를 생성한다.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PrebudgetHeader } from "./PrebudgetHeader";

describe("성립전예산 홈 일치형 상단", () => {
  it("소개 영역과 네 단계 및 예시 진입을 표시한다", async () => {
    const onOpenExamples = vi.fn();
    render(<PrebudgetHeader documentReady={false} onOpenExamples={onOpenExamples} />);

    expect(screen.getByRole("region", { name: "성립전예산 작성 안내" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "성립전예산 요구서 작성" })).toBeVisible();
    expect(screen.getByRole("img", { name: "문서를 작성하는 서울시교육청 캐릭터 자라나" })).toHaveAttribute("src", "/characters/cards/prebudget-writing.png");
    expect(screen.getByLabelText("성립전예산 작성 단계").children).toHaveLength(4);
    await userEvent.setup().click(screen.getByRole("button", { name: "예시에서 시작하기" }));
    expect(onOpenExamples).toHaveBeenCalledOnce();
  });

  it("문서가 생성되면 자동점검과 미리보기 단계를 완료 상태로 표시한다", () => {
    render(<PrebudgetHeader documentReady onOpenExamples={vi.fn()} />);
    const steps = screen.getByLabelText("성립전예산 작성 단계").children;
    expect(steps[2]).toHaveAttribute("data-status", "complete");
    expect(steps[3]).toHaveAttribute("data-status", "complete");
  });
});
```

- [ ] **Step 2: 상단 테스트를 실행해 RED 확인**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/PrebudgetHeader.test.tsx
```

Expected: `./PrebudgetHeader` 모듈이 없어 FAIL.

- [ ] **Step 3: CSS 토큰과 A4 경계의 실패 테스트 작성**

`src/features/prebudget/prebudgetStyles.test.ts`를 생성한다.

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/features/prebudget/prebudget.css", "utf8");

describe("성립전예산 홈 일치형 스타일", () => {
  it("승인한 홈 색상 토큰을 성립전 범위에 선언한다", () => {
    expect(css).toMatch(/\.prebudget-page\s*\{[^}]*--prebudget-navy:\s*#14334e/i);
    expect(css).toMatch(/--prebudget-blue:\s*#188bc1/i);
    expect(css).toMatch(/--prebudget-teal:\s*#1596a3/i);
    expect(css).toMatch(/--prebudget-sky:\s*#eef8fc/i);
    expect(css).toMatch(/--prebudget-mint:\s*#effaf7/i);
  });

  it("A4 문서와 전역 요소를 새 스타일 대상으로 삼지 않는다", () => {
    expect(css).not.toMatch(/\.prebudget-paper/);
    expect(css).not.toMatch(/(^|})\s*(body|button|input|select|textarea)\s*\{/m);
  });

  it("성립전 주요 버튼과 입력에 44px 이상을 선언한다", () => {
    expect(css).toMatch(/\.prebudget-page[^}]*input[^}]*min-height:\s*44px/);
    expect(css).toMatch(/\.prebudget-page[^}]*button[^}]*min-height:\s*44px/);
  });
});
```

- [ ] **Step 4: 스타일 테스트를 실행해 RED 확인**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/prebudgetStyles.test.ts
```

Expected: `prebudget.css`가 없어 FAIL.

- [ ] **Step 5: 문구 상수와 표현 전용 상단 컴포넌트 구현**

`src/features/prebudget/prebudgetCopy.ts`를 생성한다.

```ts
export const PREBUDGET_COPY = {
  eyebrow: "PRE-BUDGET",
  title: "성립전예산 요구서 작성",
  description: "입력한 내용으로 K-에듀파인 복사용 기안문과 파일을 자동 생성합니다.",
  exampleTitle: "처음이신가요? 예시에서 시작하세요",
  exampleDescription: "사업 성격에 맞는 예시를 고른 뒤 실제 공문과 금액만 확인하세요.",
  steps: ["기본정보", "예산항목", "자동점검", "미리보기·생성"],
} as const;
```

`src/features/prebudget/PrebudgetHeader.tsx`를 생성한다.

```tsx
import { PREBUDGET_COPY } from "./prebudgetCopy";

export function PrebudgetHeader({ documentReady, onOpenExamples }: {
  documentReady: boolean;
  onOpenExamples(): void;
}) {
  return <>
    <section className="prebudget-hero" aria-label="성립전예산 작성 안내">
      <div>
        <span>{PREBUDGET_COPY.eyebrow}</span>
        <h1>{PREBUDGET_COPY.title}</h1>
        <p>{PREBUDGET_COPY.description}</p>
      </div>
      <img src="/characters/cards/prebudget-writing.png" alt="문서를 작성하는 서울시교육청 캐릭터 자라나" />
    </section>
    <ol className="prebudget-steps" aria-label="성립전예산 작성 단계">
      {PREBUDGET_COPY.steps.map((step, index) => <li
        key={step}
        data-status={index < 2 || documentReady ? "complete" : "pending"}
      ><b>{index + 1}</b><span>{step}</span></li>)}
    </ol>
    <section className="prebudget-example-start" aria-label="예시 작성 안내">
      <div><strong>{PREBUDGET_COPY.exampleTitle}</strong><p>{PREBUDGET_COPY.exampleDescription}</p></div>
      <button type="button" className="secondary" onClick={onOpenExamples}>예시에서 시작하기</button>
    </section>
  </>;
}
```

- [ ] **Step 6: 상단 컴포넌트를 기존 페이지에 연결**

`PrebudgetPage.tsx`에서 `./prebudget.css`와 `PrebudgetHeader`를 가져오고 기존 `.page-title`과 `.steps` 마크업을 다음 호출로 교체한다.

```tsx
<PrebudgetHeader
  documentReady={Boolean(document)}
  onOpenExamples={() => setView("funding-guide")}
/>
```

상태, `generate`, `save`, 예시 전환과 작성 폼 마크업은 이 단계에서 변경하지 않는다.

- [ ] **Step 7: 최소 홈 일치형 상단 CSS 구현**

`prebudget.css`에 `.prebudget-page` 범위의 토큰, 그라데이션 소개 영역, 네 단계, 예시 안내와 44px 계약을 구현한다.

```css
.prebudget-page {
  --prebudget-navy: #14334e;
  --prebudget-blue: #188bc1;
  --prebudget-teal: #1596a3;
  --prebudget-teal-text: #0b5f66;
  --prebudget-sky: #eef8fc;
  --prebudget-mint: #effaf7;
  --prebudget-border: #d8e5eb;
  color: var(--prebudget-navy);
}
.prebudget-page input,
.prebudget-page select,
.prebudget-page textarea,
.prebudget-page button { min-height: 44px; }
.prebudget-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
  align-items: center;
  padding: 30px;
  border: 1px solid var(--prebudget-border);
  border-radius: 22px;
  background: linear-gradient(120deg, var(--prebudget-sky), var(--prebudget-mint));
}
.prebudget-hero img { width: 100%; max-height: 210px; object-fit: contain; }
.prebudget-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 0; list-style: none; }
.prebudget-example-start { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 20px; border: 1px solid var(--prebudget-border); border-radius: 18px; background: white; }
@media (max-width: 760px) {
  .prebudget-hero { grid-template-columns: 1fr; text-align: center; }
  .prebudget-hero img { width: 120px; max-height: 130px; margin: 12px auto 0; }
  .prebudget-steps { grid-template-columns: 1fr 1fr; }
  .prebudget-example-start { align-items: stretch; flex-direction: column; }
}
```

- [ ] **Step 8: Task 1 집중 테스트와 기존 예시 진입 회귀 실행**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/PrebudgetHeader.test.tsx src/features/prebudget/prebudgetStyles.test.ts src/features/prebudget/PrebudgetPage.examples.test.tsx
```

Expected: 상단 구조, 스타일 계약, 기존 예시 진입 테스트 PASS.

- [ ] **Step 9: Task 1 커밋**

```powershell
git add -- src/features/prebudget/prebudgetCopy.ts src/features/prebudget/PrebudgetHeader.tsx src/features/prebudget/PrebudgetHeader.test.tsx src/features/prebudget/prebudget.css src/features/prebudget/prebudgetStyles.test.ts src/features/prebudget/PrebudgetPage.tsx
git commit -m "style: add home-style prebudget header"
```

### Task 2: 예시 선택·검색·상세 화면의 홈 카드 스타일

**Files:**
- Modify: `src/features/prebudget/examples/PrebudgetFundingGuide.tsx`
- Modify: `src/features/prebudget/examples/PrebudgetExampleLibrary.tsx`
- Modify: `src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.examples.test.tsx`
- Modify: `src/features/prebudget/prebudget.css`

**Interfaces:**
- Consumes: 기존 `FUNDING_GUIDE_OPTIONS`, `searchPrebudgetExamples`, `onSelect`, `onUnsure`, `onUseExample`, `onBack`
- Produces: `.prebudget-guide-card`, `.prebudget-example-card`, `.prebudget-example-notice`, `.prebudget-example-detail` 홈 일치형 상태와 접근 가능한 목록·검색 구조

- [ ] **Step 1: 예시 화면 구조와 기능 보존의 실패 테스트 작성**

`PrebudgetExampleLibrary.test.tsx`에 다음 검증을 추가한다.

```tsx
it("홈 카드형 목록에서도 검색하고 예시 상세를 선택한다", async () => {
  const user = userEvent.setup();
  render(<PrebudgetExampleLibrary
    examples={PREBUDGET_EXAMPLES}
    initialScope="전체"
    onUseExample={vi.fn()}
    onBack={vi.fn()}
  />);

  expect(screen.getByRole("region", { name: "성립전예산 예시 찾기" })).toHaveClass("prebudget-example-library");
  await user.type(screen.getByRole("searchbox", { name: "예시 검색" }), "돌봄");
  expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  await user.click(screen.getAllByRole("button", { name: "자세히 보기" })[0]);
  expect(screen.getByRole("button", { name: "이 예시로 작성하기" })).toBeVisible();
  expect(screen.getByRole("button", { name: "다른 예시 보기" })).toBeVisible();
});
```

`PrebudgetPage.examples.test.tsx`에는 재원 안내가 네 선택 카드를 유지하는지 추가한다.

```tsx
it("홈 카드형 재원 안내에서 기존 선택지를 모두 제공한다", async () => {
  render(<PrebudgetPage initialSchoolName="서울우리학교" storage={storage} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "예시에서 시작하기" }));
  expect(screen.getAllByRole("button", { name: /교육청|구청|학부모|잘 모르겠어요/ })).toHaveLength(4);
});
```

- [ ] **Step 2: 집중 테스트를 실행해 RED 확인**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx
```

Expected: 예시 라이브러리에 명명된 `region`이 없어 새 구조 테스트 FAIL.

- [ ] **Step 3: 재원 안내와 예시 목록의 의미 구조 보강**

`PrebudgetFundingGuide.tsx`는 기존 버튼과 콜백을 유지하고 다음 클래스를 추가한다.

```tsx
<div className="prebudget-guide-grid" role="list">
  {FUNDING_GUIDE_OPTIONS.map((option) => <div role="listitem" key={option.label}>
    <button
      type="button"
      className="prebudget-guide-card"
      onClick={() => option.category ? onSelect(option.category) : onUnsure()}
      aria-label={option.label}
    >
      <span className="prebudget-guide-card-kicker">재원 안내</span>
      <strong>{option.label}</strong>
      <span>{option.description}</span>
    </button>
  </div>)}
</div>
```

`PrebudgetExampleLibrary.tsx`의 목록 루트에 `aria-label="성립전예산 예시 찾기"`를 추가하고 기존 `.notice`를 `.prebudget-example-notice`로 교체한다. 상세 화면의 `← 예시 목록` 문구는 `다른 예시 보기`로 바꾸되 `setSelected(undefined)` 동작을 유지한다. 검색 상태, `filtered`, `selected`, `onUseExample` 호출은 변경하지 않는다. 상세에서 `이 예시로 작성하기`를 누르기 전에는 `onUseExample`을 호출하지 않는 기존 데이터 흐름을 회귀 테스트로 고정한다.

- [ ] **Step 4: 예시 카드·검색·주의·상세 CSS 구현**

`prebudget.css`에 다음 범위의 규칙을 추가한다.

```css
.prebudget-page .prebudget-guide,
.prebudget-page .prebudget-example-library,
.prebudget-page .prebudget-example-detail { border-color: var(--prebudget-border); border-radius: 22px; color: var(--prebudget-navy); }
.prebudget-page .prebudget-guide-card,
.prebudget-page .prebudget-example-card { border-color: var(--prebudget-border); border-radius: 18px; background: white; }
.prebudget-page .prebudget-guide-grid > [role="listitem"] { display: flex; }
.prebudget-page .prebudget-guide-card { width: 100%; }
.prebudget-page .prebudget-guide-card:hover,
.prebudget-page .prebudget-guide-card:focus-visible { border-color: var(--prebudget-teal); background: var(--prebudget-mint); }
.prebudget-page .prebudget-example-notice { padding: 16px; border-radius: 14px; background: #fff8df; color: #6b5511; }
.prebudget-page .prebudget-example-detail .primary { background: linear-gradient(135deg, #006a8e, #006d72); color: white; }
```

일반 텍스트에는 대비가 낮은 `#1596A3`을 직접 사용하지 않고 `#0B5F66`을 사용한다.

- [ ] **Step 5: 검색·필터·상세·예시 적용 집중 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/examples src/features/prebudget/PrebudgetPage.examples.test.tsx
```

Expected: 기존 16개 데이터 검증, 검색, 재원 선택, 상세, 적용 테스트와 새 구조 테스트 PASS.

- [ ] **Step 6: Task 2 커밋**

```powershell
git add -- src/features/prebudget/examples/PrebudgetFundingGuide.tsx src/features/prebudget/examples/PrebudgetExampleLibrary.tsx src/features/prebudget/examples/PrebudgetExampleLibrary.test.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/prebudget.css
git commit -m "style: unify prebudget example screens"
```

### Task 3: 작성 폼·상태·다운로드 영역과 전체 회귀 검증

**Files:**
- Modify: `src/features/prebudget/PrebudgetPage.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.typography.test.tsx`
- Modify: `src/features/prebudget/PrebudgetPage.examples.test.tsx`
- Modify: `src/features/prebudget/prebudget.css`
- Modify: `src/features/prebudget/prebudgetStyles.test.ts`

**Interfaces:**
- Consumes: 기존 `draft`, `updateItem`, `save`, `generate`, `document`, `downloadHwpx`, `exportPrebudgetWord`, `exportPrebudgetPdf`
- Produces: 홈 일치형 `.prebudget-form-card`, `.prebudget-budget-item`, `.prebudget-status-*`, `.prebudget-download-panel` 표현 클래스와 기존 결과가 동일한 작성·다운로드 흐름

- [ ] **Step 1: 작성 화면 가독성과 다운로드 경계의 실패 테스트 작성**

`PrebudgetPage.typography.test.tsx`가 `src/features/prebudget/prebudget.css`를 읽도록 변경하고 다음 계약을 검증한다.

```ts
const styles = readFileSync("src/features/prebudget/prebudget.css", "utf8");

it("라벨 입력값 도움말과 합계를 읽기 쉬운 크기로 선언한다", () => {
  expect(styles).toMatch(/\.prebudget-page \.form-grid label[^}]*font-size:\s*16px/);
  expect(styles).toMatch(/\.prebudget-page \.form-grid input[^}]*font-size:\s*16px/);
  expect(styles).toMatch(/\.prebudget-page \.category-help p[^}]*font-size:\s*15px/);
  expect(styles).toMatch(/\.prebudget-page \.total strong[^}]*font-size:\s*(?:26|28|30)px/);
});
```

`PrebudgetPage.examples.test.tsx`에 다운로드 행동이 유지되고 Excel이 없는지 추가한다.

```tsx
it("생성 후 기존 문서 다운로드만 제공한다", async () => {
  render(<PrebudgetPage initialSchoolName="서울우리학교" storage={loadedStorage} />);
  await userEvent.setup().click(screen.getByRole("button", { name: "자동점검 후 기안문 생성" }));
  expect(screen.getByRole("button", { name: /한글\(HWPX\)/ })).toBeVisible();
  expect(screen.getByRole("button", { name: "Word" })).toBeVisible();
  expect(screen.getByRole("button", { name: "PDF" })).toBeVisible();
  expect(screen.queryByRole("button", { name: /Excel|XLSX/ })).toBeNull();
});
```

- [ ] **Step 2: 집중 테스트를 실행해 RED 확인**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget/PrebudgetPage.typography.test.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/prebudgetStyles.test.ts
```

Expected: 새 전용 CSS에 폼 가독성·합계 규칙이 아직 없어 typography 계약 FAIL.

- [ ] **Step 3: 표현 전용 클래스 보강**

`PrebudgetPage.tsx`에서 로직을 바꾸지 않고 다음 클래스만 추가한다.

```tsx
<section className="form-card prebudget-form-card prebudget-basic-card">...</section>
<section className="form-card prebudget-form-card prebudget-items-card">...</section>
<div className="budget-item prebudget-budget-item" key={item.id}>...</div>
<div className="actions prebudget-actions">...</div>
<section className="prebudget-preview-section prebudget-document-area" ref={previewRef}>...</section>
<div className="prebudget-downloads prebudget-download-panel">...</div>
```

기존 `onChange`, `onClick`, `disabled`, `aria-label`, `ref`, 내보내기 호출과 `.prebudget-paper` 마크업은 그대로 둔다.

- [ ] **Step 4: 폼·항목·상태·다운로드 CSS 구현**

`prebudget.css`에 작성 전용 스타일을 추가한다.

```css
.prebudget-page .prebudget-form-card { border-color: var(--prebudget-border); border-radius: 20px; box-shadow: 0 12px 32px rgb(20 51 78 / 6%); }
.prebudget-page .form-grid label,
.prebudget-page .item-fields label { color: var(--prebudget-navy); font-size: 16px; }
.prebudget-page .form-grid input,
.prebudget-page .form-grid select,
.prebudget-page .item-fields input,
.prebudget-page .item-fields select { border-color: var(--prebudget-border); font-size: 16px; }
.prebudget-page .category-help { border-color: var(--prebudget-border); background: var(--prebudget-mint); }
.prebudget-page .category-help b { color: var(--prebudget-teal-text); font-size: 16px; }
.prebudget-page .category-help p { color: var(--prebudget-navy); font-size: 15px; }
.prebudget-page .formula output { background: var(--prebudget-mint); color: var(--prebudget-teal-text); }
.prebudget-page .total strong { color: var(--prebudget-teal-text); font-size: 28px; }
.prebudget-page .primary { background: linear-gradient(135deg, #006a8e, #006d72); color: white; }
.prebudget-page .prebudget-download-panel { border-color: var(--prebudget-border); background: linear-gradient(135deg, var(--prebudget-navy), #0b5f66); color: white; }
```

저장 완료, 확인 필요, 오류 메시지는 각각 민트·연한 노랑·연한 코랄 배경을 사용하고 글자 대비를 4.5:1 이상으로 유지한다. `.prebudget-paper` 선택자는 이 파일에 추가하지 않는다.

- [ ] **Step 5: 390px 반응형 규칙 구현**

`prebudget.css`에 다음 원칙을 구현한다.

```css
@media (max-width: 760px) {
  .prebudget-page .prebudget-hero { padding: 22px; }
  .prebudget-page .prebudget-steps { grid-template-columns: 1fr; }
  .prebudget-page .form-grid,
  .prebudget-page .item-fields { grid-template-columns: 1fr; }
  .prebudget-page .prebudget-download-panel { align-items: stretch; flex-direction: column; }
  .prebudget-page .prebudget-download-panel > div:last-child { display: grid; grid-template-columns: 1fr; }
}
```

화면 바깥의 가로 스크롤은 허용하지 않는다. 예시 상세 표만 기존 `.table-wrap` 내부 스크롤을 유지한다.

- [ ] **Step 6: 성립전 집중 회귀 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/prebudget
```

Expected: 예시, 계산, 저장, 검증, 문서 문안, HWPX·Word·PDF, 새 디자인 계약 테스트 모두 PASS.

- [ ] **Step 7: 전체 테스트와 빌드 실행**

Run:

```powershell
npm.cmd test -- --run --testTimeout=10000
npm.cmd run build
git diff --check
```

Expected: 전체 테스트와 TypeScript/Vite 빌드 PASS. 기존 대형 번들 경고는 비차단 경고로 별도 기록한다.

- [ ] **Step 8: 실제 브라우저 PC·모바일 검증**

Run:

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

1440×900과 390×844에서 다음을 확인한다.

```text
홈과 성립전 화면의 네이비·하늘색·민트색이 일치한다.
상단 오른쪽에 공식 자라나 캐릭터가 한 번만 보이고 원본 비율이 유지된다.
예시에서 시작하기가 첫 화면에서 쉽게 보인다.
재원 선택 → 예시 검색 → 상세 미리보기 → 예시 적용이 정상이다.
미리보기 전후에는 초안이 바뀌지 않고 적용 후 모든 입력값을 수정할 수 있다.
단가·수량·횟수 변경 시 항목 금액과 전체 합계가 즉시 일치한다.
임시저장 후 새로고침하면 입력값이 복원된다.
자동점검 후 기안문이 생성된다.
페이지 수준 가로 넘침과 겹침이 없다.
키보드 포커스가 보이고 주요 버튼 높이가 44px 이상이다.
콘솔 오류가 없다.
```

- [ ] **Step 9: 실제 문서 다운로드와 A4 경계 검증**

검증된 예시를 적용해 HWPX·Word·PDF를 각각 한 번 다운로드한다.

```text
HWPX와 DOCX는 ZIP 시그니처 PK로 시작하고 파일 크기가 0보다 크다.
PDF는 %PDF- 시그니처로 시작하고 파일 크기가 0보다 크다.
세 파일의 제목·총액이 화면 기안문과 일치한다.
화면용 그라데이션·카드 배경이 A4 문서 내용에 섞이지 않는다.
Excel 다운로드 버튼이 없다.
```

검증용 다운로드 파일만 정리하고 사용자 원본 파일은 수정하거나 삭제하지 않는다. 개발 서버를 종료한다.

- [ ] **Step 10: Task 3 커밋**

```powershell
git add -- src/features/prebudget/PrebudgetPage.tsx src/features/prebudget/PrebudgetPage.typography.test.tsx src/features/prebudget/PrebudgetPage.examples.test.tsx src/features/prebudget/prebudget.css src/features/prebudget/prebudgetStyles.test.ts
git commit -m "style: complete prebudget home-style workspace"
```

## Final Review

- 전체 변경이 화면 표현 범위에 머물고 도메인·저장·내보내기 구현을 변경하지 않았는지 검토한다.
- `prebudget.css`가 `.prebudget-page` 밖의 일반 요소나 `.prebudget-paper`를 선택하지 않는지 검토한다.
- 실제 예시 적용, 계산, 임시저장, 자동점검, HWPX·Word·PDF 결과의 회귀 증거를 확인한다.
- Critical 또는 Important 문제가 있으면 최소 테스트로 재현한 뒤 수정하고 전체 검증을 다시 실행한다.
- 승인 전 Production 배포를 실행하지 않는다.
