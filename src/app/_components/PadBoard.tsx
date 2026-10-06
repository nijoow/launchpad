import {
  drumSounds,
  pianoSounds,
  type Instrument,
  type Sound,
} from '@/constant/sound';
import KeyPad from './KeyPad';

const octaves = [
  { label: 'C3 — B3', name: 'C3', sounds: pianoSounds.slice(0, 12) },
  { label: 'C4 — B4', name: 'C4', sounds: pianoSounds.slice(12, 24) },
  { label: 'C5 — B5', name: 'C5', sounds: pianoSounds.slice(24, 36) },
];

interface PadBoardProps {
  instrument: Instrument;
  ready: boolean;
  active: Set<string>;
  playing?: Set<string>;
  showPitch: boolean;
  showKeyboard: boolean;
  press: (source: string, sound: Sound) => void;
  release: (source: string) => void;
}

export default function PadBoard({
  instrument,
  ready,
  active,
  playing,
  showPitch,
  showKeyboard,
  press,
  release,
}: PadBoardProps) {
  const renderPad = (sound: Sound, octave?: string) => (
    <KeyPad
      key={sound.url}
      sound={sound}
      octave={octave}
      active={active.has(sound.url) || !!playing?.has(sound.url)}
      disabled={!ready}
      showPitch={showPitch}
      showKeyboard={showKeyboard}
      press={press}
      release={release}
    />
  );
  return (
    <section
      aria-label={`${instrument} 패드`}
      className={`pad-stage ${instrument === 'Piano' ? 'piano-stage' : 'drum-stage'}`}
    >
      {instrument === 'Drum' ? (
        <div className="drum-grid">
          {drumSounds.map(sound => renderPad(sound))}
        </div>
      ) : (
        <div className="piano-groups">
          {octaves.map(octave => (
            <div key={octave.name}>
              <div className="octave-label">
                <span>{octave.label}</span>
              </div>
              <div className="piano-octave-grid">
                {octave.sounds.map(sound => renderPad(sound, octave.name))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
