export const BEATS_PER_BAR = 4;
export const LOOP_BARS = 4;
export const LOOP_BEATS = BEATS_PER_BAR * LOOP_BARS;
export const MIN_BPM = 60;
export const MAX_BPM = 180;

export interface NoteEvent {
  padId: string;
  beat: number;
}

export function clampBpm(bpm: number) {
  return Number.isFinite(bpm)
    ? Math.round(Math.max(MIN_BPM, Math.min(MAX_BPM, bpm)))
    : 120;
}

export function recordedBeat(
  time: number,
  start: number,
  bpm: number,
  quantize: boolean,
) {
  const beat = ((time - start) * clampBpm(bpm)) / 60;
  if (beat < 0 || beat >= LOOP_BEATS) return null;
  // The final hit belongs to the final step, never to the beginning of this take.
  return quantize
    ? Math.min(LOOP_BEATS - 0.25, Math.round(beat * 4) / 4)
    : beat;
}

/** Inclusive start/exclusive end ensures successive windows never double schedule. */
export function occurrences(
  events: NoteEvent[],
  loopStart: number,
  bpm: number,
  from: number,
  to: number,
) {
  const beatSeconds = 60 / clampBpm(bpm);
  const duration = LOOP_BEATS * beatSeconds;
  const result: { padId: string; time: number }[] = [];
  events.forEach(event => {
    const first = loopStart + event.beat * beatSeconds;
    const cycle = Math.max(0, Math.ceil((from - first) / duration));
    for (let time = first + cycle * duration; time < to; time += duration) {
      if (time >= from) result.push({ padId: event.padId, time });
    }
  });
  return result.sort((a, b) => a.time - b.time);
}
