# 현황

- 작업 브랜치: `codex/launchpad-studio-20261022`, 기준 main: `e244148`.
- 기존 저장소 `nijoow/launchpad` / 기존 Vercel 프로젝트 `nijoow-launchpad` / 운영 주소 https://nijoow-launchpad.vercel.app/ 를 사용한다.
- 다음 작업부터 이 프로젝트의 기존 저장 클라우드 환경에서 이 브랜치 또는 병합된 main을 checkout한다. 별도 환경 변수, 계정, DB, 유료 인프라는 필요 없다.
- 로컬 원본의 untracked `nijoow-launchpad/` 폴더를 보존하고 독립 checkout·3144 포트에서 작업했다.

# 변경

- 기존 녹음·저장 기능을 확장해 Drum/Piano 레이어, 선택 레이어 재녹음과 반주, 16분음표 편집, 한 번 되돌리기를 추가했다.
- 샘플 준비 후 연주를 동기 예약하고 interactive latency hint 및 모바일 소리 시작 버튼을 추가했다. 포인터·키별 독립 입력 상태를 테스트한다.
- 두 레이어 WAV와 사용자 액션으로 생성하는 URL fragment 공유를 추가했다. 이름·ID·개인정보 업로드 없음. v1 읽기 호환, v2 저장.
- 기본 회귀 23개 통과 후 확장 검증. Chrome에서 편집 → 저장 → 새로고침 복원 → 반복 재생, 레이어 재녹음 → 자동 반복, 되돌리기, 공유 링크 미리보기 → 명시적 열기 → 별도 저장을 확인했다.
- 실제 WAV 다운로드: stereo, 44.1kHz, 16bit, 120 BPM에서 352,800 frames / 8초, nonzero samples 확인. Chrome 390px·360px에서 가로 넘침 없음. JS 오류 로그 없음.

# 다음 일

Node 24와 저장소 Yarn으로 재현한다. 비밀값이나 로컬 전용 자산은 없다.

```sh
node .yarn/releases/yarn-4.3.1.cjs install --immutable
node .yarn/releases/yarn-4.3.1.cjs lint
node .yarn/releases/yarn-4.3.1.cjs typecheck
node --import tsx --test tests/*.test.ts
node .yarn/releases/yarn-4.3.1.cjs build
node .yarn/releases/yarn-4.3.1.cjs start -p 3144
```

- macOS Documents 경로에서는 Next 파일 감시가 대기해 동일 소스와 의존성을 `/tmp` 독립 복사본에서 검증했다. 클라우드 일반 checkout에서는 위 명령을 사용한다.
- 모바일 검증은 Chrome 화면 크기와 입력 모델 테스트다. 실제 iOS Safari·Android Chrome 첫 소리, 동시 터치/취소, 체감 지연, WAV 청음은 **미검증**이다. 다음에 실기기에서 확인한다.
- v2를 저장한 후 구버전으로 롤백하면 v2 데이터가 삭제되지는 않지만 목록에 표시되지 않는다. v1 저장본은 계속 호환된다.

# 클라우드 잔여 검증 · 2026-10-22

- 환경 ready 대기 후 원격을 fetch했고 `origin/main = c6d49a36682f765db30e73c5f16c59206e172321` 확인. 사용자 파일 보존, AGENTS.md 및 .agents/skills 없음. 제품 소스·의존성·Space 변경 없음. 기능 재구현 및 새 배포 없음(발견된 제품 결함 없음).
- Node 24.19.0 / Yarn 4.3.1: immutable install, 기존 **33/33 tests**, lint, typecheck, production build 통과. Yarn global 경로는 `/tmp/launchpad-yarn`, 환경의 기존 HTTP(S) proxy를 Yarn 설정에 전달해 설치. peer dependency 및 오래된 Browserslist 경고는 기존 상태.
- 해당 main을 production build하고 `localhost:3144`에서 실제 Chromium 151.0.7922.173 모바일 에뮬레이션 검증. 결과: `verification/cloud-browser-20261022.json`.
- 첫 trusted touch에서 native AudioContext suspended → running, 샘플 시작 확인. 새로고침한 cold context에서 별도 소리 시작 버튼도 suspended → running 확인. AudioContext를 가짜 구현으로 교체하지 않고 native subclass로 상태/샘플 시작만 관찰. OS 오디오 출력·청음·지연 증거가 아님.
- CDP trusted touch 두 손가락: 활성 패드 2 → 하나 해제 후 1 → touchCancel 후 0, 샘플은 정확히 2회 시작.
- Drum/Piano 두 음표를 UI로 편집·저장 → 새로고침: IndexedDB v2 음표, 이름, 선택 악기 복원. 공유 링크 생성 → 저장 공간이 빈 별도 browser context에서 미리보기만으로 열리지 않음 → 명시적 열기 → 아직 미저장 → 저장 시 별도 ID 생성 및 음표 일치 확인.
- 복원 루프 재생·정지 후 실제 WAV 다운로드: stereo PCM16 / 44,100 Hz / 352,800 frames(8초) / 1,411,244 bytes / nonzero 159,944 samples. JS 오류·HTTP 실패 0, 390/360px 가로 넘침 없음. 스크린샷·WAV는 `/tmp/launchpad-local-verification/`에 보관(임시 파일).
- 재현: Playwright가 사용 가능한 Node 환경에서 `node scripts/verify-browser.cjs http://localhost:3144`. 기본 대상은 운영 주소, 출력 기본값 `/tmp/launchpad-verification`, `VERIFY_OUTPUT`/`CHROMIUM_PATH` 지정 가능. Playwright는 클라우드 기본 제공 도구이며 앱 의존성에 추가하지 않음.
- **운영 직접 브라우저 검증 미완료**: `page.goto https://nijoow-launchpad.vercel.app/` → `net::ERR_TUNNEL_CONNECTION_FAILED`. curl 및 별도 권한 실행의 읽기 전용 요청도 환경 프록시 `CONNECT tunnel failed, response 403`. 권한 자동 검토 거부가 아닌 네트워크 프록시 응답이며 사이트 결함으로 판정하지 않음. 접근 제한 우회·설정 변경 없음.
- Vercel 연결 도구의 read-only get_deployment 확인: 운영 alias는 `dpl_6dAV6nL8vHTF6XDeX6nsvGaaeanQ`, production READY, main SHA `c6d49a3…`, aliasError null. 이는 운영 UI 흐름 통과를 뜻하지 않음.
- **남음**: 네트워크 접근 가능한 환경의 운영 브라우저 재검증; 실제 iOS Safari·Android Chrome 첫 소리/동시 터치/취소/저장·공유 복원/다운로드 UX; 실기기 청음·체감 지연·WAV 청음. 클라우드 통과로 대체하지 말 것.
