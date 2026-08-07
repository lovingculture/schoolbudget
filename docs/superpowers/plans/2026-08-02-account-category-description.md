# 원가통계비목 설명 연동 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성립전예산의 각 원가통계비목 선택창 옆에 선택값과 실시간으로 연동되는 전체 설명을 표시한다.

**Architecture:** 비목명과 전체 설명은 기존 도메인 상수 `DEFAULT_ACCOUNT_CATEGORIES`에서 단일 관리하고, 순수 조회 함수 `getAccountCategoryDescription()`으로 화면에 전달한다. `Prebudget`은 각 예산항목의 현재 `category`를 조회하여 독립된 안내 상자에 표시하고, CSS Grid와 미디어 쿼리로 넓은 화면에서는 오른쪽, 좁은 화면에서는 아래에 배치한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, React Testing Library, CSS Grid, Vercel CLI

## Global Constraints

- 기존 원가통계비목 20개와 표시 순서를 유지한다.
- `일반업무추진비`는 추가하지 않는다.
- 기본 선택값 `일반수용비`를 유지한다.
- 사용자 제공 설명을 생략하지 않고 표시한다.
- 예산항목마다 선택값과 설명이 독립적으로 연동되어야 한다.
- 안내 설명은 읽기 전용이며 입력값이나 출력 데이터에 추가하지 않는다.
- 화면 폭이 좁으면 설명 상자를 선택창 아래에 배치한다.
- 기존 성립전예산 기능은 변경하지 않는다.
- 수정 후 Vercel Preview로만 배포하고, 별도 승인 전에는 운영 배포·promote·운영 도메인 연결을 실행하지 않는다.
- 이 폴더는 Git 작업 트리가 아니므로 이 작업에서는 커밋 단계를 수행하지 않는다.

---

### Task 1: 비목별 전체 설명 데이터와 조회 함수

**Files:**
- Modify: `src/domain/prebudget.test.ts`
- Modify: `src/domain/prebudget.ts`

**Interfaces:**
- Consumes: `DEFAULT_ACCOUNT_CATEGORIES: readonly (readonly [string, string])[]`
- Produces: `getAccountCategoryDescription(category: string): string`

- [x] **Step 1: 전체 설명과 안전한 조회 동작을 정의하는 실패 테스트 작성**

`src/domain/prebudget.test.ts`의 import에 `getAccountCategoryDescription`을 추가하고 다음 테스트를 작성한다.

```ts
it("원가통계비목의 전체 설명을 조회하고 알 수 없는 비목은 빈 문자열을 반환한다", () => {
  expect(getAccountCategoryDescription("일반수용비")).toBe(
    "학교 운영에 소요되는 일반적인 경비(사무용품 구입비, 감사패·상패 등의 제작비, 인쇄비, 소모성 물품구입비, 비품 수선비, 각종 사용료(소프트웨어사용료 포함) 및 수수료, 시설물 소규모 수선비, 시설장비유지비, 청소용역비, 시설장비위탁 용역비, 임차료, 각종봉사료 등)",
  );
  expect(getAccountCategoryDescription("도서구입비")).toBe(
    "도서대장에 등재되는 도서구입비",
  );
  expect(getAccountCategoryDescription("없는 비목")).toBe("");
});
```

- [x] **Step 2: 도메인 테스트가 기능 부재로 실패하는지 확인**

Run:

```bash
npm run test:run -- src/domain/prebudget.test.ts
```

Expected: FAIL. `getAccountCategoryDescription` export가 없거나 함수가 정의되지 않았다는 오류가 발생한다.

- [x] **Step 3: 20개 설명을 전체 문구로 교체하고 조회 함수 구현**

`src/domain/prebudget.ts`의 `DEFAULT_ACCOUNT_CATEGORIES`를 설계서의 20개 이름·설명·순서로 교체한다. 배열 바로 아래에 다음 순수 함수를 추가한다.

```ts
export function getAccountCategoryDescription(category: string): string {
  return DEFAULT_ACCOUNT_CATEGORIES.find(([name]) => name === category)?.[1] ?? "";
}
```

설명 데이터는 `docs/superpowers/specs/2026-08-02-account-category-description-design.md`의 `비목별 설명 데이터` 1번부터 20번까지를 정확히 옮긴다. `일반업무추진비` 항목은 생성하지 않는다.

- [x] **Step 4: 도메인 테스트와 기존 20개 목록 테스트 통과 확인**

Run:

```bash
npm run test:run -- src/domain/prebudget.test.ts
```

Expected: 해당 파일의 모든 테스트 PASS. 기존 20개 이름과 순서는 변하지 않는다.

---

### Task 2: 선택값과 연동되는 비목 설명 UI

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `getAccountCategoryDescription(category: string): string`, `DraftItem.category`
- Produces: 각 예산항목 내부의 `<aside className="category-help" aria-label="비목 설명">`

- [x] **Step 1: 기본 설명과 선택 변경을 검증하는 실패 테스트 작성**

`src/App.test.tsx`에 다음 테스트를 추가한다.

```tsx
it("원가통계비목 선택에 맞는 전체 설명을 각 항목에 표시한다", async () => {
  const user = userEvent.setup();
  render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
  await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

  const firstCategory = screen.getAllByLabelText("원가통계비목")[0];
  const firstHelp = screen.getAllByLabelText("비목 설명")[0];
  expect(firstHelp).toHaveTextContent(
    "학교 운영에 소요되는 일반적인 경비",
  );

  await user.selectOptions(firstCategory, "공무직인건비");
  expect(firstHelp).toHaveTextContent(
    "공무원이 아닌 기간의 정함이 없는 근로계약을 체결한 근로자 인건비",
  );

  const helpCountBeforeAdd = screen.getAllByLabelText("비목 설명").length;
  await user.click(screen.getByRole("button", { name: "항목 추가" }));
  const helps = screen.getAllByLabelText("비목 설명");
  expect(helps).toHaveLength(helpCountBeforeAdd + 1);
  expect(helps[0]).toHaveTextContent("공무원이 아닌 기간의 정함이 없는 근로계약");
  expect(helps.at(-1)).toHaveTextContent("학교 운영에 소요되는 일반적인 경비");
});
```

- [x] **Step 2: 화면 테스트가 설명 UI 부재로 실패하는지 확인**

Run:

```bash
npm run test:run -- src/App.test.tsx
```

Expected: FAIL. 접근 가능한 이름 `비목 설명`인 요소를 찾지 못한다.

- [x] **Step 3: 조회 함수를 import하고 설명 영역 구현**

`src/App.tsx`의 도메인 import에 `getAccountCategoryDescription`을 추가한다.

원가통계비목 label과 설명 상자를 다음 구조의 `category-field`로 감싼다.

```tsx
<div className="category-field">
  <label>
    원가통계비목
    <select
      value={item.category}
      onChange={(event) => updateItem(i, "category", event.target.value)}
    >
      {DEFAULT_ACCOUNT_CATEGORIES.map(([name]) => (
        <option key={name}>{name}</option>
      ))}
    </select>
  </label>
  <aside className="category-help" aria-label="비목 설명">
    <b>비목 설명</b>
    <p>{getAccountCategoryDescription(item.category)}</p>
  </aside>
</div>
```

- [x] **Step 4: 오른쪽 배치와 반응형 아래 배치 스타일 구현**

`src/styles.css`의 예산항목 스타일 구간에 다음 규칙을 추가한다.

```css
.category-field {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(0, 2fr);
  gap: 12px;
  align-items: stretch;
}

.category-help {
  border: 1px solid #d8e7e3;
  border-radius: 10px;
  background: #f2f8f6;
  padding: 11px 14px;
  color: #46635e;
}

.category-help b {
  display: block;
  margin-bottom: 4px;
  color: #315b58;
  font-size: 11px;
}

.category-help p {
  margin: 0;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.65;
  white-space: normal;
  overflow-wrap: anywhere;
}
```

기존 `@media(max-width:900px)` 안에 다음 규칙을 추가한다.

```css
.category-field {
  grid-column: 1;
  grid-template-columns: 1fr;
}
```

- [x] **Step 5: 대상 화면 테스트 통과 확인**

Run:

```bash
npm run test:run -- src/App.test.tsx
```

Expected: `src/App.test.tsx`의 모든 테스트 PASS. 원가통계비목 옵션은 20개이며 `일반업무추진비`는 없다.

- [x] **Step 6: 전체 회귀 테스트와 production build 확인**

Run:

```bash
npm run test:run
npm run build
```

Expected: 전체 테스트 PASS, TypeScript 오류 없음, Vite build 성공.

---

### Task 3: Vercel Preview 배포와 접근 검증

**Files:**
- Read: `.vercel/project.json`
- No source files modified

**Interfaces:**
- Consumes: Task 2에서 검증된 소스와 `school-budget-portal` Vercel 연결
- Produces: 운영 사이트와 분리된 Preview URL

- [x] **Step 1: 연결 프로젝트 확인**

Run:

```bash
sed -n '1,120p' .vercel/project.json
```

Expected: `projectId`는 `prj_PtuDzxhtmljjwTeshRdirwAY3GzD`, `orgId`는 `team_LZ9fBwtJ5Z6i4ONPgTYynxbh`이다.

- [x] **Step 2: Preview 배포만 실행**

Run:

```bash
env npm_config_cache=/tmp/school-budget-vercel-npm-cache \
  XDG_CACHE_HOME=/tmp/school-budget-vercel-xdg-cache \
  XDG_CONFIG_HOME=/tmp/school-budget-vercel-xdg-config \
  XDG_DATA_HOME=/tmp/school-budget-vercel-xdg-data \
  npx --yes vercel@latest deploy --yes
```

Expected: `--prod` 없이 새 Preview URL을 생성한다. `promote`와 도메인 관련 명령은 실행하지 않는다.

- [x] **Step 3: 배포 상태와 응답 확인**

새 배포의 Vercel target이 Production이 아닌 Preview이고 상태가 `READY`인지 확인한다. Preview URL의 루트 페이지가 HTTP 200을 반환하는지 확인한다.

Expected: Preview target, `READY`, HTTP 200. 사용자에게 Preview URL과 운영 배포를 하지 않았다는 사실을 전달한다.
