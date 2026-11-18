# nijoow-launchpad

브라우저에서 드럼과 피아노를 연주하고 4마디 루프를 녹음하고 편집할 수 있는 웹 런치패드입니다. 작업한 루프는 IndexedDB에 저장하거나 WAV 파일 및 공유 링크로 내보낼 수 있습니다.

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
