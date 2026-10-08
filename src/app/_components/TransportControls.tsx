import type { TransportSnapshot } from '@/lib/loop-transport';
import {
  BEATS_PER_BAR,
  LOOP_BEATS,
  MAX_BPM,
  MIN_BPM,
  clampBpm,
} from '@/lib/timeline';
import { cn } from '@/utils/cn';
import { useEffect, useState } from 'react';

interface Props {
  state: TransportSnapshot;
  ready: boolean;
  error: string;
  bpm: number;
  setBpm: (value: number) => void;
  metronome: boolean;
  setMetronome: (value: boolean) => void;
  quantize: boolean;
  setQuantize: (value: boolean) => void;
  record: () => void;
  play: () => void;
  stop: () => void;
}

export default function TransportControls({
  state,
  ready,
  error,
  bpm,
  setBpm,
  metronome,
  setMetronome,
  quantize,
  setQuantize,
  record,
  play,
  stop,
}: Props) {
  const [bpmText, setBpmText] = useState(String(bpm));
  useEffect(() => {
    setBpmText(String(bpm));
  }, [bpm]);
  const running = state.status !== 'idle';
  const status =
    state.status === 'starting'
      ? '소리 시작 중…'
      : state.status === 'countin'
        ? `카운트인 ${state.countIn}`
        : state.status === 'recording'
          ? '녹음 중'
          : state.status === 'playing'
            ? '반복 재생 중'
            : '연주 대기';
  return (
    <section aria-label="녹음과 재생" className="transport">
      <div className="transport-readout">
        <div className="transport-status">
          <span
            className={cn(
              'status-light',
              state.status === 'recording' ? 'recording' : running && 'ready',
            )}
          />
          <span
            role="status"
            aria-live="polite"
            data-transport-status={state.status}
          >
            {status}
          </span>
          <span className="note-count">{state.events.length}개 음</span>
        </div>
        <span className="transport-position">
          {Math.floor(state.beat / BEATS_PER_BAR) + 1} / 4 마디 ·{' '}
          {Math.floor(state.beat % BEATS_PER_BAR) + 1}박
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="루프 진행"
        aria-valuemin={0}
        aria-valuemax={LOOP_BEATS}
        aria-valuenow={Number(state.beat.toFixed(2))}
        className="beat-track"
        style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
      >
        {Array.from({ length: LOOP_BEATS }, (_, beat) => (
          <div
            key={beat}
            className={cn(
              'beat-step',
              beat % 4 === 0 && 'bar-start',
              running && Math.floor(state.beat) === beat ? 'beat-current' : '',
            )}
          />
        ))}
      </div>
      <div className="transport-controls">
        <div className="transport-buttons">
          <button
            type="button"
            onClick={record}
            disabled={!ready || running}
            className="transport-button record-button"
          >
            <span aria-hidden="true">●</span>
            {state.events.length ? '다시 녹음' : '녹음'}
          </button>
          <button
            type="button"
            onClick={play}
            disabled={!ready || running || !state.events.length}
            className="transport-button"
          >
            <span aria-hidden="true">▶ </span>재생
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={!running}
            className="transport-button"
          >
            <span aria-hidden="true">■ </span>정지
          </button>
        </div>
        <div className="transport-settings">
          <label className="setting-label">
            BPM
            <input
              aria-label="BPM"
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpmText}
              disabled={running}
              onChange={event => {
                setBpmText(event.target.value);
                const value = Number(event.target.value);
                if (value >= MIN_BPM && value <= MAX_BPM)
                  setBpm(clampBpm(value));
              }}
              onBlur={() => {
                const value = bpmText.trim() ? clampBpm(Number(bpmText)) : bpm;
                setBpm(value);
                setBpmText(String(value));
              }}
              className="tempo-input"
            />
          </label>
          <label className="setting-label">
            <input
              type="checkbox"
              checked={metronome}
              disabled={running}
              onChange={event => setMetronome(event.target.checked)}
              className="setting-checkbox"
            />
            <span title="녹음과 재생 중에 박자를 들려줘요">메트로놈</span>
          </label>
          <label className="setting-label">
            <input
              type="checkbox"
              checked={quantize}
              disabled={running}
              onChange={event => setQuantize(event.target.checked)}
              className="setting-checkbox"
            />
            박자 보정
          </label>
        </div>
      </div>
      <p role={error ? 'alert' : undefined} className="transport-notice">
        {error ||
          state.notice ||
          (state.status === 'countin'
            ? '네 박자를 센 뒤 녹음이 시작돼요.'
            : state.status === 'recording'
              ? '패드를 눌러 주세요. 4마디가 끝나면 반복 재생해요.'
              : '')}
      </p>
    </section>
  );
}
