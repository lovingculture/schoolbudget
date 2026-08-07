# 예산지침 PDF 페이지 이동 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예산지침 검색 결과에서 선택한 페이지 번호와 사이트 내부 PDF 뷰어의 실제 표시 페이지를 일치시킨다.

**Architecture:** 기존 `GuidelinesPage`의 검색과 선택 상태는 유지한다. 선택 페이지 번호를 iframe의 React `key`로 사용해 페이지 변경 시 기존 iframe을 재사용하지 않고 새 `#page=N` 주소로 마운트한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, 브라우저 기본 PDF 뷰어

## Global Constraints

- PDF.js나 새 런타임 의존성을 추가하지 않는다.
- 검색, 선택 표시, 미리보기 영역 스크롤, 전체 화면 보기, PDF 내려받기를 유지한다.
- 실패 테스트를 먼저 확인한 후 최소 구현을 작성한다.
- 검증 후 Vercel Preview만 배포한다.
- `--prod`, `promote`, 운영 도메인 연결은 실행하지 않는다.

---

## File Structure

- Modify: `src/features/guidelines/GuidelinesPage.test.tsx` — 페이지 변경 시 iframe이 새로 생성되는 회귀 테스트
- Modify: `src/features/guidelines/GuidelinesPage.tsx` — 선택 페이지를 iframe 식별값으로 전달

### Task 1: 선택 페이지별 PDF iframe 재생성

**Files:**
- Modify: `src/features/guidelines/GuidelinesPage.test.tsx`
- Modify: `src/features/guidelines/GuidelinesPage.tsx`

**Interfaces:**
- Consumes: `GuidelinesPage`, `selectedPage: number`, `GUIDELINE_PDF_URL`
- Produces: 선택 페이지가 바뀔 때 새로 마운트되며 `#page=N`을 초기 주소로 갖는 PDF iframe

- [x] **Step 1: iframe 재생성 실패 테스트를 작성한다**

기존 검색·미리보기 테스트 다음에 아래 테스트를 추가한다. 첫 결과와 다른 페이지의 결과를 차례로 클릭하고 iframe DOM 노드가 교체됐는지 확인한다.

```tsx
it("다른 검색 결과를 선택하면 해당 페이지 주소로 PDF iframe을 새로 생성한다", async () => {
  const user = userEvent.setup();
  render(<GuidelinesPage />);

  await user.type(
    screen.getByRole("searchbox", { name: "지침 검색" }),
    "학교운영위원회",
  );

  const results = await screen.findAllByRole("button", {
    name: /페이지 \d+.*학교운영위원회/,
  });
  expect(results.length).toBeGreaterThan(1);

  await user.click(results[0]);
  const firstFrame = screen.getByTitle("2026학년도 예산편성지침 미리보기");

  await user.click(results[1]);
  const secondFrame = screen.getByTitle("2026학년도 예산편성지침 미리보기");
  const secondPage = results[1].getAttribute("aria-label")?.match(/페이지 (\d+)/)?.[1];

  expect(secondFrame).not.toBe(firstFrame);
  expect(secondFrame).toHaveAttribute(
    "src",
    `${GUIDELINE_PDF_URL}#page=${secondPage}`,
  );
});
```

- [x] **Step 2: 테스트가 기존 구현에서 정확히 실패하는지 확인한다**

Run:

```bash
npm test -- src/features/guidelines/GuidelinesPage.test.tsx --run
```

Expected: 새 페이지를 선택한 뒤에도 동일한 iframe DOM 노드를 재사용하므로 `expect(secondFrame).not.toBe(firstFrame)`에서 FAIL.

- [x] **Step 3: 선택 페이지를 iframe의 React key로 지정한다**

`GuidelinesPage.tsx`의 미리보기 iframe에 한 줄만 추가한다.

```tsx
<iframe
  key={selectedPage}
  title="2026학년도 예산편성지침 미리보기"
  src={`${GUIDELINE_PDF_URL}#page=${selectedPage}`}
  onError={() => setPreviewError(true)}
/>
```

- [x] **Step 4: 관련 테스트가 통과하는지 확인한다**

Run:

```bash
npm test -- src/features/guidelines/GuidelinesPage.test.tsx --run
```

Expected: 모든 `GuidelinesPage` 테스트 PASS.

- [x] **Step 5: 전체 테스트와 빌드를 검증한다**

Run:

```bash
npm run test:run
npm run build
```

Expected: 전체 테스트 PASS, TypeScript 및 Vite build exit code 0, `dist/guidelines/2026-school-budget-guideline.pdf` 존재.

- [ ] **Step 6: 실제 브라우저에서 페이지 이동을 검증한다**

Run:

```bash
npm run dev -- --host 0.0.0.0
```

Verify:

- `학교운영위원회`를 검색한다.
- `67쪽` 결과를 클릭한다.
- 미리보기 제목이 `67쪽 미리보기`인지 확인한다.
- PDF 뷰어 상단 페이지 입력값과 실제 문서 화면이 67쪽인지 확인한다.
- 이어서 다른 페이지 결과를 클릭하고 동일하게 일치하는지 확인한다.

- [x] **Step 7: Vercel Preview로만 배포하고 응답을 확인한다**

Run:

```bash
vercel deploy --yes
```

Expected: `school-budget-portal`의 Preview URL과 READY 상태. 새 Preview 루트와 PDF 정적 자산이 HTTP 200을 반환해야 한다.

- [x] **Step 8: 결과를 기록한다**

기록 항목: 변경 파일 2개, 관련 테스트 결과, 전체 테스트 수, 빌드 결과, Preview URL, 운영 배포를 실행하지 않았다는 확인.

현재 폴더는 Git 저장소가 아니므로 이 계획의 커밋 단계는 생략하고 변경 파일과 검증 결과로 이력을 남긴다.
