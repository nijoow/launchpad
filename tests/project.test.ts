import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  contentFingerprint,
  parseProject,
  type Project,
} from '../src/lib/project';

export const project: Project = {
  version: 1,
  bars: 4,
  id: 'test-loop',
  name: '첫 비트',
  instrument: 'Drum',
  bpm: 120,
  quantize: true,
  metronome: false,
  createdAt: 100,
  updatedAt: 200,
  events: [
    { padId: '/audio/drum/Kick1.wav', beat: 0 },
    { padId: '/audio/drum/Snare1.wav', beat: 4 },
  ],
};

test('stored projects reject incompatible versions, foreign samples, and out-of-range timing', () => {
  assert.ok(parseProject(project));
  for (const invalid of [
    { ...project, version: 2 },
    { ...project, bpm: 0 },
    { ...project, bpm: 120.5 },
    { ...project, name: ' ' },
    { ...project, updatedAt: 1e300 },
    { ...project, events: [{ padId: '/audio/piano/piano48.wav', beat: 0 }] },
    { ...project, events: [{ padId: '/audio/drum/Kick1.wav', beat: 16 }] },
    { ...project, events: [{ padId: '/audio/drum/Kick1.wav', beat: NaN }] },
  ])
    assert.equal(parseProject(invalid), null);
});

test('unsaved-change detection ignores storage identity and timestamps but tracks musical changes', () => {
  const saved = contentFingerprint(project);
  const copy = { ...project, id: 'copy', updatedAt: 300, name: ' 첫 비트 ' };
  assert.equal(contentFingerprint(copy), saved);
  assert.notEqual(contentFingerprint({ ...project, bpm: 130 }), saved);
  assert.notEqual(contentFingerprint({ ...project, events: [] }), saved);
});
