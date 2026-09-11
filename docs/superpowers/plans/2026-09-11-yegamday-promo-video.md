# yegamday 30초 홍보영상 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자라나와 열리미가 `학교예산 한눈에`의 제작 취지와 주요 기능을 소개하는 16:9 약 30초 홍보영상을 제작한다.

**Architecture:** 웹앱 소스와 분리된 `promo/yegamday-30s` 폴더에 대본, 장면 명세, 캡처 이미지, 3D 캐릭터 이미지, 음성, 자막과 합성 스크립트를 둔다. 실제 사이트 화면은 개인정보가 없는 상태로 캡처하고, 장면별 무음 영상을 먼저 검수한 뒤 내레이션·대사·배경음·자막을 합성하여 MP4를 만든다.

**Tech Stack:** Playwright 또는 agent-browser 화면 캡처, OpenAI 이미지 생성, FFmpeg/ffprobe, UTF-8 SRT, PowerShell 검증 스크립트

**Spec:** `docs/superpowers/specs/2026-09-11-yegamday-promo-video-design.md`

## Global Constraints

- 완성본은 16:9, 1920×1080, H.264/AAC MP4이며 전체 길이는 28~32초다.
- 대상은 교직원과 일반인이며, 어려운 학교회계 용어를 나열하지 않는다.
- 자라나는 파란색, 열리미는 노란색의 부드러운 3D 캐릭터로 장면마다 외형을 일관되게 유지한다.
- 장면 4의 대사와 자막은 정확히 `파일을 드래그하면 문서와 엑셀이 뚝딱!`으로 표기한다.
- 웹앱 주소는 `https://yegamday.vercel.app`이며 마지막 화면에서 2초 이상 선명하게 표시한다.
- 실제 학교명, 사용자 파일 내용, 개인정보 또는 민감한 예산 자료를 노출하지 않는다.
- 영상 제작 파일은 사이트의 `public` 또는 번들 경로에 넣지 않아 기존 웹앱 배포 용량을 늘리지 않는다.

---

### Task 1: 영상 제작 폴더와 장면 명세 확정

**Files:**
- Create: `promo/yegamday-30s/README.md`
- Create: `promo/yegamday-30s/storyboard.json`
- Create: `promo/yegamday-30s/scripts/validate-storyboard.mjs`
- Create: `promo/yegamday-30s/tests/storyboard.test.mjs`

**Interfaces:**
- Consumes: 승인된 설계 문서의 6개 장면과 확정 대사
- Produces: `{ id, start, end, speaker, line, caption, visual }[]` 형태의 장면 명세

- [ ] **Step 1: 장면 명세 검증 테스트를 작성한다**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scenes = JSON.parse(fs.readFileSync(new URL('../storyboard.json', import.meta.url)));
assert.equal(scenes.length, 6);
assert.equal(scenes[0].start, 0);
assert.equal(scenes.at(-1).end, 30);
assert.ok(scenes.every((scene, index) => index === 0 || scene.start === scenes[index - 1].end));
assert.equal(scenes[3].line, '파일을 드래그하면 문서와 엑셀이 뚝딱!');
assert.match(scenes[5].caption, /yegamday\.vercel\.app/);
```

- [ ] **Step 2: 테스트가 명세 파일 부재로 실패하는지 확인한다**

Run: `node promo/yegamday-30s/tests/storyboard.test.mjs`

Expected: `storyboard.json` 파일을 찾을 수 없다는 오류로 FAIL

- [ ] **Step 3: 설계서와 동일한 0~4, 4~8, 8~13, 13~18, 18~25, 25~30초 구간을 JSON으로 작성한다**

```json
[
  {"id":"01","start":0,"end":4,"speaker":"narrator","line":"반복되는 학교예산 업무, 더 쉽고 빠르게 할 수 없을까요?","caption":"복잡하고 반복적인 학교예산 업무","visual":"서류가 쌓인 책상과 고민하는 교직원"},
  {"id":"02","start":4,"end":8,"speaker":"narrator","line":"이제, 배우는 AI에서 실제로 일하는 AI로.","caption":"배우는 AI에서, 일하는 AI로","visual":"AI 아이콘이 업무 도구로 전환"},
  {"id":"03","start":8,"end":13,"speaker":"jarana","line":"학교를 검색하면 예산과 결산 흐름을 한눈에!","caption":"학교별 예산·결산 분석","visual":"학교 검색과 분석 화면"},
  {"id":"04","start":13,"end":18,"speaker":"yeollimi","line":"파일을 드래그하면 문서와 엑셀이 뚝딱!","caption":"파일을 드래그하면 문서와 엑셀이 뚝딱!","visual":"파일 드래그와 결과 생성"},
  {"id":"05","start":18,"end":25,"speaker":"narrator","line":"성립전예산부터 본예산, 안건설명서와 추경자료까지 간편하게.","caption":"빠르게 · 정확하게 · 한눈에","visual":"대표 업무 카드 순차 노출"},
  {"id":"06","start":25,"end":30,"speaker":"both","line":"학교예산 업무의 든든한 파트너, 학교예산 한눈에!","caption":"yegamday.vercel.app","visual":"캐릭터 인사, 로고와 주소"}
]
```

- [ ] **Step 4: 명세 테스트를 실행한다**

Run: `node promo/yegamday-30s/tests/storyboard.test.mjs`

Expected: exit code 0

- [ ] **Step 5: 제작 규격과 폴더 설명을 README에 기록하고 커밋한다**

Run: `git add promo/yegamday-30s/README.md promo/yegamday-30s/storyboard.json promo/yegamday-30s/scripts/validate-storyboard.mjs promo/yegamday-30s/tests/storyboard.test.mjs && git commit -m "docs: define yegamday promo storyboard"`

### Task 2: 개인정보 없는 실제 웹앱 화면 캡처

**Files:**
- Create: `promo/yegamday-30s/captures/home.png`
- Create: `promo/yegamday-30s/captures/school-search.png`
- Create: `promo/yegamday-30s/captures/budget-tools.png`
- Create: `promo/yegamday-30s/captures/upload.png`
- Create: `promo/yegamday-30s/captures/capture-manifest.json`
- Create: `promo/yegamday-30s/tests/captures.test.mjs`

**Interfaces:**
- Consumes: `https://yegamday.vercel.app` 공개 화면
- Produces: 1920×1080 장면 합성용 PNG와 캡처 URL·시각 기록

- [ ] **Step 1: 네 개 캡처의 존재, PNG 서명, 최소 크기를 검사하는 테스트를 작성한다**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
for (const name of ['home','school-search','budget-tools','upload']) {
  const data = fs.readFileSync(new URL(`../captures/${name}.png`, import.meta.url));
  assert.deepEqual([...data.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  assert.ok(data.length > 50_000, `${name} capture is unexpectedly small`);
}
```

- [ ] **Step 2: 캡처 전 공개 주소가 정상 응답하는지 확인한다**

Run: `curl.exe -I https://yegamday.vercel.app`

Expected: `HTTP/2 200` 또는 `HTTP/1.1 200`

- [ ] **Step 3: 1920×1080 브라우저에서 홈, 학교별 예산 분석, 예산 업무 카드, 파일 업로드 화면을 캡처한다**

각 화면은 빈 입력 상태 또는 가상 예시만 사용하며 브라우저 주소창과 개인 계정 정보는 프레임 밖으로 제외한다.

- [ ] **Step 4: 캡처 테스트와 육안 검수를 수행한다**

Run: `node promo/yegamday-30s/tests/captures.test.mjs`

Expected: exit code 0. 모든 PNG에서 글자가 잘리지 않고 현재 사이트 디자인과 일치함.

- [ ] **Step 5: 캡처 자산을 커밋한다**

Run: `git add promo/yegamday-30s/captures promo/yegamday-30s/tests/captures.test.mjs && git commit -m "assets: capture yegamday promo screens"`

### Task 3: 자라나·열리미 3D 기준 이미지와 장면 이미지 제작

**Files:**
- Create: `promo/yegamday-30s/characters/reference-sheet.png`
- Create: `promo/yegamday-30s/scenes/scene-01.png` through `scene-06.png`
- Create: `promo/yegamday-30s/characters/prompts.md`
- Create: `promo/yegamday-30s/tests/images.ps1`

**Interfaces:**
- Consumes: `public/characters`의 기존 캐릭터 인상, Task 2의 웹앱 캡처
- Produces: 1920×1080 장면별 정지 이미지 6장

- [ ] **Step 1: 여섯 장면 파일의 해상도와 개수를 검사하는 PowerShell 테스트를 작성한다**

```powershell
Add-Type -AssemblyName System.Drawing
$files = Get-ChildItem "$PSScriptRoot/../scenes/scene-*.png"
if ($files.Count -ne 6) { throw "Expected 6 scene images" }
foreach ($file in $files) {
  $image = [System.Drawing.Image]::FromFile($file.FullName)
  try { if ($image.Width -ne 1920 -or $image.Height -ne 1080) { throw "Invalid size: $($file.Name)" } }
  finally { $image.Dispose() }
}
```

- [ ] **Step 2: 기존 자라나·열리미 이미지를 기준으로 정면·측면·표정·색상 기준표를 만든다**

기준표에 자라나는 파란색과 돋보기, 열리미는 노란색과 새싹 형태를 고정하고 얼굴 비율·눈·입·손 모양을 명시한다.

- [ ] **Step 3: 장면 1~6의 3D 캐릭터 이미지를 생성하고 실제 캡처 화면과 합성한다**

모든 생성 프롬프트는 `characters/prompts.md`에 장면별로 기록하며 이미지 안에 한글 문구를 직접 생성하지 않고 자막은 합성 단계에서 넣는다.

- [ ] **Step 4: 이미지 자동 검사와 육안 일관성 검수를 실행한다**

Run: `powershell -ExecutionPolicy Bypass -File promo/yegamday-30s/tests/images.ps1`

Expected: 6개 모두 1920×1080. 두 캐릭터의 색상과 얼굴이 장면마다 동일하고 손가락·눈·로고 왜곡이 없음.

- [ ] **Step 5: 이미지와 프롬프트를 커밋한다**

Run: `git add promo/yegamday-30s/characters promo/yegamday-30s/scenes promo/yegamday-30s/tests/images.ps1 && git commit -m "assets: create 3d promo scenes"`

### Task 4: 음성·자막·음향 자산 제작

**Files:**
- Create: `promo/yegamday-30s/audio/narrator.wav`
- Create: `promo/yegamday-30s/audio/jarana.wav`
- Create: `promo/yegamday-30s/audio/yeollimi.wav`
- Create: `promo/yegamday-30s/audio/both.wav`
- Create: `promo/yegamday-30s/audio/bgm.wav`
- Create: `promo/yegamday-30s/subtitles/ko.srt`
- Create: `promo/yegamday-30s/tests/audio.ps1`

**Interfaces:**
- Consumes: `storyboard.json`의 화자, 대사, 시작·종료 시각
- Produces: 48kHz 음성 자산과 정확한 타임코드의 한국어 SRT

- [ ] **Step 1: ffprobe로 각 음성 길이와 전체 자막 종료 시각을 검사하는 테스트를 작성한다**

검사 범위는 내레이션/캐릭터 음성의 해당 장면 길이 이하, BGM 30초 이상, SRT 마지막 종료 시각 `00:00:30,000` 이하로 고정한다.

- [ ] **Step 2: 확정 대사로 화자별 음성을 생성한다**

내레이터는 따뜻하고 신뢰감 있는 성인 음성, 자라나는 밝고 자신감 있는 음성, 열리미는 친근하고 경쾌한 음성으로 만들며 말속도는 장면 안에서 자연스럽게 끝나도록 조정한다.

- [ ] **Step 3: 설계서 문구 그대로 UTF-8 SRT를 작성한다**

```srt
1
00:00:00,000 --> 00:00:04,000
복잡하고 반복적인 학교예산 업무

2
00:00:04,000 --> 00:00:08,000
배우는 AI에서, 일하는 AI로
```

나머지 네 구간도 `storyboard.json`의 `caption`과 동일하게 이어서 작성한다.

- [ ] **Step 4: 대사를 방해하지 않는 밝은 BGM과 최소 효과음을 준비하고 음량을 검수한다**

대사 구간 BGM은 음성보다 최소 14dB 낮게 유지하고, 검색 완료·파일 드롭·결과 생성 효과음만 사용한다.

- [ ] **Step 5: 음성·자막 테스트 후 커밋한다**

Run: `powershell -ExecutionPolicy Bypass -File promo/yegamday-30s/tests/audio.ps1`

Expected: 모든 음성이 해당 장면 길이에 들어오며 누락된 대사가 없고 SRT가 6개 구간으로 판정됨.

Run: `git add promo/yegamday-30s/audio promo/yegamday-30s/subtitles promo/yegamday-30s/tests/audio.ps1 && git commit -m "assets: add promo narration and captions"`

### Task 5: 장면 애니메이션과 30초 영상 합성

**Files:**
- Create: `promo/yegamday-30s/scripts/render.ps1`
- Create: `promo/yegamday-30s/build/scenes/scene-01.mp4` through `scene-06.mp4`
- Create: `promo/yegamday-30s/dist/yegamday-promo-30s.mp4`
- Create: `promo/yegamday-30s/dist/yegamday-promo-30s-captioned.mp4`

**Interfaces:**
- Consumes: 여섯 장면 PNG, 화자별 WAV, BGM, SRT
- Produces: 무자막 및 자막 포함 H.264/AAC MP4

- [ ] **Step 1: `render.ps1`에 입력 파일 존재 여부와 FFmpeg 설치 확인을 먼저 구현한다**

```powershell
$required = 1..6 | ForEach-Object { Join-Path $PSScriptRoot ("../scenes/scene-{0:d2}.png" -f $_) }
foreach ($path in $required) { if (-not (Test-Path -LiteralPath $path)) { throw "Missing asset: $path" } }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'FFmpeg is required' }
```

- [ ] **Step 2: 장면별로 부드러운 2~4% 줌, 패닝, 페이드 효과를 적용해 지정 길이의 MP4를 만든다**

각 장면은 30fps, 1920×1080, `yuv420p`로 통일하고 장면 3은 검색→분석, 장면 4는 드래그→결과 생성 순서가 보이도록 오버레이한다.

- [ ] **Step 3: 여섯 장면을 순서대로 연결하고 음성·BGM·효과음을 타임라인에 배치한다**

오디오 피크는 -1dB 이하, 대사 구간은 BGM을 낮추는 자동 덕킹을 적용한다.

- [ ] **Step 4: 한글 자막 포함본과 무자막본을 각각 렌더링한다**

자막은 흰색 굵은 글씨, 어두운 반투명 배경, 화면 하단 안전영역 안에 한두 줄로 표시한다.

- [ ] **Step 5: 렌더 결과의 메타데이터를 확인한다**

Run: `ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height,r_frame_rate -of json promo/yegamday-30s/dist/yegamday-promo-30s-captioned.mp4`

Expected: duration 28~32, video `h264` 1920×1080 30fps, audio `aac`

- [ ] **Step 6: 합성 스크립트를 커밋한다**

Run: `git add promo/yegamday-30s/scripts/render.ps1 && git commit -m "build: add reproducible promo video render"`

완성 MP4의 Git 추적 여부는 파일 크기를 확인해 결정한다. 50MB 이상이면 Git에 넣지 않고 릴리스 또는 별도 전달 경로를 사용한다.

### Task 6: 전체 재생 검수와 납품

**Files:**
- Create: `promo/yegamday-30s/QA.md`
- Modify: `promo/yegamday-30s/README.md`

**Interfaces:**
- Consumes: Task 5의 자막 포함본과 무자막본
- Produces: 검수 기록, 재현 명령, 최종 전달 파일

- [ ] **Step 1: 처음부터 끝까지 두 완성본을 재생해 화면·음성·자막 동기화를 검사한다**

`QA.md`에 장면별 시작 시각, 대사 종료 시각, 자막 오탈자, 캐릭터 일관성, 웹주소 노출 시간을 기록한다.

- [ ] **Step 2: 설계 요구사항을 자동·수동으로 최종 확인한다**

Run: `node promo/yegamday-30s/tests/storyboard.test.mjs; node promo/yegamday-30s/tests/captures.test.mjs; powershell -ExecutionPolicy Bypass -File promo/yegamday-30s/tests/images.ps1; powershell -ExecutionPolicy Bypass -File promo/yegamday-30s/tests/audio.ps1`

Expected: 모든 명령 exit code 0. 영상 길이 28~32초, 6개 장면 누락 없음, 최종 주소 2초 이상 표시.

- [ ] **Step 3: 모바일 축소 화면에서도 자막과 주소를 읽을 수 있는지 확인한다**

완성본을 640×360으로 축소 재생하여 자막 잘림, 작은 글씨, 화면 가장자리 요소 잘림이 없음을 `QA.md`에 기록한다.

- [ ] **Step 4: README에 재생 파일과 재렌더링 방법을 기록한다**

무자막본, 자막 포함본, SRT의 정확한 경로와 `render.ps1` 실행 방법을 기재한다.

- [ ] **Step 5: 검수 문서를 커밋하고 작업 브랜치를 푸시한다**

Run: `git add promo/yegamday-30s/README.md promo/yegamday-30s/QA.md && git commit -m "docs: verify yegamday promo delivery"`

Run: `git push -u origin HEAD`

Expected: 원격 브랜치에 모든 제작 명세·스크립트·검수 기록이 저장되고, 최종 MP4 전달 위치가 README에 명시됨.
