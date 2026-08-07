# 2026학년도 예산편성지침 검색·미리보기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 2026학년도 예산편성지침 PDF 한 건을 사이트에서 216쪽 전체 검색하고, 검색 결과의 해당 페이지를 즉시 미리 볼 수 있게 한다.

**Architecture:** 원본 PDF와 페이지별 텍스트 색인을 Vite 정적 자산으로 배포한다. 검색 로직은 순수 TypeScript 모듈로 분리하고 React 화면은 그 결과와 선택 페이지 상태만 관리하며, 브라우저 기본 PDF 뷰어에 `#page=N`을 전달한다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, Poppler `pdftotext`, Vercel 정적 배포

## Global Constraints

- 기존 예시 자료 4개는 제거하고 실제 지침 1개만 표시한다.
- PDF 216쪽의 제목과 본문을 키워드로 검색한다.
- 검색 결과는 페이지당 한 건이며 검색어 주변 문장을 보여준다.
- 결과는 최대 50개까지 표시한다.
- 관리자 업로드, AI 검색, 데이터베이스는 추가하지 않는다.
- PDF 미리보기가 불가능한 환경을 위해 새 탭 열기와 내려받기를 유지한다.
- 먼저 Vercel Preview로만 배포하며 Production은 별도 승인 전까지 금지한다.
- 현재 작업공간은 Git 저장소가 아니므로 각 Task의 커밋 단계는 변경 파일·테스트 결과 기록으로 대체한다.

---

## File Structure

- Create: `public/guidelines/2026-school-budget-guideline.pdf` — 배포할 원본 PDF
- Create: `scripts/generate-guideline-index.mjs` — Poppler로 페이지별 텍스트 JSON을 생성하는 재현 가능한 스크립트
- Create: `src/features/guidelines/guidelineIndex.json` — 216쪽 페이지별 검색 텍스트
- Create: `src/features/guidelines/searchGuideline.ts` — 검색어 정규화, 발췌, 최대 결과 제한
- Create: `src/features/guidelines/searchGuideline.test.ts` — 순수 검색 로직 테스트
- Create: `src/features/guidelines/GuidelinesPage.tsx` — 실제 문서 카드, 결과, PDF 미리보기
- Create: `src/features/guidelines/GuidelinesPage.test.tsx` — 사용자 검색·페이지 이동 테스트
- Create: `src/features/guidelines/guidelines.css` — 검색 결과와 반응형 미리보기 스타일
- Modify: `src/App.tsx` — 기존 고정 `Guidelines`를 새 페이지 컴포넌트로 교체
- Modify: `src/App.test.tsx` — 예산지침 메뉴 연결 회귀 테스트
- Modify: `src/styles.css` — 기존 공용 검색/목록 스타일과 충돌하지 않도록 최소 조정

### Task 1: 실제 PDF와 페이지 검색 색인

**Files:**
- Create: `public/guidelines/2026-school-budget-guideline.pdf`
- Create: `scripts/generate-guideline-index.mjs`
- Create: `src/features/guidelines/guidelineIndex.json`
- Create: `src/features/guidelines/searchGuideline.ts`
- Test: `src/features/guidelines/searchGuideline.test.ts`

**Interfaces:**
- Consumes: 제공받은 `◆2026학년도 학교회계 예산편성 기본지침(수정).pdf`
- Produces: `type GuidelinePage = { page: number; text: string }`, `searchGuideline(pages, query, limit?): GuidelineSearchResult[]`

- [ ] **Step 1: 실제 PDF를 정적 자산 경로에 복사하고 페이지 수를 검증한다**

Run:

```bash
mkdir -p public/guidelines src/features/guidelines tmp/pdfs
cp '/workspace/scratch/eb956e669181/upload/◆2026학년도 학교회계 예산편성 기본지침(수정).pdf' public/guidelines/2026-school-budget-guideline.pdf
pdfinfo public/guidelines/2026-school-budget-guideline.pdf | rg '^Pages:'
```

Expected: `Pages: 216`

- [ ] **Step 2: 페이지별 텍스트 JSON 생성 스크립트를 작성한다**

페이지마다 `pdftotext -f N -l N -layout`을 실행해 `{ "page": N, "text": "..." }` 배열을 UTF-8 JSON으로 저장한다. 연속 공백은 한 칸으로 줄이되 한글과 문장부호는 보존한다.

```js
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const pdf = "public/guidelines/2026-school-budget-guideline.pdf";
const output = "src/features/guidelines/guidelineIndex.json";
mkdirSync("src/features/guidelines", { recursive: true });
const pages = Array.from({ length: 216 }, (_, index) => {
  const page = index + 1;
  const raw = execFileSync("pdftotext", ["-f", String(page), "-l", String(page), "-layout", pdf, "-"] , { encoding: "utf8" });
  return { page, text: raw.replace(/\s+/g, " ").trim() };
});
writeFileSync(output, `${JSON.stringify(pages, null, 2)}\n`);
```

- [ ] **Step 3: 색인을 생성하고 첫 페이지와 마지막 페이지를 확인한다**

Run:

```bash
node scripts/generate-guideline-index.mjs
node -e "const x=require('./src/features/guidelines/guidelineIndex.json'); console.log(x.length,x[0].page,x.at(-1).page)"
```

Expected: `216 1 216`

- [ ] **Step 4: 검색 로직의 실패 테스트를 작성한다**

```ts
import { describe, expect, it } from "vitest";
import { searchGuideline } from "./searchGuideline";

const pages = [
  { page: 23, text: "학교회계 예산편성 기본지침의 성격" },
  { page: 61, text: "학교회계 예산 편성 및 집행 시 유의사항" },
];

it("본문 키워드와 주변 문장을 페이지별로 반환한다", () => {
  expect(searchGuideline(pages, "집행")).toEqual([
    expect.objectContaining({ page: 61, excerpt: expect.stringContaining("집행") }),
  ]);
});

it("공백 검색은 결과가 없고 결과 수를 50개로 제한한다", () => {
  expect(searchGuideline(pages, "   ")).toEqual([]);
  expect(searchGuideline(Array.from({ length: 70 }, (_, i) => ({ page: i + 1, text: "예산" })), "예산")).toHaveLength(50);
});
```

- [ ] **Step 5: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/features/guidelines/searchGuideline.test.ts --run`

Expected: FAIL because `searchGuideline.ts` does not exist.

- [ ] **Step 6: 최소 검색 구현을 작성한다**

```ts
export type GuidelinePage = { page: number; text: string };
export type GuidelineSearchResult = { page: number; excerpt: string };

export function searchGuideline(pages: GuidelinePage[], rawQuery: string, limit = 50): GuidelineSearchResult[] {
  const query = rawQuery.trim().toLocaleLowerCase("ko-KR");
  if (!query) return [];
  return pages.flatMap(({ page, text }) => {
    const normalized = text.toLocaleLowerCase("ko-KR");
    const index = normalized.indexOf(query);
    if (index < 0) return [];
    const start = Math.max(0, index - 55);
    const end = Math.min(text.length, index + query.length + 85);
    return [{ page, excerpt: `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}` }];
  }).slice(0, limit);
}
```

- [ ] **Step 7: 검색 테스트와 색인 표본을 검증한다**

Run:

```bash
npm test -- src/features/guidelines/searchGuideline.test.ts --run
node -e "const x=require('./src/features/guidelines/guidelineIndex.json'); console.log(x.filter(p=>p.text.includes('학교운영위원회')).slice(0,5).map(p=>p.page))"
```

Expected: tests PASS and at least one page number is printed.

- [ ] **Step 8: 변경 파일과 검증 결과를 기록한다**

Record: PDF SHA-256, `guidelineIndex.json` item count 216, test output.

### Task 2: 실제 지침 검색·미리보기 화면

**Files:**
- Create: `src/features/guidelines/GuidelinesPage.tsx`
- Create: `src/features/guidelines/GuidelinesPage.test.tsx`
- Create: `src/features/guidelines/guidelines.css`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `searchGuideline`, `guidelineIndex.json`, `/guidelines/2026-school-budget-guideline.pdf`
- Produces: `GuidelinesPage` React component and accessible search/result interactions

- [ ] **Step 1: 사용자 흐름 실패 테스트를 작성한다**

```tsx
it("실제 지침 본문을 검색하고 해당 페이지 미리보기를 연다", async () => {
  const user = userEvent.setup();
  render(<GuidelinesPage />);
  expect(screen.getByText("2026학년도 학교회계 예산편성 기본지침")).toBeVisible();
  expect(screen.queryByText("성립전예산 편성 및 집행 유의사항")).not.toBeInTheDocument();
  await user.type(screen.getByRole("searchbox", { name: "지침 검색" }), "학교운영위원회");
  const result = await screen.findByRole("button", { name: /페이지 .*학교운영위원회/ });
  await user.click(result);
  expect(screen.getByTitle("2026학년도 예산편성지침 미리보기")).toHaveAttribute("src", expect.stringMatching(/#page=\d+$/));
});
```

- [ ] **Step 2: 컴포넌트 테스트가 실패하는지 확인한다**

Run: `npm test -- src/features/guidelines/GuidelinesPage.test.tsx --run`

Expected: FAIL because `GuidelinesPage` does not exist.

- [ ] **Step 3: 지침 카드와 검색 상태를 구현한다**

`GuidelinesPage`는 `query`, `selectedPage`, `loadError` 상태를 가진다. `useMemo`로 제목 일치 시 1페이지 결과를 포함하고, 본문 결과는 `searchGuideline(index, query)`로 계산한다. 빈 검색어에서는 결과 영역을 렌더링하지 않는다.

주요 상수:

```ts
export const GUIDELINE_PDF_URL = "/guidelines/2026-school-budget-guideline.pdf";
export const GUIDELINE_TITLE = "2026학년도 학교회계 예산편성 기본지침";
```

- [ ] **Step 4: 결과 선택과 PDF 도구를 구현한다**

검색 결과 버튼 클릭 시 `setSelectedPage(result.page)` 후 미리보기 제목 요소로 스크롤한다. 미리보기 iframe은 `${GUIDELINE_PDF_URL}#page=${selectedPage}`를 사용한다. 카드에는 `미리보기`, `새 탭에서 열기`, `PDF 내려받기`를 제공하고 내려받기 링크에는 `download` 속성을 설정한다.

- [ ] **Step 5: App 연결과 홈 카드 문구를 실제 자료 한 건으로 정리한다**

`App.tsx`에서 기존 로컬 `Guidelines()` 함수와 불필요한 `Search`/`Download` import를 제거하고 `GuidelinesPage`를 import한다. 홈의 `최신 예산지침` 목록 역시 실제 문서 한 건만 남긴다.

- [ ] **Step 6: 반응형·접근성 스타일을 추가한다**

데스크톱은 결과 목록과 760px 이상 높이의 미리보기를 읽기 좋은 카드로 배치한다. 760px 이하에서는 세로 배치하고 iframe 높이를 약 560px로 낮춘다. 선택 결과는 테두리와 배경색으로 구분하며 버튼과 링크에 명확한 포커스 표시를 둔다.

- [ ] **Step 7: 컴포넌트 및 App 회귀 테스트를 실행한다**

Run:

```bash
npm test -- src/features/guidelines/GuidelinesPage.test.tsx src/App.test.tsx --run
```

Expected: PASS.

- [ ] **Step 8: 변경 파일과 검증 결과를 기록한다**

Record: component test output and modified files list.

### Task 3: 전체 검증과 Preview 배포

**Files:**
- Verify: all files changed in Tasks 1-2
- Modify only if verification exposes a defect

**Interfaces:**
- Consumes: completed guideline feature
- Produces: verified Vite build and Vercel Preview URL

- [ ] **Step 1: 전체 테스트를 실행한다**

Run: `npm run test:run`

Expected: all test files and tests PASS.

- [ ] **Step 2: TypeScript와 Vite production build를 검증한다**

Run: `npm run build`

Expected: exit code 0 and `dist/guidelines/2026-school-budget-guideline.pdf` exists.

- [ ] **Step 3: 실제 브라우저로 기능을 검증한다**

Run: `npm run dev -- --host 0.0.0.0`

Verify:

- 예산지침 메뉴에 실제 문서 한 건만 표시된다.
- `학교운영위원회`, `업무추진비`, `예산의 집행` 검색이 결과와 문장을 표시한다.
- 결과 선택 시 해당 `#page=N` 미리보기가 열린다.
- 결과 없음 안내, 새 탭 열기, 내려받기가 동작한다.
- 1440px 데스크톱과 390px 모바일 폭에서 잘림이 없다.

- [ ] **Step 4: Vercel Preview로만 배포한다**

Run: `vercel deploy --yes --scope lovingcultures-projects`

Expected: Preview deployment URL. Do not use `--prod`.

- [ ] **Step 5: Preview URL에서 정적 자산과 화면을 확인한다**

Verify the Preview root and `/guidelines/2026-school-budget-guideline.pdf` return HTTP 200, then repeat one keyword search in the deployed UI.

- [ ] **Step 6: 사용자에게 Preview 주소와 검증 결과를 전달한다**

State explicitly that Production was not deployed and wait for separate production approval.
