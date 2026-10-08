import { drumSounds, pianoSounds, type Instrument } from '../constant/sound';
import {
  LOOP_BARS,
  LOOP_BEATS,
  MIN_BPM,
  MAX_BPM,
  type NoteEvent,
} from './timeline';

export const MAX_EVENTS = 4096;
export interface ProjectContent {
  name: string;
  instrument: Instrument;
  bpm: number;
  quantize: boolean;
  metronome: boolean;
  events: NoteEvent[];
}
export interface Project extends ProjectContent {
  version: 1;
  id: string;
  bars: 4;
  createdAt: number;
  updatedAt: number;
}

export function contentFingerprint(content: ProjectContent) {
  return JSON.stringify({
    name: content.name.trim() || '이름 없는 루프',
    instrument: content.instrument,
    bpm: content.bpm,
    quantize: content.quantize,
    metronome: content.metronome,
    events: content.events,
  });
}

export function parseProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.version !== 1 || item.bars !== LOOP_BARS) return null;
  if (typeof item.id !== 'string' || !/^[\w-]{1,80}$/.test(item.id))
    return null;
  if (
    typeof item.name !== 'string' ||
    !item.name.trim() ||
    item.name.length > 60
  )
    return null;
  if (item.instrument !== 'Piano' && item.instrument !== 'Drum') return null;
  if (
    typeof item.bpm !== 'number' ||
    !Number.isInteger(item.bpm) ||
    item.bpm < MIN_BPM ||
    item.bpm > MAX_BPM
  )
    return null;
  if (typeof item.quantize !== 'boolean' || typeof item.metronome !== 'boolean')
    return null;
  if (
    typeof item.createdAt !== 'number' ||
    !Number.isFinite(item.createdAt) ||
    item.createdAt <= 0
  )
    return null;
  if (
    typeof item.updatedAt !== 'number' ||
    !Number.isFinite(item.updatedAt) ||
    item.updatedAt < item.createdAt ||
    item.updatedAt > 8.64e15
  )
    return null;
  if (!Array.isArray(item.events) || item.events.length > MAX_EVENTS)
    return null;
  const allowed = new Set(
    (item.instrument === 'Piano' ? pianoSounds : drumSounds).map(
      sound => sound.url,
    ),
  );
  const events: NoteEvent[] = [];
  for (const value of item.events) {
    if (!value || typeof value !== 'object') return null;
    const event = value as Record<string, unknown>;
    if (typeof event.padId !== 'string' || !allowed.has(event.padId))
      return null;
    if (
      typeof event.beat !== 'number' ||
      !Number.isFinite(event.beat) ||
      event.beat < 0 ||
      event.beat >= LOOP_BEATS
    )
      return null;
    events.push({ padId: event.padId, beat: event.beat });
  }
  return {
    version: 1,
    id: item.id,
    bars: 4,
    name: item.name.trim(),
    instrument: item.instrument,
    bpm: item.bpm,
    quantize: item.quantize,
    metronome: item.metronome,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    events: events.sort((a, b) => a.beat - b.beat),
  };
}
