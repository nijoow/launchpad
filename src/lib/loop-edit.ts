import {
  LOOP_STEPS,
  MAX_EVENTS,
  STEPS_PER_BEAT,
  type NoteEvent,
} from './timeline';

/** Editing a step removes all unquantized hits in that sixteenth-note cell. */
export function toggleStep(events: NoteEvent[], padId: string, step: number) {
  if (!Number.isInteger(step) || step < 0 || step >= LOOP_STEPS) return events;
  const matches = (event: NoteEvent) =>
    event.padId === padId && Math.floor(event.beat * STEPS_PER_BEAT) === step;
  if (events.some(matches)) return events.filter(event => !matches(event));
  if (events.length >= MAX_EVENTS)
    throw new Error(`음은 최대 ${MAX_EVENTS}개까지 넣을 수 있어요.`);
  return [...events, { padId, beat: step / STEPS_PER_BEAT }].sort(
    (a, b) => a.beat - b.beat,
  );
}
