import { useMemo, useState } from 'react';
import type { Instrument, Sound } from '@/constant/sound';
import type { NoteEvent } from '@/lib/timeline';
import { toggleStep } from '@/lib/loop-edit';

export default function LoopEditor({
  sounds,
  instrument,
  events,
  disabled,
  change,
}: {
  sounds: Sound[];
  instrument: Instrument;
  events: NoteEvent[];
  disabled: boolean;
  change: (events: NoteEvent[]) => void;
}) {
  const [pad, setPad] = useState(sounds[0].url);
  const selected = sounds.find(sound => sound.url === pad) ?? sounds[0];
  const activeSteps = useMemo(
    () =>
      new Set(
        events
          .filter(event => event.padId === selected.url)
          .map(event => Math.floor(event.beat * 4)),
      ),
    [events, selected.url],
  );
  return (
    <details className="loop-editor">
      <summary>루프 편집 · {instrument}</summary>
      <label>
        편집할 패드{' '}
        <select
          value={selected.url}
          disabled={disabled}
          onChange={e => setPad(e.target.value)}
        >
          {sounds.map(sound => (
            <option key={sound.url} value={sound.url}>
              {sound.name} · {sound.keyCode[0]}
            </option>
          ))}
        </select>
      </label>
      <p>한 칸은 16분음표예요. 눌러 추가하거나 지워요.</p>
      {[0, 1, 2, 3].map(bar => (
        <div className="editor-bar" key={bar}>
          <span>{bar + 1}마디</span>
          <div className="editor-steps">
            {Array.from({ length: 16 }, (_, index) => {
              const step = bar * 16 + index;
              const active = activeSteps.has(step);
              return (
                <button
                  type="button"
                  key={step}
                  aria-label={`${bar + 1}마디 ${index + 1}칸`}
                  aria-pressed={active}
                  disabled={disabled || (!active && events.length >= 4096)}
                  onClick={() => change(toggleStep(events, selected.url, step))}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </details>
  );
}
