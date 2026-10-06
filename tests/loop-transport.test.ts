import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LoopTransport, idleSnapshot } from '../src/lib/loop-transport';

function fixture() {
  const played: { url: string; time: number }[] = [];
  const clicks: number[] = [];
  const audio = {
    currentTime: 0,
    resume: async () => {},
    playSample: (url: string, time = 0) => {
      played.push({ url, time });
      return true;
    },
    playClick: (time: number) => {
      clicks.push(time);
    },
    stopAll() {},
  };
  let state = idleSnapshot();
  const transport = new LoopTransport(audio, next => {
    state = next;
  });
  return { audio, played, clicks, transport, state: () => state };
}

const options = { bpm: 120, metronome: false, quantize: true };

test('a one-bar count-in leads into four-bar recording and automatic loop playback', async t => {
  const f = fixture();
  t.after(() => f.transport.dispose());
  await f.transport.startRecording(options);
  assert.equal(f.state().status, 'countin');
  f.audio.currentTime = 1;
  f.transport.capture('too-early');
  assert.equal(f.state().events.length, 0);
  f.audio.currentTime = 2.1;
  f.transport.tick();
  assert.equal(f.state().status, 'recording');
  f.transport.capture('kick');
  f.transport.capture('hat');
  f.transport.capture('kick');
  assert.equal(f.state().events.length, 2);
  f.audio.currentTime = 10;
  f.transport.tick();
  assert.equal(f.played.length, 2);
  assert.ok(f.played.every(event => Math.abs(event.time - 10.05) < 0.000001));
  f.audio.currentTime = 10.06;
  f.transport.tick();
  assert.equal(f.state().status, 'playing');
  assert.equal(f.played.length, 2);
});

test('empty recording returns to idle with guidance', async t => {
  const f = fixture();
  t.after(() => f.transport.dispose());
  await f.transport.startRecording(options);
  f.audio.currentTime = 10.1;
  f.transport.tick();
  assert.equal(f.state().status, 'idle');
  assert.match(f.state().notice, /녹음된 음이 없어요/);
});

test('stopping during pending audio resume cancels the start', async t => {
  const f = fixture();
  t.after(() => f.transport.dispose());
  let resume!: () => void;
  f.audio.resume = () =>
    new Promise<void>(resolve => {
      resume = resolve;
    });
  const start = f.transport.startRecording(options);
  assert.equal(f.state().status, 'starting');
  f.transport.stop();
  resume();
  await start;
  assert.equal(f.state().status, 'idle');
  assert.equal(f.played.length, 0);
});
