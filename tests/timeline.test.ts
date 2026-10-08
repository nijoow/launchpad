import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampBpm, recordedBeat, occurrences } from '../src/lib/timeline';

test('recording ignores the count-in and loop end; quantization keeps the last hit in the last step', () => {
  assert.equal(recordedBeat(9.9, 10, 120, true), null);
  assert.equal(recordedBeat(18, 10, 120, true), null);
  assert.equal(recordedBeat(10.13, 10, 120, true), 0.25);
  assert.equal(recordedBeat(17.999, 10, 120, true), 15.75);
  assert.ok(Math.abs(recordedBeat(10.13, 10, 120, false)! - 0.26) < 0.000001);
  assert.equal(clampBpm(NaN), 120);
});

test('adjacent scheduling windows preserve chord hits and do not duplicate loop boundaries', () => {
  const events = [
    { padId: 'kick', beat: 0 },
    { padId: 'hat', beat: 0 },
    { padId: 'snare', beat: 4 },
  ];
  const scheduled = [
    ...occurrences(events, 10, 120, 10, 18),
    ...occurrences(events, 10, 120, 18, 26),
    ...occurrences(events, 10, 120, 26, 34),
  ];
  assert.deepEqual(
    scheduled.map(event => event.time),
    [10, 10, 12, 18, 18, 20, 26, 26, 28],
  );
  assert.equal(occurrences(events, 10, 120, 11, 11.1).length, 0);
});

test('a delayed timer skips old loop hits and schedules the next occurrence at the original tempo', () => {
  const scheduled = occurrences(
    [{ padId: 'kick', beat: 0 }],
    10,
    120,
    35,
    42.1,
  );
  assert.deepEqual(scheduled, [{ padId: 'kick', time: 42 }]);
});
