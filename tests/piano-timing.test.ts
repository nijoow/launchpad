import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeTaps, targets } from '../src/lib/piano-timing';

test('keeps signed out-of-window presses, repeated notes, and the middle half of the distribution', () => {
  const offsets = targets.map((_, i) => (7 - i) * 30);
  const taps = targets.map((target, i) => ({
    ...target,
    ms: target.ms + offsets[i],
  }));
  assert.deepEqual(analyzeTaps(taps), {
    offsetsMs: offsets,
    median: 0,
    p25: -105,
    p75: 105,
  });
});

test('skipped, extra, and wrong pitches do not generate misleading offsets', () => {
  assert.equal(analyzeTaps(targets.slice(1)), null);
  assert.equal(analyzeTaps([...targets, targets[0]]), null);
  assert.equal(
    analyzeTaps([{ ...targets[0], pad: 'other' }, ...targets.slice(1)]),
    null,
  );
});
