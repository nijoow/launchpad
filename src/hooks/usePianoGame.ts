import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { AudioEngine } from '@/lib/audio-engine';
import { accompaniment, BEAT_SECONDS } from '@/lib/ode-to-joy';
import { PianoRound } from '@/lib/piano-round';

export default function usePianoGame(
  engine: RefObject<AudioEngine>,
  onError: (message: string) => void,
) {
  const round = useRef<PianoRound | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const [view, setView] = useState<ReturnType<PianoRound['view']> | null>(null);
  const [starting, setStarting] = useState(false);

  const cancel = useCallback(() => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    round.current = null;
    engine.current?.stopAll();
    setView(null);
    setStarting(false);
  }, [engine]);

  useEffect(() => {
    const interrupt = () => {
      if (round.current || starting) cancel();
    };
    const hide = () => {
      if (document.hidden) interrupt();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('blur', interrupt);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('blur', interrupt);
    };
  }, [cancel, starting]);

  useEffect(
    () => () => {
      generation.current++;
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const start = async () => {
    const audio = engine.current;
    if (!audio) return;
    cancel();
    const attempt = generation.current;
    setStarting(true);
    try {
      await audio.resume();
      if (attempt !== generation.current) return;
      const countStart = audio.currentTime + 0.04;
      const run = new PianoRound(countStart + BEAT_SECONDS * 4);
      round.current = run;
      for (let i = 0; i < 4; i++)
        audio.playClick(countStart + i * BEAT_SECONDS, i === 0);
      for (const note of accompaniment) {
        audio.playSample(
          note.sound.url,
          run.startsAt + note.beat * BEAT_SECONDS,
          {
            gain: 0.22,
            length: note.length * BEAT_SECONDS,
          },
        );
      }
      setStarting(false);
      const update = () => {
        const next = run.view(audio.currentTime);
        setView(next);
        if (next.done) round.current = null;
        else frame.current = requestAnimationFrame(update);
      };
      update();
    } catch {
      if (attempt === generation.current) {
        cancel();
        onError('소리를 시작하지 못했어요. 다시 시도해 주세요.');
      }
    }
  };
  const press = (pad: string) => {
    if (engine.current) round.current?.press(pad, engine.current.currentTime);
  };
  return { start, cancel, press, view, starting };
}
