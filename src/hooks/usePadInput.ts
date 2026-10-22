import type { Sound } from '@/constant/sound';
import { HeldInputs } from '@/lib/held-inputs';
import { matchSound } from '@/lib/keyboard';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function usePadInput(
  sounds: Sound[],
  enabled: boolean,
  onPlay: (sound: Sound) => void,
) {
  const held = useRef(new HeldInputs());
  const [active, setActive] = useState(new Set<string>());
  const onPlayRef = useRef(onPlay);
  useEffect(() => {
    onPlayRef.current = onPlay;
  }, [onPlay]);

  const refresh = useCallback(() => setActive(held.current.active()), []);
  const release = useCallback(
    (source: string) => {
      if (held.current.release(source)) refresh();
    },
    [refresh],
  );
  const releaseAll = useCallback(() => {
    held.current.clear();
    refresh();
  }, [refresh]);
  const press = useCallback(
    (source: string, sound: Sound) => {
      if (!enabled || !held.current.press(source, sound.url)) return;
      refresh();
      onPlayRef.current(sound);
    },
    [enabled, refresh],
  );

  useEffect(() => {
    const heldInputs = held.current;
    releaseAll();
    const down = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return;
      if (
        ['Enter', 'Space'].includes(event.code) &&
        target?.closest('button, a')
      )
        return;
      const sound = matchSound(sounds, event);
      if (!sound || !enabled) return;
      event.preventDefault();
      press(`key:${event.code || event.key}`, sound);
    };
    const up = (event: KeyboardEvent) =>
      release(`key:${event.code || event.key}`);
    const visibility = () => {
      if (document.hidden) releaseAll();
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', releaseAll);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', releaseAll);
      heldInputs.clear();
    };
  }, [sounds, enabled, press, release, releaseAll]);

  return { active, press, release, releaseAll };
}
