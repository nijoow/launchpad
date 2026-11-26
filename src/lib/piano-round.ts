import { BEAT_SECONDS, melody, SONG_BEATS } from './ode-to-joy';

const HIT_WINDOW = 0.15;
const PERFECT_WINDOW = 0.075;
const CUE_LEAD = BEAT_SECONDS;

export class PianoRound {
  private next = 0;
  private hits = 0;
  private perfect = 0;
  private wrong = 0;
  private feedback = '';

  constructor(readonly startsAt: number) {}

  private advance(elapsed: number) {
    while (
      this.next < melody.length &&
      elapsed > melody[this.next].beat * BEAT_SECONDS + HIT_WINDOW
    ) {
      this.next++;
      this.feedback = '놓침';
    }
  }

  press(pad: string, now: number) {
    const elapsed = now - this.startsAt;
    this.advance(elapsed);
    const target = melody[this.next];
    if (!target || elapsed < -HIT_WINDOW) return;
    const distance = Math.abs(elapsed - target.beat * BEAT_SECONDS);
    if (distance > HIT_WINDOW || pad !== target.sound.url) {
      this.wrong++;
      this.feedback = pad === target.sound.url ? '조금 일러요' : '다른 건반';
      return;
    }
    this.hits++;
    this.next++;
    if (distance <= PERFECT_WINDOW) {
      this.perfect++;
      this.feedback = '정확!';
    } else {
      this.feedback = '좋아요';
    }
  }

  view(now: number) {
    const elapsed = now - this.startsAt;
    this.advance(elapsed);
    const target = melody[this.next];
    const until = target ? target.beat * BEAT_SECONDS - elapsed : Infinity;
    return {
      done: elapsed >= SONG_BEATS * BEAT_SECONDS,
      count: Math.max(0, Math.ceil(-elapsed / BEAT_SECONDS)),
      bar: Math.max(1, Math.min(4, 1 + Math.floor(elapsed / BEAT_SECONDS / 4))),
      cue: target && until <= CUE_LEAD ? target.sound : null,
      progress: Math.max(0, Math.min(1, 1 - until / CUE_LEAD)),
      hits: this.hits,
      perfect: this.perfect,
      wrong: this.wrong,
      feedback: this.feedback,
    };
  }
}
