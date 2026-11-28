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
import type { MeasuredRound, TimedPress } from '@/lib/piano-timing';

export default function usePianoGame(
  engine: RefObject<AudioEngine>,
  onError: (message: string) => void,
) {
  const round = useRef<PianoRound | null>(null);
  const active = useRef(false);
  const taps = useRef<TimedPress[] | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const [view, setView] = useState<ReturnType<PianoRound['view']> | null>(null);
  const [starting, setStarting] = useState(false);

  const [interrupted, setInterrupted] = useState(false);

  const cancel = useCallback(
    (reason: 'manual' | 'interrupted' = 'manual') => {
      active.current = false;
      taps.current = null;
      setInterrupted(reason === 'interrupted');
      generation.current++;
      cancelAnimationFrame(frame.current);
      round.current = null;
      engine.current?.stopAll();
      setView(null);
      setStarting(false);
    },
    [engine],
  );

  useEffect(() => {
    const interrupt = () => {
      if (active.current) cancel('interrupted');
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
  }, [cancel]);

  useEffect(
    () => () => {
      generation.current++;
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const start = async (onMeasuredRound?: (result: MeasuredRound) => void) => {
    const audio = engine.current;
    if (!audio) return;
    cancel();
    active.current = true;
    const attempt = generation.current;
    setStarting(true);
    try {
      await audio.resume();
      if (attempt !== generation.current) return;
      const countStart = audio.currentTime + 0.04;
      const run = new PianoRound(countStart + BEAT_SECONDS * 4);
      round.current = run;
      if (onMeasuredRound) taps.current = [];
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
        if (next.done) {
          active.current = false;
          round.current = null;
          if (onMeasuredRound && taps.current) {
            onMeasuredRound({
              taps: taps.current,
              hits: next.hits,
              perfect: next.perfect,
              wrong: next.wrong,
            });
            taps.current = null;
          }
        } else frame.current = requestAnimationFrame(update);
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
    const run = round.current;
    if (!engine.current || !run) return;
    const now = engine.current.currentTime;
    taps.current?.push({ pad, ms: Math.round((now - run.startsAt) * 1000) });
    run.press(pad, now);
  };
  return { start, cancel, press, view, starting, interrupted };
}
