import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseProject } from '../src/lib/project';
import { decodeShare, encodeShare, MAX_SHARE_LENGTH } from '../src/lib/share';
import { toggleStep } from '../src/lib/loop-edit';
import { encodeWav, loopChannels } from '../src/lib/wav';
import { project } from './fixtures';

const layered = {
  ...project,
  version: 2 as const,
  events: [
    ...project.events,
    { padId: '/audio/piano/piano60.wav', beat: 1.125 },
  ].sort((a, b) => a.beat - b.beat),
};
test('v1 keeps strict instrument validation; v2 restores both layers without losing timing', () => {
  assert.deepEqual(parseProject(layered), layered);
  assert.equal(parseProject({ ...layered, version: 1 }), null);
  assert.equal(
    parseProject({
      ...layered,
      events: [{ padId: 'https://other.example/audio.wav', beat: 0 }],
    }),
    null,
  );
});
test('editing adds/removes a sixteenth cell and preserves other instruments and cells', () => {
  const edited = toggleStep(layered.events, '/audio/piano/piano60.wav', 4);
  assert.deepEqual(edited, project.events);
  const added = toggleStep(edited, '/audio/piano/piano60.wav', 63);
  assert.equal(added.at(-1)?.beat, 15.75);
  assert.deepEqual(
    layered.events.find(event => event.padId.includes('piano')),
    { padId: '/audio/piano/piano60.wav', beat: 1.125 },
  );
});
test('share round trip preserves exact music, omits personal metadata, rejects corrupt and oversized links', () => {
  const hash = encodeShare({ ...layered, name: 'private name' });
  const decoded = decodeShare(hash)!;
  assert.deepEqual(decoded.events, layered.events);
  assert.equal(decoded.bpm, layered.bpm);
  assert.equal(decoded.name, '공유받은 루프');
  assert.equal(decoded.id, 'shared-loop');
  for (const hash of [
    '#loop=??',
    '#loop=' + 'a'.repeat(MAX_SHARE_LENGTH),
    '#loop=' + btoa('[1,120,[[999,0]]]'),
    '#loop=' + btoa('[1,120,[[0,16]]]'),
  ])
    assert.equal(decodeShare(hash), null);
  assert.throws(() =>
    encodeShare({
      ...layered,
      events: Array.from({ length: 4096 }, (_, i) => ({
        padId: '/audio/drum/Kick1.wav',
        beat: i / 256,
      })),
    }),
  );
});
test('WAV has valid stereo PCM headers and signed interleaved samples', () => {
  const bytes = encodeWav(
    [new Float32Array([-1, 0, 1]), new Float32Array([1, 0, -1])],
    44100,
  );
  const view = new DataView(bytes);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(view.getUint32(4, true), bytes.byteLength - 8);
  assert.equal(view.getUint16(22, true), 2);
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(40, true), 12);
  assert.equal(view.getInt16(44, true), -32768);
  assert.equal(view.getInt16(46, true), 32767);
});
test('export folds release tails into the beginning and prevents clipping across channels', () => {
  const [left, right] = loopChannels(
    [new Float32Array([1, 0, 1, 0]), new Float32Array([0, 0.5, 0, 0.5])],
    2,
  );
  assert.deepEqual(Array.from(left), [1, 0]);
  assert.deepEqual(Array.from(right), [0, 0.5]);
});
