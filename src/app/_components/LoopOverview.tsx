import { useMemo, type CSSProperties } from 'react';
import { soundsByInstrument, type Instrument } from '@/constant/sound';
import { LOOP_BEATS, type NoteEvent } from '@/lib/timeline';

const instrumentPadIds = {
  Drum: new Set(soundsByInstrument.Drum.map(sound => sound.url)),
  Piano: new Set(soundsByInstrument.Piano.map(sound => sound.url)),
};

/** Read-only session map. Editing stays in the existing 16th-note editor. */
export default function LoopOverview({
  events,
  beat,
  running,
  instrument,
}: {
  events: NoteEvent[];
  beat: number;
  running: boolean;
  instrument: Instrument;
}) {
  const layers = useMemo(
    () =>
      (['Drum', 'Piano'] as const).map(mode => {
        const counts = Array<number>(LOOP_BEATS).fill(0);
        let total = 0;
        for (const event of events) {
          if (instrumentPadIds[mode].has(event.padId)) {
            counts[Math.floor(event.beat)] += 1;
            total += 1;
          }
        }
        return { mode, counts, total };
      }),
    [events],
  );
  return (
    <section className="loop-overview" aria-label="레이어 구성">
      <div className="overview-ruler" aria-hidden="true">
        <span />
        {[1, 2, 3, 4].map(bar => (
          <span key={bar}>{String(bar).padStart(2, '0')}</span>
        ))}
      </div>
      {layers.map(({ mode, counts, total }) => {
        return (
          <div
            className={`overview-layer ${instrument === mode ? 'is-selected' : ''}`}
            key={mode}
          >
            <div className="overview-label">
              <span>{mode}</span>
              <span>{total} notes</span>
            </div>
            <div
              className="overview-track"
              aria-label={`${mode} 레이어 ${total}개 음`}
            >
              {Array.from({ length: LOOP_BEATS }, (_, index) => {
                const count = counts[index];
                return (
                  <span
                    key={index}
                    className={`overview-cell ${count ? 'has-notes' : ''} ${running && Math.floor(beat) === index ? 'at-playhead' : ''}`}
                    style={
                      {
                        '--note-level': Math.min(count, 4),
                      } as CSSProperties
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="overview-legend">
        <span className="legend-dot" />
        선택한 악기에 녹음돼요
      </div>
    </section>
  );
}
