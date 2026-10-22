import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HeldInputs } from '../src/lib/held-inputs';

test('two fingers on one pad remain active until both release; repeat presses do not retrigger', () => {
  const inputs = new HeldInputs();
  assert.equal(inputs.press('pointer:1', 'kick'), true);
  assert.equal(inputs.press('pointer:1', 'kick'), false);
  assert.equal(inputs.press('pointer:2', 'kick'), true);
  inputs.release('pointer:1');
  assert.deepEqual(Array.from(inputs.active()), ['kick']);
  inputs.release('pointer:2');
  assert.equal(inputs.active().size, 0);
});
test('simultaneous finger and keyboard sources are independent; cancel/blur clear held state', () => {
  const inputs = new HeldInputs();
  inputs.press('pointer:1', 'kick');
  inputs.press('key:Digit8', 'hat');
  assert.equal(inputs.active().size, 2);
  inputs.release('pointer:1');
  assert.deepEqual(Array.from(inputs.active()), ['hat']);
  inputs.clear();
  assert.equal(inputs.active().size, 0);
  assert.equal(inputs.press('key:Digit8', 'hat'), true);
});
