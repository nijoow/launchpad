import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AudioEngine } from '../src/lib/audio-engine';

function fixture() {
  const sources: {
    start: number | null;
    stopped: boolean;
    disconnected: boolean;
  }[] = [];
  let fetches = 0;
  let contexts = 0;
  let closed = false;
  const context = {
    state: 'suspended',
    currentTime: 5,
    destination: {},
    createGain: () => ({
      gain: { value: 0, setValueAtTime() {} },
      connect() {},
      disconnect() {},
    }),
    decodeAudioData: async () => ({}),
    resume: async () => {
      context.state = 'running';
    },
    close: async () => {
      closed = true;
      context.state = 'closed';
    },
    createBufferSource() {
      const state = {
        start: null as number | null,
        stopped: false,
        disconnected: false,
      };
      sources.push(state);
      return {
        connect() {},
        disconnect() {
          state.disconnected = true;
        },
        start(time: number) {
          state.start = time;
        },
        stop() {
          state.stopped = true;
        },
      };
    },
  };
  const engine = new AudioEngine({
    createContext: () => {
      contexts += 1;
      return context as unknown as AudioContext;
    },
    fetchSample: async () => {
      fetches += 1;
      return new ArrayBuffer(8);
    },
  });
  return {
    engine,
    context,
    sources,
    stats: () => ({ fetches, contexts, closed }),
  };
}

test('samples share one context and are cached across repeated mode switches', async () => {
  const { engine, stats } = fixture();
  await Promise.all([
    engine.loadSamples(['kick', 'snare']),
    engine.loadSamples(['kick']),
  ]);
  for (let i = 0; i < 20; i += 1) {
    await engine.loadSamples(['piano']);
    await engine.loadSamples(['kick', 'snare']);
  }
  assert.deepEqual(stats(), { fetches: 3, contexts: 1, closed: false });
  engine.dispose();
});

test('stop cancels future voices; disposal closes the context and prevents reuse', async () => {
  const { engine, sources, stats } = fixture();
  await engine.loadSamples(['kick']);
  await engine.resume();
  assert.equal(engine.playSample('kick', 12), true);
  assert.equal(sources[0].start, 12);
  engine.stopAll();
  assert.equal(sources[0].stopped, true);
  assert.equal(sources[0].disconnected, true);
  engine.dispose();
  assert.equal(stats().closed, true);
  assert.equal(engine.playSample('kick'), false);
  await assert.rejects(engine.resume());
});

test('a failed sample can be retried rather than remaining in the pending cache', async () => {
  let attempts = 0;
  const engine = new AudioEngine({
    createContext: () =>
      ({
        createGain: () => ({ gain: {}, connect() {}, disconnect() {} }),
        decodeAudioData: async () => ({}),
        state: 'closed',
      }) as unknown as AudioContext,
    fetchSample: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return new ArrayBuffer(8);
    },
  });
  await assert.rejects(engine.loadSamples(['kick']));
  await engine.loadSamples(['kick']);
  assert.equal(attempts, 2);
  assert.equal(engine.playSample('missing'), false);
  engine.dispose();
});

test('a pending first gesture cannot start a voice after stop or instrument change', async () => {
  const { engine, context, sources } = fixture();
  await engine.loadSamples(['kick']);
  let completeResume!: () => void;
  context.resume = () =>
    new Promise<void>(resolve => {
      completeResume = () => {
        context.state = 'running';
        resolve();
      };
    });
  const trigger = engine.trigger('kick');
  engine.stopAll();
  completeResume();
  assert.equal(await trigger, false);
  assert.equal(sources.length, 0);
  engine.dispose();
});
