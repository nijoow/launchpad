'use client';

import { useEffect, useState } from 'react';
import PianoRoom from '../_components/PianoRoom';
import { analyzeTaps, targets, type MeasuredRound } from '@/lib/piano-timing';
import './timing-test.css';

type Output = '내장 스피커' | '블루투스 이어폰';
type Conditions = { device: string; browser: string; output: Output };
type Trial = Conditions &
  MeasuredRound & {
    endedAt: string;
    userAgent: string;
    feeling: string;
  };
const storageKey = 'launchpad.timing-trials.v1';

export default function TimingTest() {
  const [device, setDevice] = useState('');
  const [browser, setBrowser] = useState('');
  const [output, setOutput] = useState<Output>('내장 스피커');
  const [playing, setPlaying] = useState(false);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved: Trial[] = JSON.parse(
        sessionStorage.getItem(storageKey) || '[]',
      );
      if (saved.length) {
        setTrials(saved);
        const last = saved[saved.length - 1];
        setDevice(last.device);
        setBrowser(last.browser);
        setOutput(last.output);
      }
    } catch {
      setStorageAvailable(false);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !storageAvailable) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(trials));
    } catch {
      setStorageAvailable(false);
    }
  }, [loaded, storageAvailable, trials]);

  function finish(round: MeasuredRound) {
    setTrials(previous => [
      ...previous,
      {
        device: device.trim(),
        browser: browser.trim(),
        output,
        ...round,
        endedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        feeling: '',
      },
    ]);
    setPlaying(false);
    window.scrollTo(0, 0);
  }

  function download() {
    const report = {
      version: 1,
      song: '환희의 송가 · 4마디 · 100 BPM',
      targets,
      trials: trials.map(trial => ({
        ...trial,
        timing: analyzeTaps(trial.taps),
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'launchpad-mobile-timing.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (playing)
    return (
      <>
        <div className="timing-banner">
          <span>
            {device} · {output}
          </span>
          <button onClick={() => setPlaying(false)}>
            측정 조건으로 돌아가기
          </button>
        </div>
        <PianoRoom onMeasuredRound={finish} />
      </>
    );

  return (
    <main className="timing-test">
      <h1>휴대폰 박자 측정</h1>
      <p>
        같은 휴대폰에서 〈환희의 송가〉를 연주하세요. 내장 스피커와 블루투스
        이어폰을 번갈아 각각 세 번씩, 들리는 반주에 맞춰 패드를 누르세요.
      </p>
      <form
        onSubmit={event => {
          event.preventDefault();
          setPlaying(true);
        }}
      >
        <label>
          휴대폰 기종
          <input
            required
            value={device}
            onChange={e => setDevice(e.target.value)}
            placeholder="예: iPhone 15"
          />
        </label>
        <label>
          브라우저와 버전
          <input
            required
            value={browser}
            onChange={e => setBrowser(e.target.value)}
            placeholder="예: Safari 18"
          />
        </label>
        <label>
          현재 연결한 출력
          <select
            value={output}
            onChange={e => setOutput(e.target.value as Output)}
          >
            <option>내장 스피커</option>
            <option>블루투스 이어폰</option>
          </select>
        </label>
        <button disabled={!loaded || !device.trim() || !browser.trim()}>
          측정용 게임 열기
        </button>
      </form>
      {trials.length > 0 && (
        <section aria-labelledby="trial-results">
          <h2 id="trial-results">완주 기록 · {trials.length}회</h2>
          <p>
            오차가 음수면 박자보다 일찍, 양수면 늦게 누른 거예요.{' '}
            {storageAvailable
              ? '기록은 이 탭을 닫기 전에 내려받으세요.'
              : '이 브라우저는 임시 저장을 제한해요. 새로고침 전에 기록을 내려받으세요.'}
          </p>
          <ol reversed>
            {trials
              .map((trial, index) => {
                const timing = analyzeTaps(trial.taps);
                return (
                  <li key={trial.endedAt}>
                    <h3>
                      {index + 1}회 · {trial.output}
                    </h3>
                    <p>
                      {trial.device} · {trial.browser} · {trial.hits}/
                      {targets.length}개 성공
                    </p>
                    <p>
                      {timing
                        ? `오차 중앙값 ${timing.median} ms · 가운데 절반 ${timing.p25} ~ ${timing.p75} ms`
                        : '악보와 입력 순서가 달라 오차 비교에서 제외했어요. 모든 입력은 파일에 담깁니다.'}
                    </p>
                    <label>
                      연주 체감
                      <input
                        value={trial.feeling}
                        placeholder="예: 반주에 맞췄는데 늦게 판정됐어요"
                        onChange={e => {
                          const feeling = e.target.value;
                          setTrials(previous =>
                            previous.map((item, i) =>
                              i === index ? { ...item, feeling } : item,
                            ),
                          );
                        }}
                      />
                    </label>
                  </li>
                );
              })
              .reverse()}
          </ol>
          <button onClick={download}>결과 JSON 내려받기</button>
        </section>
      )}
    </main>
  );
}
