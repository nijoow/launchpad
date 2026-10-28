import type { AudioEngine } from './audio-engine';
import { LOOP_BEATS, type NoteEvent } from './timeline';

/** Fold sample tails across the loop boundary, then prevent digital clipping. */
export function loopChannels(channels: Float32Array[], frames: number) {
  const result = channels.map(channel => {
    const loop = new Float32Array(frames);
    for (let i = 0; i < channel.length; i++) loop[i % frames] += channel[i];
    return loop;
  });
  let peak = 1;
  for (const channel of result)
    for (let i = 0; i < channel.length; i++)
      peak = Math.max(peak, Math.abs(channel[i]));
  for (const channel of result)
    for (let i = 0; i < channel.length; i++) channel[i] /= peak;
  return result;
}

export function encodeWav(channels: Float32Array[], sampleRate: number) {
  const frames = channels[0].length;
  const count = channels.length;
  const data = new ArrayBuffer(44 + frames * count * 2);
  const view = new DataView(data);
  const text = (offset: number, value: string) =>
    value
      .split('')
      .forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, data.byteLength - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, frames * count * 2, true);
  for (let frame = 0; frame < frames; frame++)
    for (let channel = 0; channel < count; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][frame]));
      view.setInt16(
        44 + (frame * count + channel) * 2,
        sample * (sample < 0 ? 32768 : 32767),
        true,
      );
    }
  return data;
}

export async function renderWav(
  engine: AudioEngine,
  events: NoteEvent[],
  bpm: number,
  volume: number,
) {
  const rate = 44100;
  const frames = Math.round(((LOOP_BEATS * 60) / bpm) * rate);
  const buffers = events.map(event => {
    const buffer = engine.getSample(event.padId);
    if (!buffer) throw new Error('소리를 불러온 뒤 다시 내보내 주세요.');
    return buffer;
  });
  const tail = Math.max(0, ...buffers.map(buffer => buffer.duration));
  const context = new OfflineAudioContext(
    2,
    frames + Math.ceil(tail * rate),
    rate,
  );
  const gain = context.createGain();
  gain.gain.value = volume;
  gain.connect(context.destination);
  events.forEach((event, i) => {
    const source = context.createBufferSource();
    source.buffer = buffers[i];
    source.connect(gain);
    source.start((event.beat * 60) / bpm);
  });
  const rendered = await context.startRendering();
  return new Blob(
    [
      encodeWav(
        loopChannels(
          [rendered.getChannelData(0), rendered.getChannelData(1)],
          frames,
        ),
        rate,
      ),
    ],
    { type: 'audio/wav' },
  );
}
