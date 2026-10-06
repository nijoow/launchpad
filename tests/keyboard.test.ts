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
