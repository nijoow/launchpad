import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  accompaniment,
  BEAT_SECONDS,
  gameSounds,
  melody,
  SONG_BEATS,
} from '../src/lib/ode-to-joy';
import { PianoRound } from '../src/lib/piano-round';

test('the four-bar score fits the visible piano octave and ends together with the backing', () => {
  assert.equal(melody.length, 15);
  assert.ok(melody.every(note => gameSounds.includes(note.sound)));
  for (const note of [...melody, ...accompaniment]) {
    assert.ok(note.length > 0 && note.beat + note.length <= SONG_BEATS);
    assert.ok(note.sound.url.endsWith('.wav'));
  }
  assert.equal(melody.at(-1)!.beat + melody.at(-1)!.length, SONG_BEATS);
});

test('four count-in beats lead into distinct repeated notes, all scoreable on the audio clock', () => {
  const round = new PianoRound(4 * BEAT_SECONDS);
  assert.equal(round.view(0).count, 4);
  assert.equal(round.view(0).cue, null);
  round.press(melody[0].sound.url, 0);
  assert.equal(round.view(round.startsAt - 0.3).cue, melody[0].sound);
  for (const note of melody)
    round.press(note.sound.url, round.startsAt + note.beat * BEAT_SECONDS);
  const result = round.view(round.startsAt + SONG_BEATS * BEAT_SECONDS);
  assert.equal(result.done, true);
  assert.equal(result.hits, melody.length);
  assert.equal(result.perfect, melody.length);
  assert.equal(result.wrong, 0);
});

test('wrong, early and duplicate presses never consume a later note; a missed beat permits re-entry', () => {
  const round = new PianoRound(0);
  round.press(gameSounds[0].url, 0);
  round.press(melody[0].sound.url, 0.1);
  round.press(melody[0].sound.url, 0.11);
  assert.equal(round.view(0.12).wrong, 2);
  assert.equal(round.view(0.12).perfect, 0);
  // No intermediate frames during a stall: expire the missed notes on input.
  round.press(melody[3].sound.url, 3 * BEAT_SECONDS);
  const state = round.view(3 * BEAT_SECONDS);
  assert.equal(state.hits, 2);
  assert.equal(state.perfect, 1);
});
