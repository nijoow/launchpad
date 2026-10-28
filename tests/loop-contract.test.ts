import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toggleStep } from '../src/lib/loop-edit';
import { idleSnapshot, LoopTransport } from '../src/lib/loop-transport';
import { parseProject } from '../src/lib/project';
import { decodeShare, encodeShare } from '../src/lib/share';
import { occurrences, recordedBeat } from '../src/lib/timeline';
import { project } from './fixtures';

test('existing share indices retain Drum/Piano order and exact unquantized timing', () => {
  const wire = '[1,120,[[0,0],[8,3.75],[9,4],[44,15.875]]]';
  const legacy = '#loop=' + btoa(wire).replace(/=+$/, '');
  const events = [
    { padId: '/audio/drum/Kick1.wav', beat: 0 },
    { padId: '/audio/drum/Snare4.wav', beat: 3.75 },
    { padId: '/audio/piano/piano48.wav', beat: 4 },
    { padId: '/audio/piano/piano83.wav', beat: 15.875 },
  ];
  const restored = decodeShare(legacy);
  assert.ok(restored);
  assert.deepEqual(restored.events, events);
  assert.equal(encodeShare({ ...project, events }), legacy);
  assert.ok(parseProject({ ...project, version: 2, events }));
  assert.equal(parseProject({ ...project, version: 1, events }), null);
});

test('the last editor cell, quantized recording and loop schedule agree at all supported tempos', () => {
  const padId = '/audio/drum/Kick1.wav';
  const events = toggleStep([], padId, 63);
  assert.deepEqual(events, [{ padId, beat: 15.75 }]);
  assert.deepEqual(toggleStep(events, padId, 64), events);
  assert.deepEqual(toggleStep(events, padId, -1), events);
  for (const bpm of [60, 120, 180]) {
    const duration = (16 * 60) / bpm;
    assert.equal(recordedBeat(duration - 0.000001, 0, bpm, true), 15.75);
    assert.equal(recordedBeat(duration, 0, bpm, true), null);
    assert.ok(parseProject({ ...project, bpm, events }));
    assert.deepEqual(occurrences(events, 0, bpm, 0, duration), [
      { padId, time: (15.75 * 60) / bpm },
    ]);
  }
});

test('4096 notes is one shared limit for storage, editing and layered recording', async t => {
  const kick = '/audio/drum/Kick1.wav';
  const piano = '/audio/piano/piano48.wav';
  const events = Array.from({ length: 4096 }, () => ({ padId: kick, beat: 0 }));
  assert.ok(parseProject({ ...project, events }));
  assert.equal(
    parseProject({ ...project, events: [...events, events[0]] }),
    null,
  );
  assert.throws(() => toggleStep(events, piano, 63), /4096/);
  assert.deepEqual(toggleStep(events, kick, 0), []);
  assert.equal(toggleStep(events.slice(1), piano, 63).length, 4096);

  let state = idleSnapshot();
  const audio = {
    currentTime: 0,
    resume: async () => {},
    playSample: () => true,
    playClick: () => {},
    stopAll: () => {},
  };
  const transport = new LoopTransport(audio, next => {
    state = next;
  });
  t.after(() => transport.dispose());
  transport.replaceEvents(events);
  await transport.startRecording({
    bpm: 120,
    quantize: true,
    metronome: false,
    recordPadIds: [piano],
  });
  audio.currentTime = 2.1;
  transport.tick();
  transport.capture(piano);
  assert.equal(state.events.length, 4096);
  assert.ok(state.events.every(event => event.padId === kick));
});
