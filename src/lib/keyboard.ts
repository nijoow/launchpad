import type { Sound } from '../constant/sound';

const punctuation: Record<string, string> = {
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  ';': 'Semicolon',
  "'": 'Quote',
  Enter: 'Enter',
};

export function physicalKey(key: string) {
  if (/^[a-z]$/.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return punctuation[key] ?? key;
}

export function matchSound(
  sounds: Sound[],
  event: Pick<
    KeyboardEvent,
    'key' | 'code' | 'repeat' | 'ctrlKey' | 'altKey' | 'metaKey'
  >,
) {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  return sounds.find(sound =>
    event.code
      ? physicalKey(sound.keyCode[0]) === event.code
      : sound.keyCode.includes(event.key) ||
        sound.keyCode.includes(event.key.toLowerCase()),
  );
}
