학교예산 한눈에 보기 — 운영 배포 최종 소스

기준 운영 주소
https://school-budget-portal.vercel.app/

기준 배포
- 운영 배포 ID: dpl_DwWXXjbyBSUgqZJ3kraeAUb7DZUF
- 원본 Preview 배포 ID: dpl_6Q3cUzVZ88SBqNPKwHgrRGvWxqcA
- 운영 배포일: 2026-08-02

포함된 주요 기능
- 예산안건 설명서 자동화
- 2026학년도 예산편성 지침 PDF 검색 및 미리보기
- 성립전예산 임시저장, 자동점검, 기안문 및 Excel·Word·PDF 생성
- 결산 설명서 자동화
- 집행실적으로 추경자료 만들기
- 원가통계비목 20개 및 비목별 동적 설명

실행 방법
1. 이 폴더에서 터미널을 엽니다.
2. npm install
3. npm run dev

검증 방법
- 테스트: npm run test:run
- 운영 빌드: npm run build

테스트 자료 안내
- 전체 84개 테스트 중 2개는 개발 당시 업로드한 실제 에듀파인 102-2 Excel 원본을 참조합니다.
- 개인정보 보호를 위해 해당 사용자 원본은 ZIP에 포함하지 않았습니다.
- 원본이 없으면 관련 2개 테스트만 파일 없음(ENOENT)으로 표시되고, 나머지 82개 테스트와 운영 빌드는 정상 실행됩니다.

참고
- node_modules는 용량이 크므로 ZIP에서 제외했습니다. npm install로 복원됩니다.
- Vercel 프로젝트 연결정보(.vercel)는 개인정보 및 오배포 방지를 위해 제외했습니다.
- public/guidelines 폴더에 실제 지침 PDF가 포함되어 있습니다.
- dist 폴더에는 현재 운영 배포와 일치하는 빌드 결과물이 포함되어 있습니다.
