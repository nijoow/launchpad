import { pianoSounds } from '../constant/sound';

// Beethoven, Ode to Joy, bars 1–4. Peter Chubb's public-domain SATB edition,
// transposed from G to C. The melody is played in the top octave.
// https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=528
export const BEAT_SECONDS = 60 / 100;
export const SONG_BEATS = 16;

function voice(pitches: number[], beats: number[]) {
  return pitches.map((midi, index) => ({
    sound: pianoSounds[midi - 48],
    beat: beats[index],
    length: (beats[index + 1] ?? SONG_BEATS) - beats[index],
  }));
}

const melodyBeats = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13.5, 14];
const backingBeats = [0, 1, 2, 3, 4, 5.5, 6, 7, 8, 9, 10, 11, 12, 13.5, 14];

export const melody = voice(
  [76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 76, 74, 74],
  melodyBeats,
);
export const accompaniment = [
  ...voice(
    [72, 72, 74, 72, 72, 74, 72, 71, 67, 67, 71, 72, 72, 71, 71],
    backingBeats,
  ),
  ...voice(
    [67, 67, 65, 64, 69, 67, 67, 67, 64, 64, 67, 67, 67, 67, 67],
    backingBeats,
  ),
  ...voice(
    [60, 60, 60, 60, 57, 59, 60, 55, 64, 64, 62, 60, 55, 55, 55],
    backingBeats,
  ),
];
