export interface Sound {
  url: string;
  name: string;
  color: 'W' | 'B';
  keyCode: string[];
}

export type Instrument = 'Drum' | 'Piano';

export const pianoSounds: Sound[] = [
  {
    url: '/audio/piano/piano48.wav',
    name: '도',
    color: 'W',
    keyCode: ['1'],
  },
  {
    url: '/audio/piano/piano49.wav',
    name: '도#',
    color: 'B',
    keyCode: ['2'],
  },
  {
    url: '/audio/piano/piano50.wav',
    name: '레',
    color: 'W',
    keyCode: ['3'],
  },
  {
    url: '/audio/piano/piano51.wav',
    name: '레#',
    color: 'B',
    keyCode: ['4'],
  },
  {
    url: '/audio/piano/piano52.wav',
    name: '미',
    color: 'W',
    keyCode: ['5'],
  },
  {
    url: '/audio/piano/piano53.wav',
    name: '파',
    color: 'W',
    keyCode: ['6'],
  },
  {
    url: '/audio/piano/piano54.wav',
    name: '파#',
    color: 'B',
    keyCode: ['7'],
  },
  {
    url: '/audio/piano/piano55.wav',
    name: '솔',
    color: 'W',
    keyCode: ['8'],
  },
  {
    url: '/audio/piano/piano56.wav',
    name: '솔#',
    color: 'B',
    keyCode: ['9'],
  },
  {
    url: '/audio/piano/piano57.wav',
    name: '라',
    color: 'W',
    keyCode: ['0'],
  },
  {
    url: '/audio/piano/piano58.wav',
    name: '라#',
    color: 'B',
    keyCode: ['-'],
  },
  {
    url: '/audio/piano/piano59.wav',
    name: '시',
    color: 'W',
    keyCode: ['='],
  },
  {
    url: '/audio/piano/piano60.wav',
    name: '도',
    color: 'W',
    keyCode: ['q', 'ㅂ'],
  },
  {
    url: '/audio/piano/piano61.wav',
    name: '도#',
    color: 'B',
    keyCode: ['w', 'ㅈ'],
  },
  {
    url: '/audio/piano/piano62.wav',
    name: '레',
    color: 'W',
    keyCode: ['e', 'ㄷ'],
  },
  {
    url: '/audio/piano/piano63.wav',
    name: '레#',
    color: 'B',
    keyCode: ['r', 'ㄱ'],
  },
  {
    url: '/audio/piano/piano64.wav',
    name: '미',
    color: 'W',
    keyCode: ['t', 'ㅅ'],
  },
  {
    url: '/audio/piano/piano65.wav',
    name: '파',
    color: 'W',
    keyCode: ['y', 'ㅛ'],
  },
  {
    url: '/audio/piano/piano66.wav',
    name: '파#',
    color: 'B',
    keyCode: ['u', 'ㅕ'],
  },
  {
    url: '/audio/piano/piano67.wav',
    name: '솔',
    color: 'W',
    keyCode: ['i', 'ㅑ'],
  },
  {
    url: '/audio/piano/piano68.wav',
    name: '솔#',
    color: 'B',
    keyCode: ['o', 'ㅐ'],
  },
  {
    url: '/audio/piano/piano69.wav',
    name: '라',
    color: 'W',
    keyCode: ['p', 'ㅔ'],
  },
  {
    url: '/audio/piano/piano70.wav',
    name: '라#',
    color: 'B',
    keyCode: ['['],
  },
  {
    url: '/audio/piano/piano71.wav',
    name: '시',
    color: 'W',
    keyCode: [']'],
  },
  {
    url: '/audio/piano/piano72.wav',
    name: '도',
    color: 'W',
    keyCode: ['a', 'ㅁ'],
  },
  {
    url: '/audio/piano/piano73.wav',
    name: '도#',
    color: 'B',
    keyCode: ['s', 'ㄴ'],
  },
  {
    url: '/audio/piano/piano74.wav',
    name: '레',
    color: 'W',
    keyCode: ['d', 'ㅇ'],
  },
  {
    url: '/audio/piano/piano75.wav',
    name: '레#',
    color: 'B',
    keyCode: ['f', 'ㄹ'],
  },
  {
    url: '/audio/piano/piano76.wav',
    name: '미',
    color: 'W',
    keyCode: ['g', 'ㅎ'],
  },
  {
    url: '/audio/piano/piano77.wav',
    name: '파',
    color: 'W',
    keyCode: ['h', 'ㅗ'],
  },
  {
    url: '/audio/piano/piano78.wav',
    name: '파#',
    color: 'B',
    keyCode: ['j', 'ㅓ'],
  },
  {
    url: '/audio/piano/piano79.wav',
    name: '솔',
    color: 'W',
    keyCode: ['k', 'ㅏ'],
  },
  {
    url: '/audio/piano/piano80.wav',
    name: '솔#',
    color: 'B',
    keyCode: ['l', 'ㅣ'],
  },
  {
    url: '/audio/piano/piano81.wav',
    name: '라',
    color: 'W',
    keyCode: [';'],
  },
  {
    url: '/audio/piano/piano82.wav',
    name: '라#',
    color: 'B',
    keyCode: ["'"],
  },
  {
    url: '/audio/piano/piano83.wav',
    name: '시',
    color: 'W',
    keyCode: ['Enter'],
  },
];

export const drumSounds: Sound[] = [
  {
    url: '/audio/drum/Kick1.wav',
    name: 'Kick1',
    color: 'W',
    keyCode: ['7'],
  },
  {
    url: '/audio/drum/Kick2.wav',
    name: 'Kick2',
    color: 'W',
    keyCode: ['8'],
  },
  {
    url: '/audio/drum/Hat1.wav',
    name: 'Hat1',
    color: 'W',
    keyCode: ['9'],
  },
  {
    url: '/audio/drum/Hat2.wav',
    name: 'Hat2',
    color: 'W',
    keyCode: ['4'],
  },
  {
    url: '/audio/drum/Hat3.wav',
    name: 'Hat3',
    color: 'W',
    keyCode: ['5'],
  },
  {
    url: '/audio/drum/Snare1.wav',
    name: 'Snare1',
    color: 'W',
    keyCode: ['6'],
  },
  {
    url: '/audio/drum/Snare2.wav',
    name: 'Snare2',
    color: 'W',
    keyCode: ['1'],
  },
  {
    url: '/audio/drum/Snare3.wav',
    name: 'Snare3',
    color: 'W',
    keyCode: ['2'],
  },
  {
    url: '/audio/drum/Snare4.wav',
    name: 'Snare4',
    color: 'W',
    keyCode: ['3'],
  },
];
