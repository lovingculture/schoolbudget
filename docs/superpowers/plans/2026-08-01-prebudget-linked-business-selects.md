# 성립전예산 단위사업·세부사업 연동 콤보박스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성립전예산 각 예산항목에서 단위사업을 선택하면 해당 단위사업의 세부사업만 선택할 수 있는 연동 콤보박스를 제공한다.

**Architecture:** 표준 단위사업·세부사업 연결표와 조회 함수를 `src/domain/prebudget.ts`에 둔다. `DraftItem.unitBusiness`에 단위사업을, 기존 `DraftItem.business`에 세부사업을 저장하고, React 화면은 선택 단위사업으로 세부사업 옵션을 계산한다. 단위사업 변경은 같은 상태 업데이트에서 세부사업을 빈 값으로 초기화한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, user-event

## Global Constraints

- 사용자가 제공한 20개 단위사업과 세부사업 명칭을 그대로 사용한다.
- 목록에 없는 값을 직접 입력하는 기능은 추가하지 않는다.
- 기존 세부항목, 원가통계비목, 산출내역 및 금액 계산 기능을 유지한다.
- 새 항목은 단위사업과 세부사업이 모두 미선택 상태로 시작한다.
- 단위사업 미선택 시 세부사업 콤보박스를 비활성화한다.
- 단위사업을 변경하면 기존 세부사업 선택을 초기화한다.
- 검증 후 Vercel Preview만 배포한다.
- `--prod`, `promote`, 운영 도메인 연결은 실행하지 않는다.

---

## File Structure

- Modify: `src/domain/prebudget.ts` — `DraftItem.unitBusiness`, 표준 20개 연결표, 세부사업 조회 함수
- Modify: `src/domain/prebudget.test.ts` — 연결표 수와 대표 조회 결과 단위 테스트
- Modify: `src/App.tsx` — 새 항목 초기값, 단위사업 변경 시 세부사업 초기화, 두 연동 콤보박스
- Modify: `src/App.test.tsx` — 비활성화, 필터링 및 변경 초기화 사용자 흐름 테스트

### Task 1: 표준 단위사업·세부사업 도메인 데이터

**Files:**
- Modify: `src/domain/prebudget.test.ts`
- Modify: `src/domain/prebudget.ts`

**Interfaces:**
- Produces: `PREBUDGET_BUSINESS_OPTIONS`, `getDetailBusinesses(unitBusiness?: string): readonly string[]`, `DraftItem.unitBusiness?: string`

- [x] **Step 1: 표준 연결표의 실패 테스트를 작성한다**

`src/domain/prebudget.test.ts` import에 `PREBUDGET_BUSINESS_OPTIONS`, `getDetailBusinesses`를 추가하고 아래 테스트를 작성한다.

```ts
it("20개 단위사업과 연결된 세부사업을 제공한다", () => {
  expect(PREBUDGET_BUSINESS_OPTIONS).toHaveLength(20);
  expect(getDetailBusinesses("교과 활동")).toEqual([
    "교과활동지원", "국어 교과활동", "사회 교과활동", "수학 교과활동",
    "과학 교과활동", "체육 교과활동", "예술 교과활동", "외국어 교과활동",
    "선택 교과활동", "특수교육 교과활동", "전문 교과활동", "유치원 교과활동",
    "부설기관 교과활동", "정보 교과활동",
  ]);
  expect(getDetailBusinesses("급식 관리")).toEqual(["학교급식운영"]);
  expect(getDetailBusinesses()).toEqual([]);
});
```

- [x] **Step 2: 테스트가 누락된 export로 실패하는지 확인한다**

Run:

```bash
npm test -- src/domain/prebudget.test.ts --run
```

Expected: `PREBUDGET_BUSINESS_OPTIONS`와 `getDetailBusinesses`가 export되지 않아 FAIL.

- [x] **Step 3: DraftItem 필드와 정확한 연결표를 구현한다**

`DraftItem`에 `unitBusiness?: string`을 추가하고, `DEFAULT_ACCOUNT_CATEGORIES` 앞에 아래 읽기 전용 데이터를 추가한다.

```ts
export const PREBUDGET_BUSINESS_OPTIONS = [
  ["기타 교직원 보수", ["교직원 대체인건비", "기타수당"]],
  ["교직원 복지 및 역량강화", ["교직원 역량강화", "교직원복지"]],
  ["급식 관리", ["학교급식운영"]],
  ["기숙사 관리", ["기숙사운영"]],
  ["보건관리", ["학생 및 교직원 보건안전관리", "학교환경위생관리"]],
  ["교육격차해소", ["학비지원", "정보화비지원", "기타 교육격차해소 지원"]],
  ["학생 복지", ["학생장학금운영", "교육복지우선", "학생 복지운영"]],
  ["교과 활동", ["교과활동지원", "국어 교과활동", "사회 교과활동", "수학 교과활동", "과학 교과활동", "체육 교과활동", "예술 교과활동", "외국어 교과활동", "선택 교과활동", "특수교육 교과활동", "전문 교과활동", "유치원 교과활동", "부설기관 교과활동", "정보 교과활동"]],
  ["창의적 체험활동", ["자율·자치활동", "현장체험학습 활동", "동아리 활동", "봉사활동", "진로활동"]],
  ["자유학기(년) 활동", ["자유학기활동"]],
  ["방과후 학교운영", ["방과후 학교운영", "유치원 방과후 과정운영", "늘봄학교 운영"]],
  ["직업교육", ["직업교육 운영"]],
  ["국제교육", ["국제교육 운영"]],
  ["독서활동", ["독서활동 운영"]],
  ["교기육성", ["교기운영"]],
  ["기타 선택적 교육활동", ["창의 교육운영", "기타선택적 교육운영", "다문화 교육운영", "환경교육 운영"]],
  ["교무업무 운영", ["교무학사 운영"]],
  ["생활지도 운영", ["학생생활상담지도", "학교폭력 예방", "학생안전교육"]],
  ["연구학교 운영", ["연구학교 운영"]],
  ["학습지원실 운영", ["방송실 운영", "정보화실 운영", "공동실습소 운영", "기타 학습지원실 운영"]],
] as const;

export function getDetailBusinesses(unitBusiness?: string): readonly string[] {
  return PREBUDGET_BUSINESS_OPTIONS.find(([unit]) => unit === unitBusiness)?.[1] ?? [];
}
```

- [x] **Step 4: 도메인 테스트가 통과하는지 확인한다**

Run:

```bash
npm test -- src/domain/prebudget.test.ts --run
```

Expected: 모든 `prebudget` 도메인 테스트 PASS.

### Task 2: 예산항목 연동 콤보박스 사용자 흐름

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `PREBUDGET_BUSINESS_OPTIONS`, `getDetailBusinesses`, `DraftItem.unitBusiness`
- Produces: 각 예산항목의 `단위사업` 및 `세부사업` select와 단위사업 변경 시 세부사업 초기화 동작

- [x] **Step 1: 연동 콤보박스 실패 테스트를 작성한다**

`src/App.test.tsx`에 아래 테스트를 추가한다.

```tsx
it("단위사업에 맞는 세부사업만 선택하고 단위사업 변경 시 초기화한다", async () => {
  const user = userEvent.setup();
  render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
  await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

  const unitSelect = screen.getAllByLabelText("단위사업")[0];
  const detailSelect = screen.getAllByLabelText("세부사업")[0];
  expect(detailSelect).toBeDisabled();

  await user.selectOptions(unitSelect, "교과 활동");
  expect(detailSelect).toBeEnabled();
  expect(screen.getAllByRole("option", { name: "수학 교과활동" })).toHaveLength(1);
  expect(screen.queryByRole("option", { name: "학교급식운영" })).not.toBeInTheDocument();

  await user.selectOptions(detailSelect, "수학 교과활동");
  expect(detailSelect).toHaveValue("수학 교과활동");
  await user.selectOptions(unitSelect, "급식 관리");
  expect(detailSelect).toHaveValue("");
  expect(screen.getAllByRole("option", { name: "학교급식운영" })).toHaveLength(1);
  expect(screen.queryByRole("option", { name: "수학 교과활동" })).not.toBeInTheDocument();
});
```

- [x] **Step 2: 기존 직접 입력 화면에서 테스트가 실패하는지 확인한다**

Run:

```bash
npm test -- src/App.test.tsx --run
```

Expected: `단위사업` label과 연동 select가 없어 FAIL.

- [x] **Step 3: 새 항목 초기값과 단위사업 변경 초기화를 구현한다**

`App.tsx` import에 `PREBUDGET_BUSINESS_OPTIONS`, `getDetailBusinesses`를 추가한다. `blankItem`에는 `unitBusiness: ""`를 추가한다. `updateItem`은 `unitBusiness` 변경 시 같은 객체 업데이트에서 `business: ""`도 설정한다.

```ts
const updateItem = (index: number, key: keyof DraftItem, value: string | number) => {
  setItems((current) => current.map((item, i) => {
    if (i !== index) return item;
    if (key === "unitBusiness") return { ...item, unitBusiness: String(value), business: "" };
    return { ...item, [key]: value };
  }));
};
```

- [x] **Step 4: 기존 세부사업명 input을 두 select로 교체한다**

각 `budget-item`의 `item-fields` 안에서 기존 `세부사업명` input을 아래 두 label로 교체한다.

```tsx
<label>
  단위사업
  <select
    value={item.unitBusiness ?? ""}
    onChange={(event) => updateItem(i, "unitBusiness", event.target.value)}
  >
    <option value="">선택하세요</option>
    {PREBUDGET_BUSINESS_OPTIONS.map(([unit]) => <option key={unit}>{unit}</option>)}
  </select>
</label>
<label>
  세부사업
  <select
    value={item.business ?? ""}
    disabled={!item.unitBusiness}
    onChange={(event) => updateItem(i, "business", event.target.value)}
  >
    <option value="">{item.unitBusiness ? "선택하세요" : "단위사업을 먼저 선택하세요"}</option>
    {getDetailBusinesses(item.unitBusiness).map((business) => <option key={business}>{business}</option>)}
  </select>
</label>
```

- [x] **Step 5: App 사용자 흐름 테스트가 통과하는지 확인한다**

Run:

```bash
npm test -- src/App.test.tsx --run
```

Expected: 모든 App 테스트 PASS.

- [x] **Step 6: 전체 테스트와 빌드를 검증한다**

Run:

```bash
npm run test:run
npm run build
```

Expected: 전체 테스트 PASS, TypeScript 및 Vite build exit code 0.

- [x] **Step 7: Vercel Preview로만 배포하고 상태를 확인한다**

Run:

```bash
vercel deploy --yes
```

Expected: `school-budget-portal`의 새 Preview deployment가 `READY`, Preview 웹 화면과 PDF 정적 파일이 HTTP 200. Production target은 생성하지 않는다.

- [x] **Step 8: 결과를 기록한다**

변경 파일 4개, 도메인 테스트 결과, UI 테스트 결과, 전체 테스트 수, 빌드 결과, Preview URL, 운영 배포를 실행하지 않았다는 사실을 사용자에게 전달한다.

현재 `deploy-clean` 폴더는 Git 저장소가 아닌 독립 배포 사본이므로 커밋 단계는 생략하고 변경 파일과 검증 결과로 이력을 남긴다.
