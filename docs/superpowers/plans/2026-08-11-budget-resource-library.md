# Budget Resource Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 지침·자료실을 홈 화면과 같은 디자인의 `예산 자료실`로 통합하고, 지정 관리자 한 명이 Supabase에 공개 자료를 등록·수정·삭제할 수 있게 한다.

**Architecture:** 기존 `GuidelinesPage`의 PDF 본문검색·미리보기를 보존하면서 `BudgetResourceLibraryPage`가 정적 지침/양식과 Supabase 동적 자료를 한 목록으로 조합한다. Supabase Storage에는 파일을, `budget_resources` 테이블에는 검색·표시용 메타데이터를 저장하며 RLS는 `profiles.is_admin`을 기준으로 쓰기 작업을 제한한다. 원격 스키마는 마이그레이션 검토 및 별도 승인 전에는 적용하지 않는다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Vitest, Testing Library, Lucide React, `@supabase/supabase-js` 2.53, Supabase Postgres/RLS/Storage, Vercel Preview

## Global Constraints

- 메뉴와 화면의 사용자 표기는 `예산 자료실`로 통일한다.
- 기존 PDF 검색, 검색결과 페이지 이동, 미리보기, 새 탭 열기, PDF 다운로드를 유지한다.
- 기존 XLS 및 XLSX 본예산 요구자료 양식 다운로드를 유지한다.
- 공식 서울시교육청 캐릭터는 기존 `public/characters/cards/main-budget-good.png`를 재사용한다.
- 업로드 허용 확장자는 PDF, XLS, XLSX, DOCX, HWP, HWPX이며 파일당 최대 30MB다.
- 관리자만 등록·수정·삭제할 수 있고 일반 사용자는 공개 자료 조회·다운로드만 가능하다.
- 사용자 수정 가능한 `user_metadata`를 관리자 판정에 사용하지 않는다.
- 모든 공개 스키마 테이블에 RLS를 켜고 화면 숨김과 데이터 정책을 함께 적용한다.
- Storage 경로에 원본 파일명을 직접 사용하지 않고 UUID 기반 경로를 사용한다.
- 원격 Supabase 변경과 Production 배포는 별도 승인 전까지 실행하지 않는다.
- 모든 조작 요소는 최소 높이 44px, 390px 화면에서 페이지 전체 가로 스크롤이 없어야 한다.

---

## File Structure

- `src/features/resources/resourceTypes.ts`: 자료 분류·메타데이터·입력 타입과 허용 파일 규칙
- `src/features/resources/resourceValidation.ts`: 파일 확장자·MIME·크기·필수값 검증
- `src/features/resources/resourceRepository.ts`: Supabase 목록/업로드/수정/삭제 어댑터
- `src/features/resources/BudgetResourceLibraryPage.tsx`: 통합 자료실 화면과 검색·필터 상태
- `src/features/resources/ResourceAdminDialog.tsx`: 관리자 등록·수정 폼
- `src/features/resources/budgetResourceLibrary.css`: 자료실 전용 반응형 스타일
- `src/features/guidelines/GuidelineSearchPanel.tsx`: 기존 지침 검색·PDF 미리보기 기능을 분리해 재사용
- `src/components/PortalHeader.tsx`: `예산 자료실` 단일 메뉴
- `src/App.tsx`: 관리자 플래그 로드 및 통합 자료실 라우팅
- `supabase/review/budget_resource_library.sql`: 원격 적용 전 검토할 테이블·bucket·RLS 정책 SQL

---

### Task 1: 예산 자료실 통합 화면과 메뉴명

**Files:**
- Create: `src/features/guidelines/GuidelineSearchPanel.tsx`
- Create: `src/features/resources/BudgetResourceLibraryPage.tsx`
- Create: `src/features/resources/budgetResourceLibrary.css`
- Modify: `src/features/guidelines/GuidelinesPage.tsx`
- Modify: `src/components/PortalHeader.tsx`
- Modify: `src/components/PortalHeader.test.tsx`
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/home/HomePage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Test: `src/features/resources/BudgetResourceLibraryPage.test.tsx`

**Interfaces:**
- Consumes: `searchGuideline(pages, query)`, `GUIDELINE_PDF_URL`, `downloadExpenditureTemplate("xls" | "xlsx")`
- Produces: `BudgetResourceLibraryPage({ isAdmin, userId }: { isAdmin: boolean; userId: string })`

- [ ] **Step 1: 지침 검색 기능 보존과 새 화면 계약을 실패 테스트로 작성**

```tsx
render(<BudgetResourceLibraryPage isAdmin={false} userId="user-1" />);
expect(screen.getByRole("heading", { name: "예산 자료실" })).toBeVisible();
expect(screen.getByText("BUDGET RESOURCE LIBRARY")).toBeVisible();
expect(screen.getByRole("img", { name: "자료를 안내하는 서울시교육청 캐릭터" })).toHaveAttribute(
  "src",
  "/characters/cards/main-budget-good.png",
);
expect(screen.getByRole("searchbox", { name: "자료 검색" })).toBeVisible();
expect(screen.getByRole("button", { name: "미리보기" })).toBeVisible();
expect(screen.getByRole("button", { name: "구형 Excel 양식(XLS) 다운로드" })).toBeVisible();
expect(screen.queryByRole("button", { name: "자료 등록" })).not.toBeInTheDocument();
```

- [ ] **Step 2: RED 확인**

Run: `npm.cmd test -- --run src/features/resources/BudgetResourceLibraryPage.test.tsx src/components/PortalHeader.test.tsx src/App.test.tsx`

Expected: `BudgetResourceLibraryPage`가 없고 메뉴명이 `학교예산 지침`이어서 FAIL.

- [ ] **Step 3: 기존 `GuidelinesPage`에서 검색·결과·미리보기 영역을 `GuidelineSearchPanel`로 이동**

```tsx
export function GuidelineSearchPanel() {
  const [query, setQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  // 기존 GuidelinesPage의 results, openPreview, 결과 목록, iframe을 변경 없이 이동한다.
}
```

- [ ] **Step 4: 승인된 히어로와 정적 자료 카드가 있는 통합 화면 구현**

```tsx
export function BudgetResourceLibraryPage({ isAdmin, userId }: Props) {
  return (
    <div className="content budget-resource-library portal-workspace">
      <section className="resource-library-hero" aria-labelledby="resource-library-title">
        <div><span>BUDGET RESOURCE LIBRARY</span><h1 id="resource-library-title">예산 자료실</h1></div>
        <img src="/characters/cards/main-budget-good.png" alt="자료를 안내하는 서울시교육청 캐릭터" />
      </section>
      <GuidelineSearchPanel />
      <StaticResourceCards />
      {isAdmin && <button type="button">자료 등록</button>}
    </div>
  );
}
```

- [ ] **Step 5: 헤더와 홈 링크를 `예산 자료실` 단일 진입점으로 변경**

`PortalHeader`에서 별도 `guidelines`/`resources` 두 버튼을 한 버튼으로 합치고 `App.tsx`에서 두 기존 view 모두 `BudgetResourceLibraryPage`를 렌더링하도록 호환한다. 기존 북마크성 내부 view 문자열은 제거하지 않아 하위 호환을 유지한다.

- [ ] **Step 6: GREEN 및 회귀 확인**

Run: `npm.cmd test -- --run src/features/resources/BudgetResourceLibraryPage.test.tsx src/features/guidelines/GuidelinesPage.test.tsx src/components/PortalHeader.test.tsx src/features/home/HomePage.test.tsx src/App.test.tsx`

Expected: 모든 테스트 PASS.

- [ ] **Step 7: 커밋**

```bash
git add src/features/guidelines src/features/resources src/components/PortalHeader.tsx src/components/PortalHeader.test.tsx src/features/home src/App.tsx src/App.test.tsx
git commit -m "feat: unify budget resource library UI"
```

---

### Task 2: 자료 타입, 검증, Supabase 저장 어댑터

**Files:**
- Create: `src/features/resources/resourceTypes.ts`
- Create: `src/features/resources/resourceValidation.ts`
- Create: `src/features/resources/resourceValidation.test.ts`
- Create: `src/features/resources/resourceRepository.ts`
- Create: `src/features/resources/resourceRepository.test.ts`

**Interfaces:**
- Produces: `BudgetResource`, `BudgetResourceInput`, `ResourceCategory`, `validateResourceInput(input)`, `createResourceRepository(client)`
- Repository methods: `listPublic()`, `create(input, file, userId)`, `update(id, input, replacementFile?)`, `remove(resource)`

- [ ] **Step 1: 타입과 검증 실패 테스트 작성**

```ts
expect(validateResourceInput({ title: "", category: "guide", schoolYear: 2026, file })).toEqual([
  "자료 제목을 입력하세요.",
]);
expect(validateResourceInput({ title: "자료", category: "guide", schoolYear: 2026, file: hugeFile }))
  .toContain("파일은 30MB 이하만 등록할 수 있습니다.");
expect(validateResourceInput({ title: "자료", category: "guide", schoolYear: 2026, file: exeFile }))
  .toContain("PDF, XLS, XLSX, DOCX, HWP, HWPX 파일만 등록할 수 있습니다.");
```

- [ ] **Step 2: 검증 RED 확인**

Run: `npm.cmd test -- --run src/features/resources/resourceValidation.test.ts`

Expected: 모듈이 없어 FAIL.

- [ ] **Step 3: 정확한 타입과 검증 함수 구현**

```ts
export type ResourceCategory = "guide" | "template" | "reference";
export type BudgetResource = {
  id: string; title: string; description: string; category: ResourceCategory;
  schoolYear: number; originalFilename: string; storagePath: string;
  mimeType: string; sizeBytes: number; isPublic: boolean;
  createdBy: string; createdAt: string; updatedAt: string;
};
export const MAX_RESOURCE_BYTES = 30 * 1024 * 1024;
export const ALLOWED_RESOURCE_EXTENSIONS = ["pdf", "xls", "xlsx", "docx", "hwp", "hwpx"] as const;
```

검증은 파일명 마지막 확장자를 소문자로 비교하고 30MB를 초과하면 거부한다. MIME은 보조 검증으로 사용하되 HWP/HWPX의 빈 MIME은 허용 확장자일 때 허용한다.

- [ ] **Step 4: repository 원자성 실패 테스트 작성**

```ts
await repository.create(input, file, "admin-1");
expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^2026\/[^/]+\.pdf$/), file, { upsert: false });
expect(table.insert).toHaveBeenCalledWith(expect.objectContaining({ created_by: "admin-1" }));

table.insert.mockResolvedValue({ data: null, error: new Error("insert failed") });
await expect(repository.create(input, file, "admin-1")).rejects.toThrow("자료 정보를 저장하지 못했습니다.");
expect(storage.remove).toHaveBeenCalledWith([expect.any(String)]);
```

- [ ] **Step 5: `createResourceRepository` 최소 구현**

저장 경로는 `${schoolYear}/${crypto.randomUUID()}.${extension}`으로 만들고, 업로드 후 테이블 insert가 실패하면 같은 경로를 `remove`한다. `remove`는 Storage 삭제가 성공한 뒤 메타데이터를 삭제하며 각 오류를 한글 `ResourceRepositoryError`로 변환한다.

- [ ] **Step 6: GREEN 확인**

Run: `npm.cmd test -- --run src/features/resources/resourceValidation.test.ts src/features/resources/resourceRepository.test.ts`

Expected: 모든 테스트 PASS.

- [ ] **Step 7: 커밋**

```bash
git add src/features/resources/resourceTypes.ts src/features/resources/resourceValidation.ts src/features/resources/resourceValidation.test.ts src/features/resources/resourceRepository.ts src/features/resources/resourceRepository.test.ts
git commit -m "feat: add budget resource storage adapter"
```

---

### Task 3: Supabase 마이그레이션과 관리자 플래그 연결

**Files:**
- Create: `supabase/review/budget_resource_library.sql`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: 기존 `profiles(user_id, school_id, display_name, role)`
- Produces: 검토용 `supabase/review/budget_resource_library.sql`, 적용 승인 후 `profiles.is_admin boolean`, `public.budget_resources`, Storage bucket `budget-resources`, `Portal(..., isAdmin)`

- [ ] **Step 1: 현재 환경의 CLI 부재를 확인하고 검토용 SQL 파일 생성**

Run: `supabase --version`

Expected: 현재 환경에서는 `supabase` 명령을 찾지 못한다. CLI를 임의로 설치하지 않고 `supabase/review/budget_resource_library.sql`만 작성한다. 원격 적용 승인을 받은 뒤 Supabase MCP `execute_sql`로 검증하고, 마이그레이션 도구가 준비된 환경에서 `supabase migration new budget_resource_library`로 정식 이력을 생성한다.

- [ ] **Step 2: 마이그레이션 SQL 작성**

```sql
alter table public.profiles add column if not exists is_admin boolean not null default false;

create table if not exists public.budget_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 150),
  description text not null default '',
  category text not null check (category in ('guide','template','reference')),
  school_year integer not null check (school_year between 2000 and 2100),
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null check (size_bytes between 1 and 31457280),
  is_public boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.budget_resources enable row level security;
grant select on public.budget_resources to authenticated;
grant insert, update, delete on public.budget_resources to authenticated;

create policy "authenticated read public resources" on public.budget_resources
for select to authenticated using (is_public = true or exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));
create policy "admins insert resources" on public.budget_resources
for insert to authenticated with check (created_by = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));
create policy "admins update resources" on public.budget_resources
for update to authenticated using (exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
)) with check (exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));
create policy "admins delete resources" on public.budget_resources
for delete to authenticated using (exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('budget-resources', 'budget-resources', true, 31457280, array[
  'application/pdf','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/haansofthwp','application/hwp+zip','application/octet-stream'
]) on conflict (id) do update set public = excluded.public,
file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admins insert budget resource files" on storage.objects
for insert to authenticated with check (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));
create policy "admins update budget resource files" on storage.objects
for update to authenticated using (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
)) with check (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));
create policy "admins delete budget resource files" on storage.objects
for delete to authenticated using (bucket_id = 'budget-resources' and exists (
  select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.is_admin
));
```

- [ ] **Step 3: 관리자 플래그 로딩 실패 테스트 작성**

`profiles` mock이 `{ school_id, display_name, is_admin: true }`를 반환할 때 `Portal`이 `BudgetResourceLibraryPage isAdmin={true}`를 렌더링하고 `자료 등록` 버튼이 보이는지 검증한다.

- [ ] **Step 4: App 프로필 타입과 조회 확장**

```ts
type PortalProfile = { displayName: string; schoolName: string; isAdmin: boolean };
// select("school_id, display_name, is_admin")
setProfile({ displayName: data.display_name, schoolName: school?.name ?? "소속 학교", isAdmin: data.is_admin === true });
```

- [ ] **Step 5: 로컬 테스트만 실행하고 원격 적용 전 중단**

Run: `npm.cmd test -- --run src/App.test.tsx src/features/resources/BudgetResourceLibraryPage.test.tsx`

Expected: PASS. 마이그레이션 SQL, 관리자 지정 대상 사용자 ID, 정책 목록을 사용자에게 보여주고 별도 승인을 요청한다. 이 단계에서는 `supabase db push`, MCP `execute_sql`, Dashboard SQL 실행을 하지 않는다.

- [ ] **Step 6: 커밋**

```bash
git add supabase/review/budget_resource_library.sql src/App.tsx src/App.test.tsx
git commit -m "feat: prepare budget resource permissions"
```

---

### Task 4: 관리자 등록·수정·삭제 UI

**Files:**
- Create: `src/features/resources/ResourceAdminDialog.tsx`
- Create: `src/features/resources/ResourceAdminDialog.test.tsx`
- Modify: `src/features/resources/BudgetResourceLibraryPage.tsx`
- Modify: `src/features/resources/BudgetResourceLibraryPage.test.tsx`
- Modify: `src/features/resources/budgetResourceLibrary.css`

**Interfaces:**
- Consumes: Task 2의 `BudgetResourceInput`, `validateResourceInput`, `ResourceRepository`
- Produces: `ResourceAdminDialog({ mode, resource, onSubmit, onCancel })`

- [ ] **Step 1: 등록 폼 및 권한 표시 실패 테스트 작성**

```tsx
render(<BudgetResourceLibraryPage isAdmin userId="admin-1" repository={repository} />);
await user.click(screen.getByRole("button", { name: "자료 등록" }));
expect(screen.getByRole("dialog", { name: "자료 등록" })).toBeVisible();
await user.upload(screen.getByLabelText("파일"), file);
await user.type(screen.getByLabelText("자료 제목"), "성립전예산 참고자료");
await user.click(screen.getByRole("button", { name: "등록하기" }));
expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ title: "성립전예산 참고자료" }), file, "admin-1");
```

- [ ] **Step 2: RED 확인**

Run: `npm.cmd test -- --run src/features/resources/ResourceAdminDialog.test.tsx src/features/resources/BudgetResourceLibraryPage.test.tsx`

Expected: dialog와 submit 흐름이 없어 FAIL.

- [ ] **Step 3: 접근 가능한 dialog와 검증 구현**

폼은 제목, 설명, 분류, 학년도, 파일, 공개 여부를 controlled input으로 관리한다. 등록 중 버튼을 비활성화하고 `role="status"`에 진행/성공 메시지를, `role="alert"`에 검증/서버 오류를 표시한다. 개인정보가 포함된 파일을 등록하지 말라는 경고를 항상 표시한다.

- [ ] **Step 4: 수정·삭제 실패 및 확인 테스트 작성**

```tsx
await user.click(screen.getByRole("button", { name: "자료 수정: 성립전예산 참고자료" }));
await user.clear(screen.getByLabelText("자료 제목"));
await user.type(screen.getByLabelText("자료 제목"), "수정된 참고자료");
await user.click(screen.getByRole("button", { name: "저장하기" }));
expect(repository.update).toHaveBeenCalled();

vi.spyOn(window, "confirm").mockReturnValue(true);
await user.click(screen.getByRole("button", { name: "자료 삭제: 수정된 참고자료" }));
expect(repository.remove).toHaveBeenCalled();
```

- [ ] **Step 5: 수정·삭제 및 목록 재조회 구현**

등록·수정·삭제 성공 후 `repository.listPublic()`을 다시 호출한다. 실패 시 dialog/카드를 유지해 재시도할 수 있게 하고, 삭제 확인을 취소하면 repository를 호출하지 않는다.

- [ ] **Step 6: GREEN 확인**

Run: `npm.cmd test -- --run src/features/resources/ResourceAdminDialog.test.tsx src/features/resources/BudgetResourceLibraryPage.test.tsx`

Expected: 모든 테스트 PASS.

- [ ] **Step 7: 커밋**

```bash
git add src/features/resources/ResourceAdminDialog.tsx src/features/resources/ResourceAdminDialog.test.tsx src/features/resources/BudgetResourceLibraryPage.tsx src/features/resources/BudgetResourceLibraryPage.test.tsx src/features/resources/budgetResourceLibrary.css
git commit -m "feat: add budget resource admin controls"
```

---

### Task 5: 승인 후 Supabase 적용 및 실제 파일 검증

**Files:**
- Modify only if verification finds a scoped defect in Task 2–4 files
- Create: `docs/superpowers/reports/2026-08-11-budget-resource-library-verification.md`

**Interfaces:**
- Consumes: 승인된 migration, 관리자 사용자 ID, 실제 PDF/XLS/XLSX/HWPX 표본
- Produces: 실제 업로드·공개 열람·권한 차단 증거와 Preview URL

- [ ] **Step 1: 별도 승인 후에만 원격 마이그레이션 적용**

Supabase MCP/CLI 연결 상태와 대상 project ref `nmpoccroowlcuoughylh`를 확인한다. 승인된 SQL만 적용하고 관리자 계정의 `profiles.is_admin`을 `true`로 지정한다. service role 키를 브라우저나 저장소에 추가하지 않는다.

- [ ] **Step 2: 정책과 데이터 API 노출 검증**

관리자 세션으로 SELECT/INSERT/UPDATE/DELETE가 성공하고 일반 사용자 세션으로 SELECT만 성공하는지 확인한다. 테이블이 Data API에 노출되지 않으면 RLS를 유지한 채 `authenticated` 권한 grant를 확인한다. Storage 등록·교체에는 INSERT/SELECT/UPDATE 정책이 모두 필요한지 확인한다.

- [ ] **Step 3: 전체 자동 검증**

Run: `npm.cmd run test:run`

Expected: 전체 테스트 PASS.

Run: `npm.cmd run build`

Expected: TypeScript 및 Vite build PASS. 기존 500kB chunk 경고 외 신규 오류 없음.

Run: `git diff --check`

Expected: 출력 없이 exit 0.

- [ ] **Step 4: 브라우저 실제 검증**

1440×900과 390×844에서 다음을 확인한다.

- 캐릭터가 비율 왜곡 없이 표시됨
- `예산 자료실` 단일 메뉴와 활성 상태
- PDF 본문 검색 후 결과 페이지 이동
- PDF 미리보기·새 탭·다운로드
- XLS·XLSX 양식 다운로드
- 관리자 PDF/XLS/XLSX/HWPX 등록·수정·삭제
- 일반 사용자에게 관리자 버튼이 보이지 않고 직접 쓰기 요청이 RLS로 거부됨
- 잘못된 확장자와 30MB 초과 파일 오류
- 콘솔 오류 0건, 페이지 전체 가로 스크롤 0, 조작요소 44px 이상

- [ ] **Step 5: 검증 보고서와 최종 커밋**

```bash
git add docs/superpowers/reports/2026-08-11-budget-resource-library-verification.md
git commit -m "test: verify budget resource library"
```

- [ ] **Step 6: 현재 브랜치만 push하고 Vercel Preview 확인**

Run: `git push origin codex/fix-closing-xlsx`

Expected: PR #1 Vercel Preview가 PASS. Production promote와 운영 도메인 변경은 실행하지 않는다.
