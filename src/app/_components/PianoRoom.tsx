'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pianoSounds, type Sound } from '@/constant/sound';
import useAudioEngine from '@/hooks/useAudioEngine';
import usePadInput from '@/hooks/usePadInput';
import usePianoGame from '@/hooks/usePianoGame';
import { melody, songSamples } from '@/lib/ode-to-joy';
import { showTextStore } from '@/store/store';
import type { MeasuredRound } from '@/lib/piano-timing';
import PadBoard from './PadBoard';
import PerformanceSettings from './PerformanceSettings';
import '../piano.css';

export default function PianoRoom({
  onMeasuredRound,
}: {
  onMeasuredRound?: (round: MeasuredRound) => void;
}) {
  const [mode, setMode] = useState<'free' | 'game'>(
    onMeasuredRound ? 'game' : 'free',
  );
  const gameMode = mode === 'game';
  const {
    engine,
    ready,
    available,
    failed,
    playbackError,
    error,
    setError,
    retry,
  } = useAudioEngine(pianoSounds);
  const pianoPlayable = !playbackError && available.size > 0;
  const songReady =
    !playbackError && songSamples.every(url => available.has(url));
  const songLoadFailed = songSamples.some(url => failed.has(url));
  const game = usePianoGame(engine, setError);
  const { showPitch, showKeyboard, volume } = showTextStore();
  const play = (sound: Sound) => {
    game.press(sound.url);
    void engine.current
      ?.trigger(sound.url)
      .catch(() => setError('소리를 재생하지 못했어요. 다시 시도해 주세요.'));
  };
  const input = usePadInput(pianoSounds, pianoPlayable, play, available);

  useEffect(() => {
    engine.current?.setVolume(volume);
  }, [engine, volume]);
  useEffect(() => {
    function openSharedLoop() {
      if (window.location.hash.startsWith('#loop=')) {
        window.location.replace(
          '/studio' + window.location.search + window.location.hash,
        );
      }
    }
    openSharedLoop();
    window.addEventListener('hashchange', openSharedLoop);
    return () => window.removeEventListener('hashchange', openSharedLoop);
  }, []);
  const view = game.view;
  const running = game.starting || (!!view && !view.done);
  const cue = view?.cue;
  const heldNotes = pianoSounds.filter(sound => input.active.has(sound.url));
  const chord = heldNotes.map(sound => sound.name).join(' · ');
  return (
    <div className="piano-page">
      <main className="piano-room">
        <header className="studio-heading">
          <h1>
            launchpad<span>.</span>
          </h1>
          <Link href="/studio" className="studio-signature">
            기존 루프 열기
          </Link>
        </header>
        <div className="piano-toolbar">
          <div className="instrument-tabs" role="group" aria-label="연주 모드">
            {(['free', 'game'] as const).map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                className={
                  'instrument-tab' + (mode === value ? ' selected' : '')
                }
                onClick={() => {
                  if (mode === value) return;
                  game.cancel();
                  input.releaseAll();
                  setMode(value);
                }}
              >
                {value === 'free' ? '자유 연주' : '노트 게임'}
              </button>
            ))}
          </div>
          <span role="status" className="audio-status">
            <span className={'status-light' + (ready ? ' ready' : '')} />
            {playbackError
              ? '오디오 오류'
              : failed.size
                ? `피아노 ${available.size} / ${pianoSounds.length}개 준비됨`
                : ready
                  ? '피아노 준비됨'
                  : '소리 불러오는 중'}
          </span>
        </div>
        {error && (
          <p role="alert">
            {error}{' '}
            <button className="text-button" onClick={retry}>
              다시 시도
            </button>
          </p>
        )}
        <div className="piano-readout">
          {gameMode ? (
            <section className="song-panel" aria-labelledby="song-title">
              <div className="song-heading">
                <div>
                  <h2 id="song-title">환희의 송가</h2>
                  <p className="song-meta">베토벤 · 4마디 · 100 BPM</p>
                </div>
                <button
                  type="button"
                  className="transport-button song-action"
                  disabled={!running && !songReady}
                  onClick={() => {
                    input.releaseAll();
                    if (running) game.cancel();
                    else void game.start(onMeasuredRound);
                  }}
                >
                  {running
                    ? '중지'
                    : game.interrupted
                      ? '처음부터 다시 연주'
                      : view?.done
                        ? '다시 연주'
                        : '게임 시작'}
                </button>
              </div>
              <p className="song-status" role="status">
                {view?.done
                  ? `연주 완료 · ${view.hits} / ${melody.length}개 성공 · 정확 ${view.perfect}개 · 빗나간 입력 ${view.wrong}회`
                  : game.interrupted
                    ? '다른 화면으로 이동해 연주가 중단됐어요.'
                    : game.starting
                      ? '소리 준비 중'
                      : view?.count
                        ? `준비 · ${Math.min(4, view.count)}`
                        : view
                          ? `${view.bar} / 4마디 · ${view.hits} / ${melody.length}개 성공`
                          : songLoadFailed
                            ? '이 곡에 필요한 음원을 다시 불러와 주세요.'
                            : '테두리가 건반 가장자리에 닿을 때 눌러 주세요.'}
              </p>
              {view && !view.done && (
                <div className="song-hint">
                  <span>
                    {cue
                      ? `다음 음 · ${cue.name} (${cue.keyCode[0].toUpperCase()})`
                      : '\u00a0'}
                  </span>
                  <span>{view.feedback}</span>
                </div>
              )}
            </section>
          ) : (
            <section className="free-panel" aria-label="자유 연주 상태">
              <div className="song-heading">
                <h2>{chord || '피아노'}</h2>
                <span className="note-range">C3 — B5</span>
              </div>
              <p className="song-status">
                패드를 터치하거나 표시된 키를 눌러 연주하세요.
              </p>
            </section>
          )}
        </div>
        <PadBoard
          instrument="Piano"
          matrix
          ready={pianoPlayable}
          available={available}
          active={input.active}
          cue={cue && view ? { url: cue.url, progress: view.progress } : null}
          showPitch={showPitch}
          showKeyboard={showKeyboard}
          press={input.press}
          release={input.release}
        />
        <PerformanceSettings />
      </main>
    </div>
  );
}
