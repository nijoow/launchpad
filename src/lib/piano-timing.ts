import { BEAT_SECONDS, melody } from './ode-to-joy';

export type TimedPress = { pad: string; ms: number };
export type MeasuredRound = {
  taps: TimedPress[];
  hits: number;
  perfect: number;
  wrong: number;
};

export const targets = melody.map(note => ({
  pad: note.sound.url,
  ms: Math.round(note.beat * BEAT_SECONDS * 1000),
}));

export function analyzeTaps(taps: TimedPress[]) {
  // A missing or extra repeated pitch makes positional matching ambiguous.
  if (
    taps.length !== targets.length ||
    taps.some((tap, i) => tap.pad !== targets[i].pad)
  )
    return null;
  const offsetsMs = taps.map((tap, i) => tap.ms - targets[i].ms);
  const sorted = offsetsMs.slice().sort((a, b) => a - b);
  const percentile = (p: number) => {
    const i = (sorted.length - 1) * p;
    const low = Math.floor(i);
    return sorted[low] + (sorted[Math.ceil(i)] - sorted[low]) * (i - low);
  };
  return {
    offsetsMs,
    p25: percentile(0.25),
    median: percentile(0.5),
    p75: percentile(0.75),
  };
}
