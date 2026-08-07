# 결산설명서 금액 입력 쉼표 표시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 결산설명서 웹 편집 화면의 모든 금액 입력칸에 실시간 세 자리 쉼표를 표시하면서 내부 상태는 숫자로 유지한다.

**Architecture:** 금액 표시와 파싱을 `closing/moneyInput.ts`의 순수 함수로 분리하고 `MoneyInput` 컴포넌트가 이를 연결한다. 기존 총괄 금액 `NumberField`와 세입·세출 행의 결산액 입력만 공통 컴포넌트로 교체하며 구성비와 문서 출력 로직은 변경하지 않는다.

**Tech Stack:** React 19, TypeScript 5.8, Vitest 3.2, Testing Library

## Global Constraints

- 적용 대상은 총괄표, 세계잉여금 처리, 세입 결산내역, 세출 결산내역의 금액 입력이다.
- 구성비와 회계연도 입력은 변경하지 않는다.
- `ClosingAgendaDraft`의 금액 자료형은 `number`를 유지한다.
- 운영 배포는 Vercel 미리보기 확인 후 사용자 승인으로 진행한다.
- 현재 소스는 Git 저장소가 없는 ZIP 추출본이므로 커밋 단계는 변경 파일 기록으로 대체한다.

---

### Task 1: 금액 표시·파싱 순수 함수

**Files:**
- Create: `src/features/closing/moneyInput.ts`
- Create: `src/features/closing/moneyInput.test.ts`

**Interfaces:**
- Produces: `formatEditableMoney(value: number): string`
- Produces: `parseEditableMoney(value: string): number`

- [ ] **Step 1: 실패 테스트 작성**

```ts
expect(formatEditableMoney(2727447000)).toBe("2,727,447,000");
expect(formatEditableMoney(-1234567)).toBe("-1,234,567");
expect(parseEditableMoney("1,713,791,920")).toBe(1713791920);
expect(parseEditableMoney("")).toBe(0);
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/features/closing/moneyInput.test.ts`

Expected: 모듈이 없어 FAIL.

- [ ] **Step 3: 최소 구현**

```ts
export const formatEditableMoney = (value: number) =>
  Math.trunc(Number.isFinite(value) ? value : 0).toLocaleString("ko-KR");

export const parseEditableMoney = (text: string) => {
  const negative = text.trim().startsWith("-");
  const digits = text.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) * (negative ? -1 : 1);
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- --run src/features/closing/moneyInput.test.ts`

Expected: PASS.

---

### Task 2: 모든 금액 입력칸에 공통 MoneyInput 적용

**Files:**
- Modify: `src/features/closing/ClosingEditor.tsx`
- Modify: `src/features/closing/ClosingEditor.test.tsx`

**Interfaces:**
- Consumes: `formatEditableMoney`, `parseEditableMoney`
- Produces: `MoneyInput({ label, value, onChange })`

- [ ] **Step 1: 총괄·세입·세출 쉼표 표시 실패 테스트 작성**

```ts
expect(screen.getByLabelText("예산액")).toHaveValue("2,727,447,000");
expect(screen.getByLabelText("세입 1 결산액")).toHaveValue("2,724,818,217");
expect(screen.getByLabelText("세출 1 결산액")).toHaveValue("2,698,568,069");
expect(screen.getByLabelText("세입 1 구성비")).toHaveValue(100);
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/features/closing/ClosingEditor.test.tsx`

Expected: 기존 number input이 쉼표 없는 값이라 FAIL.

- [ ] **Step 3: MoneyInput 구현과 교체**

```tsx
function MoneyInput({ label, value, onChange }: MoneyInputProps) {
  return <input
    aria-label={label}
    type="text"
    inputMode="numeric"
    value={formatEditableMoney(value)}
    onChange={event => onChange(parseEditableMoney(event.target.value))}
  />;
}
```

`NumberField` 내부 입력과 세입·세출 행의 `결산액` 입력에 사용한다. 구성비 input은 그대로 둔다.

- [ ] **Step 4: 수정과 원본 복원 테스트 보정**

`2727447001` 입력 후 표시값 `2,727,447,001`을 확인하고 원본 복원 후 `2,727,447,000`을 확인한다.

- [ ] **Step 5: 편집기 테스트 통과 확인**

Run: `npm test -- --run src/features/closing/ClosingEditor.test.tsx src/features/closing/moneyInput.test.ts`

Expected: PASS.

---

### Task 3: 전체 회귀검증과 Vercel 미리보기

**Files:**
- Verify only: closing feature and production build

**Interfaces:**
- Consumes: Task 1~2 완료 상태
- Produces: READY 상태의 Vercel preview URL

- [ ] **Step 1: 결산 기능 전체 테스트**

Run: `npm test -- --run src/features/closing`

Expected: 모든 결산 테스트 PASS.

- [ ] **Step 2: 운영 빌드**

Run: `npm run build`

Expected: TypeScript 오류 없이 Vite build PASS.

- [ ] **Step 3: Vercel 미리보기 배포와 상태 확인**

기존 프로젝트 `prj_PtuDzxhtmljjwTeshRdirwAY3GzD`, 팀 `team_LZ9fBwtJ5Z6i4ONPgTYynxbh`, target `preview`로 배포하고 `READY`를 확인한다.

- [ ] **Step 4: 사용자 검토 체크포인트**

미리보기에서 총괄·세계잉여금·세입·세출 결산액에 쉼표가 표시되는지 확인받는다. 운영 배포는 별도 승인을 기다린다.
