type AudioEngineOptions = {
  createContext?: () => AudioContext;
  fetchSample?: (url: string) => Promise<ArrayBuffer>;
};

/** One owner for the context, decoded samples, and all playing/scheduled voices. */
export class AudioEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<void>>();
  private voices = new Set<AudioScheduledSourceNode>();
  private disposed = false;
  private generation = 0;
  private volume = 0.7;

  constructor(private options: AudioEngineOptions = {}) {}

  private getContext() {
    if (this.disposed) throw new Error('Audio engine is closed');
    if (!this.context) {
      this.context = this.options.createContext
        ? this.options.createContext()
        : new AudioContext();
      this.output = this.context.createGain();
      this.output.gain.value = this.volume;
      this.output.connect(this.context.destination);
    }
    return this.context;
  }

  get currentTime() {
    return this.context?.currentTime ?? 0;
  }

  async resume() {
    const context = this.getContext();
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') throw new Error('Audio could not start');
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.output && this.context) {
      this.output.gain.setValueAtTime(this.volume, this.context.currentTime);
    }
  }

  async loadSamples(urls: string[]) {
    await Promise.all(urls.map(url => this.loadSample(url)));
  }

  private loadSample(url: string): Promise<void> {
    if (this.disposed)
      return Promise.reject(new Error('Audio engine is closed'));
    if (this.buffers.has(url)) return Promise.resolve();
    const pending = this.loading.get(url);
    if (pending) return pending;
    const context = this.getContext();
    const fetchSample =
      this.options.fetchSample ??
      (async (path: string) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Could not load sample: ${path}`);
        return response.arrayBuffer();
      });
    const promise = fetchSample(url)
      .then(data => context.decodeAudioData(data))
      .then(buffer => {
        if (!this.disposed) this.buffers.set(url, buffer);
      })
      .finally(() => this.loading.delete(url));
    this.loading.set(url, promise);
    return promise;
  }

  playSample(url: string, time = this.currentTime) {
    const buffer = this.buffers.get(url);
    if (!buffer || this.disposed) return false;
    const context = this.getContext();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.output!);
    this.track(source);
    source.start(Math.max(time, context.currentTime));
    return true;
  }

  playClick(time: number, accent: boolean) {
    const context = this.getContext();
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.frequency.value = accent ? 1200 : 800;
    envelope.gain.setValueAtTime(0.18, time);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
    oscillator.connect(envelope);
    envelope.connect(this.output!);
    this.track(oscillator, () => envelope.disconnect());
    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }

  async trigger(url: string) {
    const generation = this.generation;
    await this.resume();
    if (generation !== this.generation || this.disposed) return false;
    return this.playSample(url);
  }

  private track(source: AudioScheduledSourceNode, cleanup?: () => void) {
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      this.voices.delete(source);
      cleanup?.();
    };
  }

  stopAll() {
    this.generation += 1;
    this.voices.forEach(source => {
      try {
        source.stop();
      } catch {
        // A voice may have finished between enumeration and cancellation.
      }
      source.disconnect();
    });
    this.voices.clear();
  }

  dispose() {
    this.disposed = true;
    this.stopAll();
    this.buffers.clear();
    this.loading.clear();
    this.output?.disconnect();
    if (this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => {});
    }
  }
}
