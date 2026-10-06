import {
  BEATS_PER_BAR,
  LOOP_BEATS,
  clampBpm,
  occurrences,
  recordedBeat,
  type NoteEvent,
} from './timeline';

export type TransportStatus =
  | 'idle'
  | 'starting'
  | 'countin'
  | 'recording'
  | 'playing';
export interface TransportSnapshot {
  status: TransportStatus;
  beat: number;
  countIn: number;
  events: NoteEvent[];
  playing: Set<string>;
  notice: string;
}
export interface TransportOptions {
  bpm: number;
  quantize: boolean;
  metronome: boolean;
}

interface TransportAudio {
  readonly currentTime: number;
  resume: () => Promise<void>;
  playSample: (url: string, time?: number) => boolean;
  playClick: (time: number, accent: boolean) => void;
  stopAll: () => void;
}

export const idleSnapshot = (): TransportSnapshot => ({
  status: 'idle',
  beat: 0,
  countIn: 0,
  events: [],
  playing: new Set(),
  notice: '',
});

/** Uses the audio clock; a short timer only fills the next scheduling window. */
export class LoopTransport {
  private events: NoteEvent[] = [];
  private status: TransportStatus = 'idle';
  private options: TransportOptions = {
    bpm: 120,
    quantize: true,
    metronome: false,
  };
  private recordStart = 0;
  private playbackStart = 0;
  private scheduledUntil = 0;
  private nextClick = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private notice = '';

  constructor(
    private audio: TransportAudio,
    private onChange: (state: TransportSnapshot) => void,
  ) {}

  private emit() {
    const secondsPerBeat = 60 / this.options.bpm;
    const elapsed =
      (this.audio.currentTime -
        (this.status === 'playing' ? this.playbackStart : this.recordStart)) /
      secondsPerBeat;
    const beat =
      this.status === 'idle' ||
      this.status === 'starting' ||
      this.status === 'countin'
        ? 0
        : Math.max(0, elapsed % LOOP_BEATS);
    const playing = new Set<string>();
    if (this.status === 'playing' && elapsed >= 0) {
      this.events.forEach(event => {
        const since = (beat - event.beat + LOOP_BEATS) % LOOP_BEATS;
        if (since < 0.12 / secondsPerBeat) playing.add(event.padId);
      });
    }
    this.onChange({
      status: this.status,
      beat,
      playing,
      events: this.events,
      notice: this.notice,
      countIn:
        this.status === 'countin'
          ? Math.min(4, Math.max(1, Math.ceil(-elapsed)))
          : 0,
    });
  }

  private clearRun() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.audio.stopAll();
  }

  stop(notice = '') {
    this.generation += 1;
    this.clearRun();
    this.status = 'idle';
    this.notice = notice;
    this.emit();
  }

  replaceEvents(events: NoteEvent[]) {
    this.stop();
    this.events = events
      .map(event => ({ ...event }))
      .sort((a, b) => a.beat - b.beat);
    this.emit();
  }

  async startRecording(options: TransportOptions) {
    await this.begin(options, true);
  }
  async startPlayback(options: TransportOptions) {
    if (!this.events.length)
      throw new Error('아직 녹음된 음이 없어요. 먼저 패드를 녹음해 주세요.');
    await this.begin(options, false);
  }

  private async begin(options: TransportOptions, record: boolean) {
    const generation = ++this.generation;
    this.clearRun();
    this.status = 'starting';
    this.notice = '';
    this.emit();
    try {
      // Called synchronously from the user's gesture before the first await.
      await this.audio.resume();
      if (generation !== this.generation) return;
      this.options = { ...options, bpm: clampBpm(options.bpm) };
      const secondsPerBeat = 60 / this.options.bpm;
      const base = this.audio.currentTime + 0.05;
      if (record) this.events = [];
      this.recordStart = base + (record ? BEATS_PER_BAR * secondsPerBeat : 0);
      this.playbackStart =
        this.recordStart + (record ? LOOP_BEATS * secondsPerBeat : 0);
      this.scheduledUntil = this.playbackStart;
      this.nextClick = record ? -BEATS_PER_BAR : 0;
      this.status = record ? 'countin' : 'playing';
      this.timer = setInterval(() => this.tick(), 25);
      this.tick();
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw error;
    }
  }

  capture(padId: string) {
    if (this.status !== 'recording' && this.status !== 'countin') return;
    const beat = recordedBeat(
      this.audio.currentTime,
      this.recordStart,
      this.options.bpm,
      this.options.quantize,
    );
    if (beat === null) return;
    // Quantization can align two quick taps to one step; play it only once in the loop.
    if (
      !this.events.some(
        event =>
          event.padId === padId && Math.abs(event.beat - beat) < 0.000001,
      )
    ) {
      this.events = [...this.events, { padId, beat }].sort(
        (a, b) => a.beat - b.beat,
      );
    }
    this.emit();
  }

  tick() {
    if (this.status === 'idle' || this.status === 'starting') return;
    const now = this.audio.currentTime;
    const horizon = now + 0.1;
    const secondsPerBeat = 60 / this.options.bpm;
    if (this.status === 'countin' && now >= this.recordStart)
      this.status = 'recording';
    if (this.status === 'recording' && now >= this.playbackStart) {
      if (!this.events.length) {
        this.stop('녹음된 음이 없어요. 녹음 중에 패드를 눌러 주세요.');
        return;
      }
      this.status = 'playing';
    }

    // Skip missed clicks after timer stalls instead of bursting them all at once.
    this.nextClick = Math.max(
      this.nextClick,
      Math.ceil((now - this.recordStart) / secondsPerBeat),
    );
    while (this.recordStart + this.nextClick * secondsPerBeat < horizon) {
      if (this.nextClick < 0 || this.options.metronome) {
        this.audio.playClick(
          this.recordStart + this.nextClick * secondsPerBeat,
          this.nextClick % BEATS_PER_BAR === 0,
        );
      }
      this.nextClick += 1;
    }

    if (horizon > this.playbackStart && this.events.length) {
      const from = Math.max(this.scheduledUntil, now - 0.025);
      occurrences(
        this.events,
        this.playbackStart,
        this.options.bpm,
        from,
        horizon,
      ).forEach(event => this.audio.playSample(event.padId, event.time));
      this.scheduledUntil = horizon;
    }
    this.emit();
  }

  dispose() {
    this.stop();
  }
}
