import type { Sound } from '@/constant/sound';
import { cn } from '@/utils/cn';
import { memo, useEffect, useRef } from 'react';

interface KeyPadProps {
  sound: Sound;
  active: boolean;
  disabled: boolean;
  showPitch: boolean;
  showKeyboard: boolean;
  press: (source: string, sound: Sound) => void;
  release: (source: string) => void;
  octave?: string;
}

export default memo(function KeyPad({
  sound,
  active,
  disabled,
  showPitch,
  showKeyboard,
  press,
  release,
  octave,
}: KeyPadProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${sound.name}${octave ? ` ${octave}` : ''}, 단축키 ${sound.keyCode[0]}`}
      data-pad={sound.url}
      data-active={active}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        press(`pointer:${event.pointerId}`, sound);
      }}
      onPointerUp={event => release(`pointer:${event.pointerId}`)}
      onPointerCancel={event => release(`pointer:${event.pointerId}`)}
      onLostPointerCapture={event => release(`pointer:${event.pointerId}`)}
      onKeyDown={event => {
        if (!['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        if (!event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey)
          press(`focus:${event.code}`, sound);
      }}
      onKeyUp={event => release(`focus:${event.code}`)}
      onBlur={() => {
        release('focus:Enter');
        release('focus:Space');
      }}
      onClick={event => {
        if (event.detail !== 0) return;
        clearTimeout(timer.current);
        release(`assist:${sound.url}`);
        press(`assist:${sound.url}`, sound);
        timer.current = setTimeout(() => release(`assist:${sound.url}`), 150);
      }}
      onContextMenu={event => event.preventDefault()}
      className={cn(
        'pad',
        octave && sound.color === 'B' && 'pad-dark',
        active && 'pad-active',
      )}
    >
      {showPitch && <span className="pad-name">{sound.name}</span>}
      {showKeyboard && <span className="pad-shortcut">{sound.keyCode[0]}</span>}
    </button>
  );
});
