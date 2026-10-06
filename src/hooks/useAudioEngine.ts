import type { Sound } from '@/constant/sound';
import { AudioEngine } from '@/lib/audio-engine';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAudioEngine(sounds: Sound[]) {
  const engine = useRef<AudioEngine | null>(null);
  const [loadedSounds, setLoadedSounds] = useState<Sound[] | null>(null);
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
    audio.stopAll();
    audio
      .loadSamples(sounds.map(sound => sound.url))
      .then(() => {
        if (!cancelled) setLoadedSounds(sounds);
      })
      .catch(() => {
        if (!cancelled)
          setError('소리를 불러오지 못했어요. 다시 시도해 주세요.');
      });
    return () => {
      cancelled = true;
    };
  }, [sounds, attempt]);

  const retry = useCallback(() => {
    setLoadedSounds(null);
    setAttempt(value => value + 1);
  }, []);

  return {
    engine,
    ready: loadedSounds === sounds && !error,
    error,
    setError,
    retry,
  };
}
