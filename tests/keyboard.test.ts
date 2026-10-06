import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pianoSounds, drumSounds } from '../src/constant/sound';
import { matchSound } from '../src/lib/keyboard';

const key = {
  key: 'q',
  code: 'KeyQ',
  repeat: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
};

test('physical keys work with Korean input and shifted punctuation', () => {
  assert.equal(
    matchSound(pianoSounds, { ...key, key: 'ㅃ' })?.url,
    '/audio/piano/piano60.wav',
  );
  assert.equal(
    matchSound(pianoSounds, { ...key, key: '!', code: 'Digit1' })?.url,
    '/audio/piano/piano48.wav',
  );
  assert.equal(
    matchSound(pianoSounds, { ...key, key: 'ㅂ', code: '' })?.url,
    '/audio/piano/piano60.wav',
  );
});

test('repeat and modifier shortcuts do not trigger an instrument', () => {
  for (const flag of ['repeat', 'ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(matchSound(pianoSounds, { ...key, [flag]: true }), undefined);
  }
  assert.equal(matchSound(drumSounds, key), undefined);
});

test('all nine numpad drum keys work with Num Lock on or off', () => {
  const pads = [
    ['1', 'End', 'Snare2'],
    ['2', 'ArrowDown', 'Snare3'],
    ['3', 'PageDown', 'Snare4'],
    ['4', 'ArrowLeft', 'Hat2'],
    ['5', 'Clear', 'Hat3'],
    ['6', 'ArrowRight', 'Snare1'],
    ['7', 'Home', 'Kick1'],
    ['8', 'ArrowUp', 'Kick2'],
    ['9', 'PageUp', 'Hat1'],
  ];
  for (const [digit, navigation, sample] of pads) {
    for (const value of [digit, navigation]) {
      assert.equal(
        matchSound(drumSounds, {
          ...key,
          key: value,
          code: `Numpad${digit}`,
        })?.url,
        `/audio/drum/${sample}.wav`,
        `Numpad${digit} with key ${value}`,
      );
    }
  }
});

test('numpad repeats, shortcuts, and unrelated keys do not play drums', () => {
  const numpad = { ...key, key: '7', code: 'Numpad7' };
  for (const flag of ['repeat', 'ctrlKey', 'metaKey', 'altKey']) {
    assert.equal(matchSound(drumSounds, { ...numpad, [flag]: true }), undefined);
  }
  for (const code of ['Numpad0', 'NumpadEnter', 'NumpadDecimal', 'ArrowUp']) {
    assert.equal(matchSound(drumSounds, { ...key, code }), undefined);
  }
});
