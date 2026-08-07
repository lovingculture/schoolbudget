# 성립전예산 재원구분 콤보박스 변경 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성립전예산 기본정보의 `재원` 항목을 `재원구분`으로 바꾸고, 지정된 세 가지 선택지와 기본값을 정확히 적용한 뒤 Vercel Preview로만 배포한다.

**Architecture:** 기존 `Prebudget` 화면의 단일 `<select>`를 그대로 사용하되 표시명, 기본값, 옵션만 최소 변경한다. React Testing Library 테스트로 label, 기본값, 옵션 수·순서, 기존 옵션 제거를 한 번에 검증하고 전체 회귀 테스트와 Vite 빌드 후 Preview 배포를 확인한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest 3, React Testing Library, Vercel CLI

## Global Constraints

- 표시명은 정확히 `재원구분`이어야 한다.
- 선택지는 `보조금(구청)`, `목적사업비(교육청)`, `수익자부담경비(학부모)` 세 개만 이 순서로 표시한다.
- 기본 선택값은 `목적사업비(교육청)`이다.
- 선택값은 괄호를 포함한 전체 문구이다.
- 기존 `교육청`, `서울시`, `자치구`, `기타` 선택지는 제거한다.
- 기존 성립전예산 입력·계산·단위사업 연동 기능은 변경하지 않는다.
- 배포는 `vercel deploy` Preview만 허용하며 `--prod`, `promote`, 운영 도메인 연결은 실행하지 않는다.
- 이 폴더는 Git 작업 트리가 아니므로 이 작업에서는 커밋 단계를 수행하지 않는다.

---

### Task 1: 재원구분 선택 UI와 회귀 테스트

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Prebudget` 컴포넌트의 기본정보 폼과 접근 가능한 `<label>`/`<select>` 연결
- Produces: 접근 가능한 이름이 `재원구분`이고 값이 전체 문구로 저장되는 단일 선택 상자

- [x] **Step 1: 재원구분 동작을 정의하는 실패 테스트 작성**

`src/App.test.tsx`의 `Portal` 테스트 묶음에 다음 테스트를 추가한다. 파일 상단에 이미 `within`이 import되어 있으므로 기존 import를 재사용한다.

```tsx
it("재원구분 세 항목을 지정된 순서로 표시하고 목적사업비를 기본 선택한다", async () => {
  const user = userEvent.setup();
  render(<Portal displayName="김담당" schoolName="서울한빛초등학교" />);
  await user.click(screen.getByRole("button", { name: "성립전예산 새로 작성" }));

  const sourceSelect = screen.getByLabelText("재원구분");
  expect(sourceSelect).toHaveValue("목적사업비(교육청)");
  expect(
    within(sourceSelect)
      .getAllByRole("option")
      .map((option) => option.textContent),
  ).toEqual([
    "보조금(구청)",
    "목적사업비(교육청)",
    "수익자부담경비(학부모)",
  ]);
  expect(screen.queryByLabelText("재원")).not.toBeInTheDocument();
  expect(within(sourceSelect).queryByRole("option", { name: "교육청" })).not.toBeInTheDocument();
  expect(within(sourceSelect).queryByRole("option", { name: "서울시" })).not.toBeInTheDocument();
  expect(within(sourceSelect).queryByRole("option", { name: "자치구" })).not.toBeInTheDocument();
  expect(within(sourceSelect).queryByRole("option", { name: "기타" })).not.toBeInTheDocument();
});
```

- [x] **Step 2: 새 테스트가 기존 구현에서 실패하는지 확인**

Run:

```bash
npm run test:run -- src/App.test.tsx
```

Expected: FAIL. `재원구분` label을 찾지 못하며 현재 화면에는 `재원`과 기존 네 옵션이 남아 있어야 한다.

- [x] **Step 3: 재원구분 선택 상자를 최소 변경으로 구현**

`src/App.tsx`의 `Prebudget` 기본정보 폼에서 기존 재원 `<label>`을 다음 코드로 교체한다.

```tsx
<label>
  재원구분
  <select defaultValue="목적사업비(교육청)">
    <option>보조금(구청)</option>
    <option>목적사업비(교육청)</option>
    <option>수익자부담경비(학부모)</option>
  </select>
</label>
```

- [x] **Step 4: 대상 테스트가 통과하는지 확인**

Run:

```bash
npm run test:run -- src/App.test.tsx
```

Expected: `src/App.test.tsx`의 모든 테스트 PASS.

- [x] **Step 5: 전체 테스트와 프로덕션 빌드로 회귀 검증**

Run:

```bash
npm run test:run
npm run build
```

Expected: 전체 테스트 PASS, TypeScript 오류 없음, Vite production build 성공.

---

### Task 2: Vercel Preview 배포 및 접근 확인

**Files:**
- Read: `.vercel/project.json`
- No source files modified

**Interfaces:**
- Consumes: Task 1에서 검증된 Vite build와 연결된 Vercel `school-budget-portal` 프로젝트
- Produces: 운영 도메인과 분리된 Vercel Preview deployment URL

- [x] **Step 1: 연결 대상이 school-budget-portal인지 읽기 전용으로 확인**

Run:

```bash
sed -n '1,120p' .vercel/project.json
```

Expected: `projectId`가 `prj_PtuDzxhtmljjwTeshRdirwAY3GzD`, `orgId`가 `team_LZ9fBwtJ5Z6i4ONPgTYynxbh`인 연결 정보가 표시된다.

- [x] **Step 2: Preview 배포만 실행**

Run:

```bash
env npm_config_cache=/tmp/school-budget-vercel-npm-cache \
  XDG_CACHE_HOME=/tmp/school-budget-vercel-xdg-cache \
  XDG_CONFIG_HOME=/tmp/school-budget-vercel-xdg-config \
  XDG_DATA_HOME=/tmp/school-budget-vercel-xdg-data \
  npx --yes vercel@latest deploy --yes
```

Expected: 명령에 `--prod`가 없고 Preview deployment URL이 생성된다. `vercel promote` 및 도메인 관련 명령은 실행하지 않는다.

- [x] **Step 3: Preview 배포 상태와 HTTP 응답 확인**

Vercel 배포 목록에서 새 배포의 target이 Production이 아닌 Preview이고 상태가 `READY`인지 확인한 후, 생성된 Preview URL의 루트 페이지가 HTTP 200을 반환하는지 확인한다.

Expected: Preview target, `READY`, HTTP 200. 사용자에게 Preview URL과 운영 배포를 하지 않았다는 사실을 함께 전달한다.
