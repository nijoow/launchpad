import type { Sound } from '@/constant/sound';
import { AudioEngine } from '@/lib/audio-engine';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAudioEngine(sounds: Sound[]) {
  const engine = useRef<AudioEngine | null>(null);
  const [available, setAvailable] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const audio = new AudioEngine();
    engine.current = audio;
    // Touch activation is granted at pointerup/touchend on mobile, not pointerdown.
    // Resume pending first-pad playback from that trusted gesture without retriggering it.
    const unlock = () => {
      void audio.resume().catch(() => {});
    };
    document.addEventListener('pointerup', unlock, true);
    document.addEventListener('touchend', unlock, true);
    document.addEventListener('keydown', unlock, true);
    return () => {
      document.removeEventListener('pointerup', unlock, true);
      document.removeEventListener('touchend', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      engine.current = null;
      audio.dispose();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError('');
    const audio = engine.current!;
    setFailed(new Set());
    for (const { url } of sounds) {
      void audio.loadSample(url).then(
        () => {
          if (!cancelled)
            setAvailable(previous =>
              previous.has(url) ? previous : new Set(previous).add(url),
            );
        },
        () => {
          if (!cancelled) setFailed(previous => new Set(previous).add(url));
        },
      );
    }
    return () => {
      cancelled = true;
    };
  }, [sounds, attempt]);

  const retry = useCallback(() => {
    setAttempt(value => value + 1);
  }, []);

  return {
    engine,
    ready: !error && sounds.every(sound => available.has(sound.url)),
    available,
    failed,
    playbackError: error,
    error: error || (failed.size ? '일부 음원을 불러오지 못했어요.' : ''),
    setError,
    retry,
  };
}
