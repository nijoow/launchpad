import type { Project } from '../src/lib/project';

export const project: Project = {
  version: 1,
  bars: 4,
  id: 'test-loop',
  name: '첫 비트',
  instrument: 'Drum',
  bpm: 120,
  quantize: true,
  metronome: false,
  createdAt: 100,
  updatedAt: 200,
  events: [
    { padId: '/audio/drum/Kick1.wav', beat: 0 },
    { padId: '/audio/drum/Snare1.wav', beat: 4 },
  ],
};
