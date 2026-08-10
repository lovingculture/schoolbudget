# Main Budget Planning Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 본예산 화면에 편성 기본계획·부서별 제출계획·업무 흐름·진행 현황을 브라우저에 저장하는 `편성계획 세우기` 탭을 추가한다.

**Architecture:** 계획 데이터는 기존 본예산 브라우저 저장소 상태에 선택적 `planning` 필드로 확장해 이전 세출 수합 저장값을 그대로 복원한다. 별도 `MainBudgetPlanningPage` 컴포넌트는 계획 입력과 일정·부서 관리를 담당하고, 기존 세출 행과 파일 목록은 읽기 전용으로 받아 진행 상태만 계산한다.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library, browser localStorage

## Global Constraints

- `편성계획 세우기` 탭은 본예산 화면의 첫 번째 탭이다.
- 기존 세출자료 통합·검토와 세입자료·3% 검토의 동작, 업로드 자료, 수합 결과를 변경하지 않는다.
- 계획 입력값은 브라우저 내부에 임시저장하며 새로고침 후 복원한다.
- 세입 및 업무추진비 3% 실제 계산은 구현하지 않고 `자료 입력 대기`로 표시한다.
- 초기화는 확인창 승인 후에만 계획 데이터만 지운다.
- Production 배포와 계획서·조정안 다운로드는 포함하지 않는다.

---

### Task 1: 본예산 편성계획 모델과 저장소 호환성

**Files:**
- Create: `src/features/mainBudget/planning.ts`
- Create: `src/features/mainBudget/planning.test.ts`
- Modify: `src/features/mainBudget/types.ts`
- Modify: `src/features/mainBudget/storage.ts`
- Modify: `src/features/mainBudget/storage.test.ts`

**Interfaces:**
- Consumes: `MainBudgetExpenditureRow[]`, `ExpenditureFileStatus[]`, 기존 `mainBudgetStorage`
- Produces: `MainBudgetPlanning`, `MainBudgetDepartmentPlan`, `createMainBudgetPlanning()`, `summarizePlanningProgress(rows, files, planning)` 및 저장소의 선택적 `planning` 필드

- [ ] **Step 1: 실패하는 계획 모델·진행 상태 테스트 작성**

`src/features/mainBudget/planning.test.ts`에 아래 테스트를 작성한다.

```ts
import { describe, expect, it } from "vitest";
import { createMainBudgetPlanning, summarizePlanningProgress } from "./planning";

describe("본예산 편성계획", () => {
  it("기본 계획은 작성 전 상태와 빈 부서 계획으로 시작한다", () => {
    expect(createMainBudgetPlanning()).toMatchObject({
      fiscalYear: new Date().getFullYear() + 1,
      availableAmount: undefined,
      priorities: "",
      requiredProjects: [],
      protectedProjects: [],
      departmentPlans: [],
    });
  });

  it("업로드한 세출 파일과 부서 계획을 제출 완료로 연결한다", () => {
    const planning = {
      ...createMainBudgetPlanning(),
      departmentPlans: [
        { id: "science", department: "과학부", manager: "김담당", deadline: "2026-10-01", note: "" },
        { id: "music", department: "음악부", manager: "이담당", deadline: "2026-10-01", note: "" },
        { id: "blank", department: "", manager: "", deadline: "", note: "" },
      ],
    };
    const progress = summarizePlanningProgress(
      [{ department: "과학부" }],
      [{ name: "과학부.xlsx", status: "success", rowCount: 1, total: 100, message: "정상" }],
      planning,
    );

    expect(progress.departments).toEqual([
      expect.objectContaining({ department: "과학부", status: "submitted" }),
      expect.objectContaining({ department: "음악부", status: "pending" }),
      expect.objectContaining({ id: "blank", status: "review" }),
    ]);
    expect(progress.fileCount).toBe(1);
    expect(progress.departmentCount).toBe(1);
  });
});
```

- [ ] **Step 2: 실패 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/mainBudget/planning.test.ts
```

Expected: `./planning` 모듈이 없어 FAIL.

- [ ] **Step 3: 최소 계획 타입·기본값·진행 상태 구현**

`types.ts`에 다음 인터페이스를 추가한다.

```ts
export interface MainBudgetDepartmentPlan {
  id: string;
  department: string;
  manager: string;
  deadline: string;
  note: string;
}

export interface MainBudgetPlanning {
  fiscalYear: number;
  availableAmount?: number;
  priorities: string;
  requiredProjects: string[];
  protectedProjects: string[];
  departmentPlans: MainBudgetDepartmentPlan[];
  expenditureDeadline: string;
  reviewStartDate: string;
  revenueDeadline: string;
  committeeDate: string;
}
```

`planning.ts`에는 아래와 같은 최소 구현을 둔다.

```ts
export const createMainBudgetPlanning = (): MainBudgetPlanning => ({
  fiscalYear: new Date().getFullYear() + 1,
  availableAmount: undefined,
  priorities: "",
  requiredProjects: [],
  protectedProjects: [],
  departmentPlans: [],
  expenditureDeadline: "",
  reviewStartDate: "",
  revenueDeadline: "",
  committeeDate: "",
});

export function summarizePlanningProgress(
  rows: Pick<MainBudgetExpenditureRow, "department">[],
  files: Pick<ExpenditureFileStatus, "status">[],
  planning: MainBudgetPlanning,
) {
  const submittedDepartments = new Set(
    rows.map((row) => row.department.trim()).filter(Boolean),
  );
  const plannedDepartments = new Set(
    planning.departmentPlans.map((plan) => plan.department.trim()).filter(Boolean),
  );
  return {
    fileCount: files.filter((file) => file.status === "success").length,
    departmentCount: submittedDepartments.size,
    departments: planning.departmentPlans.map((plan) => ({
      ...plan,
      status: !plan.department.trim()
        ? "review"
        : submittedDepartments.has(plan.department.trim())
          ? "submitted"
          : "pending",
    })),
    unplannedDepartments: [...submittedDepartments].filter(
      (department) => !plannedDepartments.has(department),
    ),
  };
}
```

- [ ] **Step 4: 저장소에 선택적 계획 필드를 추가하고 기존 저장값 복원을 검증**

`MainBudgetStoredState`에 `planning?: MainBudgetPlanning`을 추가하고, `load()`이 기존 `rows`와 `files`만 가진 JSON도 기본 계획 데이터와 함께 반환하도록 수정한다. `storage.test.ts`에 아래 테스트를 추가한다.

```ts
it("기존 세출 저장값을 계획 기본값과 함께 복원한다", () => {
  localStorage.setItem(
    "school-budget:main-budget:expenditures:v1",
    JSON.stringify({ rows: [], files: [] }),
  );

  const restored = mainBudgetStorage.load();
  expect(restored?.planning?.departmentPlans).toEqual([]);
  expect(restored?.rows).toEqual([]);
  expect(restored?.files).toEqual([]);
});
```

- [ ] **Step 5: 집중 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/mainBudget/planning.test.ts src/features/mainBudget/storage.test.ts
```

Expected: 기본값, 진행 상태, 기존 저장값 호환성 테스트 PASS.

- [ ] **Step 6: 모델·저장소 변경 커밋**

```powershell
git add -- src/features/mainBudget/types.ts src/features/mainBudget/planning.ts src/features/mainBudget/planning.test.ts src/features/mainBudget/storage.ts src/features/mainBudget/storage.test.ts
git commit -m "feat: persist main budget planning data"
```

### Task 2: 편성계획 탭 UI와 기존 세출 진행 현황 연결

**Files:**
- Create: `src/features/mainBudget/MainBudgetPlanningPage.tsx`
- Create: `src/features/mainBudget/MainBudgetPlanningPage.test.tsx`
- Modify: `src/features/mainBudget/MainBudgetPage.tsx`
- Modify: `src/features/mainBudget/MainBudgetPage.test.tsx`
- Modify: `src/features/mainBudget/mainBudget.css`
- Modify: `src/App.tsx:368`

**Interfaces:**
- Consumes: `MainBudgetPlanning`, `MainBudgetDepartmentPlan`, `summarizePlanningProgress(rows, files, planning)`
- Produces: 편성계획 입력 화면과 `onChange(nextPlanning: MainBudgetPlanning)`·`onReset()`·`onNavigateAgenda()` 콜백, `MainBudgetPage({ onNavigateAgenda? })`

- [ ] **Step 1: 실패하는 계획 탭 UI 테스트 작성**

`MainBudgetPlanningPage.test.tsx`에 아래 테스트를 작성한다.

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MainBudgetPlanningPage } from "./MainBudgetPlanningPage";
import { createMainBudgetPlanning } from "./planning";

describe("본예산 편성계획 세우기", () => {
  it("기본계획과 전체 업무 흐름을 표시한다", () => {
    render(<MainBudgetPlanningPage planning={createMainBudgetPlanning()} rows={[]} files={[]} onChange={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "본예산 편성계획 세우기" })).toBeVisible();
    expect(screen.getByLabelText("편성 가능액")).toBeVisible();
    expect(screen.getByText("편성계획 수립")).toBeVisible();
    expect(screen.getByText("세입자료·3% 검토")).toBeVisible();
    expect(screen.getByText("자료 입력 대기")).toBeVisible();
  });

  it("부서별 제출계획을 추가하고 세출 자료 제출 상태를 표시한다", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MainBudgetPlanningPage planning={createMainBudgetPlanning()} rows={[]} files={[]} onChange={onChange} onReset={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "부서 계획 추가" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      departmentPlans: [expect.objectContaining({ department: "" })],
    }));
  });
});
```

`MainBudgetPage.test.tsx`에 아래 탭 연결 테스트를 추가한다.

```tsx
it("편성계획 탭을 첫 번째로 열고 세출 수합 단계로 이동한다", async () => {
  const user = userEvent.setup();
  render(<MainBudgetPage />);

  expect(screen.getAllByRole("tab")[0]).toHaveTextContent("편성계획 세우기");
  await user.click(screen.getByRole("tab", { name: "세출자료 통합·검토" }));
  expect(screen.getByLabelText("부서별 세출 요구자료 선택")).toBeVisible();
});
```

- [ ] **Step 2: 실패 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/mainBudget/MainBudgetPlanningPage.test.tsx src/features/mainBudget/MainBudgetPage.test.tsx
```

Expected: 새 컴포넌트와 탭이 없어 FAIL.

- [ ] **Step 3: 계획 입력 컴포넌트 구현**

`MainBudgetPlanningPage.tsx`에서 다음 구성으로 구현한다.

```tsx
export function MainBudgetPlanningPage({ planning, rows, files, onChange, onReset }: Props) {
  const progress = summarizePlanningProgress(rows, files, planning);
  const addDepartment = () => onChange({
    ...planning,
    departmentPlans: [...planning.departmentPlans, {
      id: crypto.randomUUID(), department: "", manager: "", deadline: "", note: "",
    }],
  });

  return <section className="main-budget-planning">
    <h2>본예산 편성계획 세우기</h2>
    {/* 기본계획, 부서별 제출계획, 전체 일정, 흐름 및 진행현황 */}
  </section>;
}
```

구체적 입력 요소:

- `편성 가능액`은 `type="number"`로 입력하고 표시용 요약에서만 천 단위 콤마를 사용한다.
- `필수사업`, `감액 제외사업`은 줄 단위 `textarea`를 사용하고 빈 줄은 저장하지 않는다.
- 각 부서 행은 부서명·담당자·제출기한·메모와 삭제 버튼을 가진다.
- 부서명이 비어 있는 행은 `확인 필요`로 표시한다. 업로드된 세출 부서가 계획에 없으면 `계획에 없는 제출 부서` 목록에 `확인 필요`로 표시한다. 빈 값이나 유사 이름을 자동으로 일치시키지 않는다.
- `초기화` 버튼은 `window.confirm("편성계획 입력값을 초기화할까요?")`가 true일 때만 `onReset()`을 호출한다.
- 흐름의 안건설명서 단계는 `onNavigateAgenda` 콜백으로 기존 예산 안건설명서 화면을 열 수 있게 한다.

- [ ] **Step 4: MainBudgetPage에 첫 번째 탭·저장·초기화 연결**

`MainBudgetPage.tsx`를 다음 원칙으로 변경한다.

```tsx
export function MainBudgetPage({ onNavigateAgenda }: { onNavigateAgenda?: () => void }) {
const [tab, setTab] = useState<"planning" | "expenditure" | "revenue">("planning");
const [planning, setPlanning] = useState(restored?.planning ?? createMainBudgetPlanning());

useEffect(() => {
  mainBudgetStorage.save({ rows, files, planning });
}, [rows, files, planning]);
```

- 첫 번째 탭 버튼의 이름은 `편성계획 세우기`로 한다.
- 계획 탭은 `<MainBudgetPlanningPage ... />`를 렌더한다.
- 계획 탭의 안건설명서 단계 버튼은 `onNavigateAgenda?.()`를 호출한다.
- `onReset`은 `setPlanning(createMainBudgetPlanning())`만 수행하며 세출 행·파일을 유지한다.
- 기존 세출과 세입 탭은 버튼 이름과 내부 동작을 변경하지 않는다.

`src/App.tsx`에서 기존 본예산 렌더링을 다음처럼 변경한다.

```tsx
{view === "budget" && <MainBudgetPage onNavigateAgenda={() => setView("agenda")} />}
```

- [ ] **Step 5: PC 우선 CSS와 반응형 규칙 추가**

`mainBudget.css`에 다음 클래스의 규칙을 추가한다.

```css
.main-budget-planning { display: grid; gap: 18px; }
.main-budget-plan-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.main-budget-department-table { overflow-x: auto; }
.main-budget-flow { display: grid; grid-template-columns: repeat(5, minmax(150px, 1fr)); gap: 10px; }
.main-budget-flow-step { padding: 16px; border-radius: 12px; background: #edf5f4; }
@media (max-width: 760px) {
  .main-budget-plan-grid, .main-budget-flow { grid-template-columns: 1fr; }
}
```

입력 라벨과 값은 기존 본예산 화면과 동일하게 최소 15~16px 가독성을 유지한다. PC에서 부서별 제출계획은 표 형태로 한눈에 보이며, 좁은 화면에서는 가로 스크롤 가능한 표 또는 카드형 배치로 읽을 수 있어야 한다.

- [ ] **Step 6: 집중 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/mainBudget/MainBudgetPlanningPage.test.tsx src/features/mainBudget/MainBudgetPage.test.tsx src/features/mainBudget/storage.test.ts
```

Expected: 계획 탭 순서, 입력 화면, 부서 추가, 기존 세출 탭 이동, 저장소 호환성 테스트 PASS.

- [ ] **Step 7: 전체 테스트·빌드·실제 화면 검증**

Run:

```powershell
npm.cmd test -- --run --testTimeout=10000
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
```

브라우저에서 1440px 및 390px 폭으로 다음을 확인한다.

- 계획 탭이 첫 번째로 표시된다.
- 기본계획·부서별 제출계획·전체 일정·5단계 업무 흐름이 보인다.
- 세출 파일을 하나 업로드한 뒤 계획 탭으로 돌아오면 파일 수·부서 수·제출 상태가 일치한다.
- 세입 단계는 계산값 대신 `자료 입력 대기`를 표시한다.
- 초기화 후 세출 수합 결과가 유지된다.
- 가로 넘침, 입력 잘림, 콘솔 오류가 없다.

- [ ] **Step 8: UI 변경 커밋**

```powershell
git add -- src/features/mainBudget/MainBudgetPlanningPage.tsx src/features/mainBudget/MainBudgetPlanningPage.test.tsx src/features/mainBudget/MainBudgetPage.tsx src/features/mainBudget/MainBudgetPage.test.tsx src/features/mainBudget/mainBudget.css src/App.tsx
git commit -m "feat: add main budget planning workspace"
```

### Task 3: 계획 탭 상태의 실제 저장·초기화 회귀 검증

**Files:**
- Modify: `src/features/mainBudget/MainBudgetPage.test.tsx`

**Interfaces:**
- Consumes: `MainBudgetPage`, browser `localStorage`
- Produces: 새로고침 복원과 계획 초기화가 세출 수합 데이터를 지우지 않는 회귀 테스트

- [ ] **Step 1: 실패하는 저장·초기화 통합 테스트 작성**

`MainBudgetPage.test.tsx`에 아래 테스트를 작성한다.

```tsx
it("편성계획을 저장하고 초기화해도 세출 수합 자료는 유지한다", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const user = userEvent.setup();
  const { unmount } = render(<MainBudgetPage />);

  await user.clear(screen.getByLabelText("전체 우선순위"));
  await user.type(screen.getByLabelText("전체 우선순위"), "학생 안전 우선");
  await user.click(screen.getByRole("tab", { name: "세출자료 통합·검토" }));
  await user.upload(screen.getByLabelText("부서별 세출 요구자료 선택"), expenditureFile("과학부.xlsx", "과학부"));
  await screen.findByText("과학부.xlsx");

  unmount();
  render(<MainBudgetPage />);
  expect(screen.getByDisplayValue("학생 안전 우선")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "편성계획 초기화" }));
  expect(confirm).toHaveBeenCalled();
  await user.click(screen.getByRole("tab", { name: "세출자료 통합·검토" }));
  expect(screen.getByText("과학부.xlsx")).toBeVisible();
});
```

- [ ] **Step 2: 실패 테스트 실행**

Run:

```powershell
npm.cmd test -- --run src/features/mainBudget/MainBudgetPage.test.tsx
```

Expected: 저장·초기화 동작 또는 접근 가능한 버튼이 없어 FAIL.

- [ ] **Step 3: 실제 저장 흐름에 맞게 최소 수정**

계획 입력의 `onChange`가 MainBudgetPage 상태를 갱신하고 기존 `useEffect`가 `{ rows, files, planning }`을 저장하는지 확인한다. `편성계획 초기화` 버튼의 `onReset`은 계획 상태만 기본값으로 교체하며 기존 `rows`, `files`, `mainBudgetStorage.clear()`를 호출하지 않는다.

- [ ] **Step 4: 회귀 테스트와 전체 검증 재실행**

Run:

```powershell
npm.cmd test -- --run src/features/mainBudget/MainBudgetPage.test.tsx
npm.cmd test -- --run --testTimeout=10000
npm.cmd run build
```

Expected: 계획 저장·초기화, 기존 세출 수합, 전체 테스트와 빌드가 모두 PASS.

- [ ] **Step 5: 최종 변경 커밋**

```powershell
git add -- src/features/mainBudget/MainBudgetPage.test.tsx
git commit -m "test: cover main budget planning persistence"
```
