# 추경자료 매크로 포함 Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에듀파인 102-2 자료를 일반 `.xlsx`와 VBA·다섯 버튼이 보존된 `.xlsm` 두 형식으로 선택해 다운로드한다.

**Architecture:** 기존 계산 모델은 유지하고, ExcelJS는 데이터가 채워진 네 시트의 XML을 만드는 데만 사용한다. 기준 `.xlsm` ZIP 패키지에 생성된 워크시트 XML을 이식하되 정리본 드로잉 관계, VBA 프로젝트와 매크로 콘텐츠 형식은 템플릿 원본 그대로 보존한다. 브라우저에서 템플릿을 읽고 결과를 생성하므로 업로드 자료는 서버로 전송하지 않는다.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, ExcelJS 4.4, JSZip 3.10, Vitest 3.2

## Global Constraints

- 일반 출력은 `.xlsx`, 매크로 출력은 `.xlsm`이며 각 형식에 맞는 MIME을 사용한다.
- 기준 템플릿의 `vbaProject.bin`, 드로잉, 매크로 연결, 셀 스타일과 버튼 디자인을 보존한다.
- 시트 순서는 `Sheet1`, `불러온원본`, `추경검토`, `정리본`, `단위사업별집계`이다.
- 원본 자료와 생성 작업은 브라우저 안에서만 처리한다.
- 운영 배포는 새 Vercel 미리보기에서 사용자 승인 후에만 진행한다.
- 현재 소스는 Git 저장소가 없는 ZIP 추출본이므로 계획의 커밋 단계는 변경 파일 목록 기록으로 대체한다.

---

### Task 1: 기준 매크로 템플릿과 패키지 검증기

**Files:**
- Add binary asset: `public/templates/supplementary-budget-template.xlsm`
- Create: `src/features/supplementary/xlsmPackage.ts`
- Create: `src/features/supplementary/xlsmPackage.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `ArrayBuffer` 형태의 기준 `.xlsm` 템플릿
- Produces: `loadMacroTemplate(bytes: ArrayBuffer): Promise<JSZip>` 및 `assertMacroPackage(zip: JSZip): Promise<void>`

- [ ] **Step 1: 패키지 보존 실패 테스트 작성**

```ts
it("VBA와 정리본 버튼 관계가 없는 패키지를 거부한다", async () => {
  const zip = new JSZip();
  zip.file("xl/workbook.xml", "<workbook/>");
  await expect(assertMacroPackage(zip)).rejects.toThrow("매크로 템플릿");
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/features/supplementary/xlsmPackage.test.ts`

Expected: `xlsmPackage` 모듈이 없어 FAIL.

- [ ] **Step 3: JSZip 추가 및 확정본 템플릿 복사**

Run: `npm install jszip@3.10.1`

Copy: `upload/집행실적정리용엑셀 확정본(2).xlsm` → `deploy-clean/public/templates/supplementary-budget-template.xlsm`

- [ ] **Step 4: 필수 패키지 검증 구현**

```ts
const REQUIRED = [
  "[Content_Types].xml",
  "xl/vbaProject.bin",
  "xl/drawings/drawing1.xml",
  "xl/drawings/drawing2.xml",
  "xl/worksheets/_rels/sheet4.xml.rels",
] as const;

export async function assertMacroPackage(zip: JSZip) {
  if (REQUIRED.some(path => !zip.file(path))) {
    throw new Error("매크로 템플릿의 VBA 또는 버튼 구성요소가 없습니다.");
  }
  const contentTypes = await zip.file("[Content_Types].xml")!.async("text");
  if (!contentTypes.includes("application/vnd.ms-excel.sheet.macroEnabled.main+xml")) {
    throw new Error("매크로 사용 통합 문서 형식이 아닙니다.");
  }
}
```

- [ ] **Step 5: 단위 테스트 통과 확인**

Run: `npm test -- --run src/features/supplementary/xlsmPackage.test.ts`

Expected: PASS.

- [ ] **Step 6: 변경 파일 기록**

Record: `package.json`, `package-lock.json`, 템플릿, `xlsmPackage.ts`, `xlsmPackage.test.ts`.

---

### Task 2: 생성된 데이터 시트를 `.xlsm` 템플릿에 이식

**Files:**
- Modify: `src/features/supplementary/exportExcel.ts`
- Modify: `src/features/supplementary/xlsmPackage.ts`
- Modify: `src/features/supplementary/exportExcel.test.ts`

**Interfaces:**
- Consumes: `buildSupplementaryWorkbook(source, rows)`가 생성한 네 데이터 시트
- Produces: `serializeSupplementaryMacroWorkbook(source, rows, templateBytes): Promise<Uint8Array>`

- [ ] **Step 1: 매크로 출력 패키지 실패 테스트 작성**

```ts
it("출력 파일에 VBA, 버튼 드로잉과 다섯 시트가 남는다", async () => {
  const bytes = await serializeSupplementaryMacroWorkbook(source, rows, templateBytes);
  const zip = await JSZip.loadAsync(bytes);
  await expect(assertMacroPackage(zip)).resolves.toBeUndefined();
  const workbookXml = await zip.file("xl/workbook.xml")!.async("text");
  expect(workbookXml).toContain('name="Sheet1"');
  expect(workbookXml).toContain('name="정리본"');
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/features/supplementary/exportExcel.test.ts`

Expected: `serializeSupplementaryMacroWorkbook`가 없어 FAIL.

- [ ] **Step 3: 템플릿 시트 매핑과 안전한 이식 구현**

```ts
const TEMPLATE_TARGETS = {
  불러온원본: "xl/worksheets/sheet2.xml",
  추경검토: "xl/worksheets/sheet3.xml",
  정리본: "xl/worksheets/sheet4.xml",
  단위사업별집계: "xl/worksheets/sheet5.xml",
} as const;
```

ExcelJS 임시 `.xlsx` 패키지에서 각 시트 XML을 읽어 템플릿의 대응 XML에 이식한다. `정리본` 시트 XML에는 템플릿의 `<drawing r:id="rId2"/>`를 유지하고 `sheet4.xml.rels`는 교체하지 않는다. 워크북, VBA, 드로잉, 관계, 스타일, 테마와 콘텐츠 형식은 템플릿 파일을 유지한다.

- [ ] **Step 4: 시트 데이터·수식·자동필터 범위 검사 추가**

각 대응 시트의 `<dimension ref>`, `<sheetData>`, `<autoFilter ref>`와 필요 시 `<mergeCells>`를 데이터 행 수에 맞춰 교체하고, 기존 정리본 버튼이 사용하는 열 위치 A:O는 변경하지 않는다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- --run src/features/supplementary/exportExcel.test.ts src/features/supplementary/xlsmPackage.test.ts`

Expected: PASS, `vbaProject.bin` 및 `drawing2.xml` 존재.

- [ ] **Step 6: 변경 파일 기록**

Record: `exportExcel.ts`, `exportExcel.test.ts`, `xlsmPackage.ts`.

---

### Task 3: 두 가지 다운로드 버튼과 사용자 안내

**Files:**
- Modify: `src/features/supplementary/exportExcel.ts`
- Modify: `src/features/supplementary/SupplementaryPage.tsx`
- Modify: `src/features/supplementary/SupplementaryPage.test.tsx`

**Interfaces:**
- Consumes: `/templates/supplementary-budget-template.xlsm`
- Produces: `{연도}_{학교명}_추경검토자료_일반.xlsx` 또는 `{연도}_{학교명}_추경검토자료_버튼포함.xlsm` 브라우저 다운로드

- [ ] **Step 1: 확장자·MIME·안내 실패 테스트 작성**

```ts
it("일반 파일과 매크로 포함 파일을 구분해 다운로드한다", async () => {
  await downloadSupplementaryWorkbook(source, rows, "macro");
  expect(clickedLink.download).toBe("2026_서울옥정초등학교_추경검토자료_버튼포함.xlsm");
  expect(createdBlob.type).toBe("application/vnd.ms-excel.sheet.macroEnabled.12");
});
```

페이지 테스트에는 `일반 Excel 다운로드`, `버튼 포함 Excel 다운로드` 두 버튼과 `Excel에서 콘텐츠 사용을 눌러야 버튼이 작동합니다.` 안내가 나타나는지 추가한다. 일반 버튼은 기존 직렬화 함수를 호출하고 매크로 버튼만 템플릿 fetch를 호출하는지도 검사한다.

- [ ] **Step 2: 실패 확인**

Run: `npm test -- --run src/features/supplementary/exportExcel.test.ts src/features/supplementary/SupplementaryPage.test.tsx`

Expected: 다운로드 종류 인수와 두 번째 버튼이 없어 FAIL.

- [ ] **Step 3: 템플릿 fetch와 `.xlsm` 다운로드 구현**

```ts
if (kind === "standard") {
  bytes = await serializeSupplementaryWorkbook(source, rows);
  mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  filename = `${source.fiscalYear}_${source.schoolName}_추경검토자료_일반.xlsx`;
} else {
  const response = await fetch("/templates/supplementary-budget-template.xlsm");
  if (!response.ok) throw new Error("매크로 템플릿을 불러오지 못했습니다.");
  bytes = await serializeSupplementaryMacroWorkbook(source, rows, await response.arrayBuffer());
  mime = "application/vnd.ms-excel.sheet.macroEnabled.12";
  filename = `${source.fiscalYear}_${source.schoolName}_추경검토자료_버튼포함.xlsm`;
}
```

- [ ] **Step 4: 화면 안내와 실패 메시지 구체화**

두 버튼에 독립적인 생성 상태를 적용한다. 버튼 아래에 매크로 사용 안내를 추가하고, 실패 시 일반/버튼 포함 형식을 구분한 오류 문구를 표시한다.

- [ ] **Step 5: UI와 다운로드 테스트 통과 확인**

Run: `npm test -- --run src/features/supplementary/exportExcel.test.ts src/features/supplementary/SupplementaryPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: 변경 파일 기록**

Record: `exportExcel.ts`, `SupplementaryPage.tsx`, `SupplementaryPage.test.tsx`.

---

### Task 4: 실제 102-2 자료로 구조·합계·버튼 보존 검증

**Files:**
- Modify: `src/features/supplementary/actualExport.test.ts`
- Generated verification file: `/tmp/school-budget-verification/2026_서울옥정초등학교_추경검토자료.xlsm`

**Interfaces:**
- Consumes: 실제 `2026집행실적_102-2_20260801180031440.xlsx`와 기준 템플릿
- Produces: 자동검사를 통과한 실제 `.xlsm` 검증 파일

- [ ] **Step 1: 실제 파일 검증을 `.xlsm` 기준으로 확장**

```ts
expect(zip.file("xl/vbaProject.bin")).not.toBeNull();
expect(zip.file("xl/drawings/drawing2.xml")).not.toBeNull();
expect(await zip.file("xl/worksheets/_rels/sheet4.xml.rels")!.async("text"))
  .toContain("drawing2.xml");
```

기존 합계 `2,341,568,000`, `1,311,300,066`과 데이터 행 수 검증을 유지한다.

- [ ] **Step 2: 실제 검증 테스트 실행**

Run: `npm test -- --run src/features/supplementary/actualExport.test.ts`

Expected: PASS 및 `/tmp/school-budget-verification/...xlsm` 생성.

- [ ] **Step 3: 패키지 무결성 검사**

Run: `unzip -t /tmp/school-budget-verification/2026_서울옥정초등학교_추경검토자료.xlsm`

Expected: `No errors detected`.

- [ ] **Step 4: 표와 버튼 렌더링 확인**

LibreOffice headless PDF 변환 후 `정리본` 첫 페이지에서 버튼 다섯 개, 제목, 헤더와 데이터가 겹치거나 잘리지 않는지 확인한다.

- [ ] **Step 5: Windows Excel 사용자 확인 항목 작성**

미리보기와 함께 다음 확인 순서를 제공한다: 매크로 사용 → 집행잔액 필터 → 불일치 필터 → 전체 보기 → 복사본에서 자료 리셋 → 저장 후 종료.

---

### Task 5: 전체 회귀검증 및 Vercel 미리보기 재배포

**Files:**
- Verify only: project source and build output

**Interfaces:**
- Consumes: Task 1~4의 완료 상태
- Produces: READY 상태의 Vercel preview URL

- [ ] **Step 1: 추경 기능 전체 테스트 실행**

Run: `npm test -- --run src/features/supplementary`

Expected: 모든 추경 테스트 PASS.

- [ ] **Step 2: 운영 빌드 실행**

Run: `npm run build`

Expected: TypeScript 오류 없이 Vite build PASS, 템플릿이 `dist/templates/supplementary-budget-template.xlsm`에 포함됨.

- [ ] **Step 3: Vercel preview 배포**

기존 프로젝트 `prj_PtuDzxhtmljjwTeshRdirwAY3GzD`, 팀 `team_LZ9fBwtJ5Z6i4ONPgTYynxbh`, target `preview`로 배포한다.

- [ ] **Step 4: 배포 상태와 템플릿 접근 확인**

배포가 `READY`인지 확인하고 preview의 `/templates/supplementary-budget-template.xlsm` 응답이 성공하는지 검사한다.

- [ ] **Step 5: 사용자 검토 체크포인트**

미리보기 URL과 실제 생성 `.xlsm` 파일을 제공한다. 사용자가 Windows Excel에서 버튼을 확인하고 운영 배포를 명시적으로 승인할 때까지 production 배포를 실행하지 않는다.
