# nijoow-launchpad

브라우저에서 피아노 패드를 자유롭게 연주하고, 박자에 맞춰 노트를 누르는 리듬게임을 즐길 수 있습니다. 기존 루프 스튜디오에서는 드럼·피아노 녹음과 편집, 저장, 공유를 지원합니다.

## 주요 기능

- 마우스, 키보드, 터치 입력을 통한 사운드 재생
- 피아노와 드럼 두 가지 악기 모드 지원
- 4마디 루프 레이어 녹음 및 편집
- IndexedDB 로컬 저장 및 WAV 오디오 내보내기
- 별도 서버 없이 URL 해시에 루프 데이터를 담아 공유 (최대 16,000자)

## 기술 스택

Next.js, TypeScript, Tailwind CSS, Web Audio API

## 실행

Node.js 24와 저장소에 포함된 Yarn 4.3.1을 사용합니다.

```sh
node .yarn/releases/yarn-4.3.1.cjs install --immutable
node .yarn/releases/yarn-4.3.1.cjs dev
```

## 피아노 모드

자유 연주와 노트 게임은 같은 6×6 보드를 사용합니다. 세 옥타브의 음과 단축키 위치를 유지하며, 게임에서는 다음에 누를 패드에 테두리가 나타납니다. 게임은 베토벤 〈환희의 송가〉 첫 네 마디를 사용합니다. Peter Chubb의 [Mutopia 퍼블릭 도메인 악보](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528)를 다장조로 옮겨 소프라노는 연주용 노트, 나머지 세 성부는 반주로 사용합니다.

기존 녹음과 저장한 루프는 `/studio`에서 열 수 있습니다. 기존 공유 링크도 같은 스튜디오로 연결됩니다.
