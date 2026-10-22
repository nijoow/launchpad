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
