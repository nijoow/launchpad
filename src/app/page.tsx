'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pianoSounds, type Sound } from '@/constant/sound';
import useAudioEngine from '@/hooks/useAudioEngine';
import usePadInput from '@/hooks/usePadInput';
import usePianoGame from '@/hooks/usePianoGame';
import { gameSounds, GAME_OCTAVE, melody } from '@/lib/ode-to-joy';
import { showTextStore } from '@/store/store';
import PadBoard from './_components/PadBoard';
import PerformanceSettings from './_components/PerformanceSettings';
import './piano.css';

export default function Home() {
  const [mode, setMode] = useState<'free' | 'game'>('free');
  const gameMode = mode === 'game';
  const { engine, ready, error, setError, retry } = useAudioEngine(pianoSounds);
  const game = usePianoGame(engine, setError);
  const { showPitch, showKeyboard, volume } = showTextStore();
  const play = (sound: Sound) => {
    game.press(sound.url);
    void engine.current
      ?.trigger(sound.url)
      .catch(() => setError('소리를 재생하지 못했어요. 다시 시도해 주세요.'));
  };
  const input = usePadInput(gameMode ? gameSounds : pianoSounds, ready, play);

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
  return (
    <main className="studio piano-room">
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
              className={'instrument-tab' + (mode === value ? ' selected' : '')}
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
          {error ? '오디오 오류' : ready ? '피아노 준비됨' : '소리 불러오는 중'}
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
      {gameMode && (
        <section className="song-panel" aria-labelledby="song-title">
          <div className="song-heading">
            <div>
              <h2 id="song-title">환희의 송가</h2>
              <p className="song-meta">베토벤 · 4마디 · 100 BPM</p>
            </div>
            <button
              type="button"
              className="transport-button song-action"
              disabled={!ready}
              onClick={() => {
                input.releaseAll();
                if (running) game.cancel();
                else void game.start();
              }}
            >
              {running ? '중지' : view?.done ? '다시 연주' : '게임 시작'}
            </button>
          </div>
          <p className="song-status" role="status">
            {view?.done
              ? `연주 완료 · ${view.hits} / ${melody.length}개 성공 · 정확 ${view.perfect}개 · 빗나간 입력 ${view.wrong}회`
              : game.starting
                ? '소리 준비 중'
                : view?.count
                  ? `준비 · ${Math.min(4, view.count)}`
                  : view
                    ? `${view.bar} / 4마디 · ${view.hits} / ${melody.length}개 성공`
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
      )}
      <PadBoard
        instrument="Piano"
        octave={gameMode ? GAME_OCTAVE : undefined}
        ready={ready}
        active={input.active}
        cue={cue && view ? { url: cue.url, progress: view.progress } : null}
        showPitch={showPitch}
        showKeyboard={showKeyboard}
        press={input.press}
        release={input.release}
      />
      <PerformanceSettings />
    </main>
  );
}
