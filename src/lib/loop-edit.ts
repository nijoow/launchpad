import type { NoteEvent } from './timeline';
import { MAX_EVENTS } from './project';

/** Editing a step removes all unquantized hits in that sixteenth-note cell. */
export function toggleStep(events: NoteEvent[], padId: string, step: number) {
  if (!Number.isInteger(step) || step < 0 || step >= 64) return events;
  const matches = (event: NoteEvent) =>
    event.padId === padId && Math.floor(event.beat * 4) === step;
  if (events.some(matches)) return events.filter(event => !matches(event));
  if (events.length >= MAX_EVENTS)
    throw new Error('음은 최대 4096개까지 넣을 수 있어요.');
  return [...events, { padId, beat: step / 4 }].sort((a, b) => a.beat - b.beat);
}
