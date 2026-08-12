# 예산 자료실 로컬 검증 보고서

검증일: 2026-08-12  
검증 기준 커밋: `a3fc0a4` 이후 로컬 작업 트리

## 범위

- 예산 자료실 공개/관리자 UI 자동화 검증
- 비공개 Storage 다운로드 어댑터 및 파일 검증 자동화 검증
- 프로젝트 전체 회귀 테스트와 production build
- 원격 Supabase 적용, 원격 데이터 변경, 배포 및 push는 제외

## 결과

| 항목 | 결과 | 증거 |
|---|---|---|
| 전체 자동 테스트 | 통과 | `npm.cmd run test:run`: 64 files, 254 tests passed |
| 예산 자료실 공개 목록/비공개 다운로드 | 통과 | `BudgetResourceLibraryPage.test.tsx` |
| 관리자 등록·수정·삭제·취소 | 통과 | `BudgetResourceLibraryPage.test.tsx`, `ResourceAdminDialog.test.tsx` |
| 공개/비공개 목록 분리 | 통과 | 관리자 전체 목록 및 일반 사용자 공개 목록 테스트 |
| 파일 형식·30MB 제한 | 통과 | `resourceValidation.test.ts`, `resourceUpload.test.ts` |
| 저장소 CRUD/보상 처리 | 통과 | `resourceRepository.test.ts`: 16 tests |
| 권한 SQL 정적 계약 | 통과 | `budget_resource_library.test.ts`: 5 tests |
| 전체 build | 통과 | `npm.cmd run build`: TypeScript 및 Vite build exit 0 |
| diff 형식 검사 | 통과 | `git diff --check`: exit 0 |

Build에는 기존과 같은 500kB 초과 chunk 경고가 있으며 신규 compile 오류는 없다.

## 발견 및 최소 수정

1. 성립전예산 문서 테스트 fixture가 화면의 의도된 빈 기본값 변경을 반영하지 못해 요구부서가 공란으로 생성됐다. 제품 기본값은 변경하지 않고 테스트 fixture에 `체육안전교육부`를 명시했다.
2. 홈의 전체 이동 경로 테스트는 단독 실행에서 통과했지만 전체 병렬 테스트 부하에서는 기본 5초 제한을 반복 초과했다. 제품 코드는 변경하지 않고 이 장시간 통합 테스트에만 15초 제한을 적용했다.

## 미완료/차단

- 원격 Supabase 읽기 전용 점검은 외부 인증 단계에서 `password authentication failed`로 차단됐다.
- 따라서 SQL/migration 적용, 실제 관리자 계정의 RLS CRUD, 실제 PDF/XLS/XLSX/HWPX 업로드·다운로드, 일반 사용자 직접 접근 차단 검증은 수행하지 않았다.
- 로컬 개발 서버는 `127.0.0.1:4178`에서 기동됐으나 앱 내 브라우저 연결이 해당 로컬 호스트의 DOM을 반환하지 못해 수동 1440x900/390x844 브라우저 검증은 완료하지 못했다. UI 동작은 jsdom 기반 컴포넌트 테스트로만 확인했다.
- Vercel Preview 배포와 push는 이 검증 작업의 금지 범위라 수행하지 않았다.

## 원격 적용 전 게이트

1. Supabase 연결 자격을 복구한다.
2. 실제 `profiles` grants/RLS와 Storage policies를 읽기 전용으로 점검한다.
3. 검토된 SQL 적용 승인을 받은 뒤 migration을 실행한다.
4. 관리자/일반 사용자 두 세션으로 실제 파일 CRUD와 권한 차단을 검증한다.
5. 현재 브랜치만 push한 뒤 Vercel Preview에서 데스크톱/모바일 화면을 검증한다. Production promote는 하지 않는다.
