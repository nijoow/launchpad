import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';

interface ShowTextState {
  showPitch: boolean;
  toggleShowPitch: () => void;
  showKeyboard: boolean;
  toggleShowKeyboard: () => void;
  volume: number;
  setVolume: (value: number) => void;
}

const storage: StateStorage = {
  getItem: key => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Settings are optional in private browsing. */
    }
  },
  removeItem: key => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* Best effort. */
    }
  },
};

export const showTextStore = create<ShowTextState>()(
  persist(
    set => ({
      showPitch: true,
      toggleShowPitch: () => set(state => ({ showPitch: !state.showPitch })),
      showKeyboard: true,
      toggleShowKeyboard: () =>
        set(state => ({ showKeyboard: !state.showKeyboard })),
      volume: 0.7,
      setVolume: value => set({ volume: Math.max(0, Math.min(1, value)) }),
    }),
    {
      name: 'nijoow-settings',
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => storage),
      partialize: state => ({
        showPitch: state.showPitch,
        showKeyboard: state.showKeyboard,
        volume: state.volume,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<ShowTextState> | undefined;
        return {
          ...current,
          showPitch:
            typeof saved?.showPitch === 'boolean'
              ? saved.showPitch
              : current.showPitch,
          showKeyboard:
            typeof saved?.showKeyboard === 'boolean'
              ? saved.showKeyboard
              : current.showKeyboard,
          volume:
            typeof saved?.volume === 'number' && Number.isFinite(saved.volume)
              ? Math.max(0, Math.min(1, saved.volume))
              : current.volume,
        };
      },
    },
  ),
);
