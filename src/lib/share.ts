import { allSounds } from '../constant/sound';
import { parseProject, type ProjectContent, type Project } from './project';
import { LOOP_BARS } from './timeline';

export const MAX_SHARE_LENGTH = 16000;

/** A fragment stays in the browser, never in the HTTP request. No name or identity. */
export function encodeShare(content: ProjectContent) {
  const data = [
    1,
    content.bpm,
    content.events.map(event => [
      allSounds.findIndex(sound => sound.url === event.padId),
      event.beat,
    ]),
  ];
  const hash =
    '#loop=' +
    btoa(JSON.stringify(data))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
  if (hash.length > MAX_SHARE_LENGTH)
    throw new Error('링크가 너무 길어요. 음을 줄이거나 WAV로 내보내 주세요.');
  if (!decodeShare(hash)) throw new Error('공유할 루프를 확인해 주세요.');
  return hash;
}

export function decodeShare(hash: string): Project | null {
  if (!hash.startsWith('#loop=') || hash.length > MAX_SHARE_LENGTH) return null;
  try {
    const data: unknown = JSON.parse(
      atob(hash.slice(6).replaceAll('-', '+').replaceAll('_', '/')),
    );
    if (
      !Array.isArray(data) ||
      data.length !== 3 ||
      data[0] !== 1 ||
      !Array.isArray(data[2])
    )
      return null;
    const events = data[2].map((event: unknown) => {
      if (
        !Array.isArray(event) ||
        event.length !== 2 ||
        !Number.isInteger(event[0])
      )
        throw new Error('Invalid note');
      return { padId: allSounds[event[0]]?.url, beat: event[1] };
    });
    return parseProject({
      version: 2,
      bars: LOOP_BARS,
      id: 'shared-loop',
      name: '공유받은 루프',
      instrument: 'Drum',
      bpm: data[1],
      quantize: true,
      metronome: false,
      events,
      createdAt: 1,
      updatedAt: 1,
    });
  } catch {
    return null;
  }
}
