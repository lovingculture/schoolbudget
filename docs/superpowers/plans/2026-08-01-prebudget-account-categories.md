# 성립전예산 원가통계비목 20개 목록 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성립전예산 원가통계비목 콤보박스의 기존 목록을 사용자가 지정한 20개 항목으로 정확히 교체한다.

**Architecture:** 기존 `DEFAULT_ACCOUNT_CATEGORIES`의 `[표시명, 설명]` 구조는 유지하고 데이터만 20개로 교체한다. 화면은 이미 이 상수를 순서대로 렌더링하므로 별도 UI 구조 변경 없이 도메인 데이터와 사용자 관점 테스트만 수정한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library

## Global Constraints

- 기존 11개 목록을 새 20개 목록으로 완전히 교체한다.
- 사용자가 제공한 명칭과 순서를 그대로 유지한다.
- 새 예산항목의 기본 원가통계비목은 `일반수용비`로 유지한다.
- `일반업무추진비`, `기간제직원인건비`는 제거한다.
- 단위사업·세부사업 연동과 금액 계산 기능을 변경하지 않는다.
- 검증 후 Vercel Preview만 배포한다.
- `--prod`, `promote`, 운영 도메인 연결은 실행하지 않는다.

---

## File Structure

- Modify: `src/domain/prebudget.test.ts` — 20개 명칭·순서 단위 테스트
- Modify: `src/domain/prebudget.ts` — `DEFAULT_ACCOUNT_CATEGORIES` 데이터 교체
- Modify: `src/App.test.tsx` — 화면 옵션, 기본값 및 제거 항목 사용자 관점 테스트

### Task 1: 원가통계비목 표준 목록 교체

**Files:**
- Modify: `src/domain/prebudget.test.ts`
- Modify: `src/domain/prebudget.ts`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Produces: `DEFAULT_ACCOUNT_CATEGORIES` as readonly `[name, description][]` with exactly 20 entries
- Consumes: `App.tsx`가 `DEFAULT_ACCOUNT_CATEGORIES.map(([name]) => ...)` 방식으로 옵션을 렌더링

- [x] **Step 1: 정확한 명칭과 순서를 검증하는 실패 테스트를 작성한다**

`src/domain/prebudget.test.ts` import에 `DEFAULT_ACCOUNT_CATEGORIES`를 추가하고 아래 테스트를 작성한다.

```ts
it("원가통계비목 20개를 지정된 순서로 제공한다", () => {
  expect(DEFAULT_ACCOUNT_CATEGORIES.map(([name]) => name)).toEqual([
    "공무직인건비",
    "기간제교원인건비",
    "기간제근로자인건비",
    "기타수당",
    "일반수용비",
    "운영수당",
    "급식용식재료비",
    "우유급식비",
    "여비",
    "맞춤형복지비",
    "교직원복지비",
    "교육운영비",
    "학습준비물",
    "학생복지비",
    "기간제교원법정부담금",
    "기간제근로자법정부담금",
    "공무직법정부담금",
    "목적사업업무추진비",
    "비품구입비",
    "도서구입비",
  ]);
});
```

- [x] **Step 2: 기존 11개 목록에서 테스트가 실패하는지 확인한다**

Run:

```bash
npm test -- src/domain/prebudget.test.ts --run
```

Expected: 실제 11개 목록이 기대한 20개 목록과 달라 FAIL.

- [x] **Step 3: DEFAULT_ACCOUNT_CATEGORIES를 20개 목록으로 교체한다**

`src/domain/prebudget.ts`의 기존 상수를 아래 값으로 교체한다.

```ts
export const DEFAULT_ACCOUNT_CATEGORIES = [
  ["공무직인건비", "공무직 근로자의 보수"],
  ["기간제교원인건비", "기간제교원의 보수"],
  ["기간제근로자인건비", "기간제근로자의 보수"],
  ["기타수당", "그 밖의 각종 수당"],
  ["일반수용비", "사무용품·인쇄·수수료·소규모 수선 등 일반 경비"],
  ["운영수당", "강사수당 등 학교 운영 과정의 수당"],
  ["급식용식재료비", "학교급식 식재료 구입비"],
  ["우유급식비", "학생 우유급식 경비"],
  ["여비", "업무 수행을 위한 국내외 여비"],
  ["맞춤형복지비", "맞춤형 복지제도 운영 경비"],
  ["교직원복지비", "교직원 복지 증진 경비"],
  ["교육운영비", "교육활동 운영 경비"],
  ["학습준비물", "학생 학습준비물 구입비"],
  ["학생복지비", "학생 복지 지원 경비"],
  ["기간제교원법정부담금", "기간제교원 법정부담금"],
  ["기간제근로자법정부담금", "기간제근로자 법정부담금"],
  ["공무직법정부담금", "공무직 근로자 법정부담금"],
  ["목적사업업무추진비", "교부 목적사업 수행을 위한 업무추진비"],
  ["비품구입비", "자산의 변동을 가져오는 물품 구입비"],
  ["도서구입비", "도서관·학급문고 등의 도서 구입비"],
] as const;
```

- [x] **Step 4: 도메인 테스트가 통과하는지 확인한다**

Run:

```bash
npm test -- src/domain/prebudget.test.ts --run
```

Expected: 모든 `prebudget` 도메인 테스트 PASS.

- [x] **Step 5: 화면 기본값과 제거 항목 테스트를 작성한다**

`src/App.test.tsx`에 아래 테스트를 추가한다.

```tsx
it("원가통계비목 20개를 표시하고 일반수용비를 기본 선택한다", async () => {
  const user = userEvent.setup();
  render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
  await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

  const categorySelect = screen.getAllByLabelText("원가통계비목")[0];
  expect(categorySelect).toHaveValue("일반수용비");
  expect(categorySelect.querySelectorAll("option")).toHaveLength(20);
  expect(categorySelect).toContainElement(screen.getAllByRole("option", { name: "공무직인건비" })[0]);
  expect(screen.queryByRole("option", { name: "일반업무추진비" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "기간제직원인건비" })).not.toBeInTheDocument();
});
```

- [x] **Step 6: 화면 테스트가 통과하는지 확인한다**

Run:

```bash
npm test -- src/App.test.tsx --run
```

Expected: 모든 App 테스트 PASS.

- [x] **Step 7: 전체 테스트와 빌드를 검증한다**

Run:

```bash
npm run test:run
npm run build
```

Expected: 전체 테스트 PASS, TypeScript 및 Vite build exit code 0.

- [x] **Step 8: Vercel Preview로만 배포한다**

Run:

```bash
vercel deploy --yes
```

Expected: `school-budget-portal` Preview deployment가 `READY`이고 Preview 화면이 HTTP 200. Production target은 생성하지 않는다.

- [x] **Step 9: 결과를 기록한다**

변경 파일 3개, 테스트 수, 빌드 결과, Preview URL과 운영 배포를 실행하지 않았다는 사실을 사용자에게 전달한다.

현재 `deploy-clean` 폴더는 Git 저장소가 아닌 독립 배포 사본이므로 커밋 단계는 생략한다.
