import { showTextStore } from '@/store/store';
import { useEffect } from 'react';

export default function PerformanceSettings() {
  const showPitch = showTextStore(state => state.showPitch);
  const showKeyboard = showTextStore(state => state.showKeyboard);
  const toggleShowPitch = showTextStore(state => state.toggleShowPitch);
  const toggleShowKeyboard = showTextStore(state => state.toggleShowKeyboard);
  const volume = showTextStore(state => state.volume);
  const setVolume = showTextStore(state => state.setVolume);
  useEffect(() => {
    void showTextStore.persist.rehydrate();
  }, []);
  return (
    <div className="performance-settings">
      <div className="setting-options">
        <label className="setting-label">
          <input
            type="checkbox"
            checked={showPitch}
            onChange={toggleShowPitch}
            className="setting-checkbox"
          />
          음 이름
        </label>
        <label className="setting-label">
          <input
            type="checkbox"
            checked={showKeyboard}
            onChange={toggleShowKeyboard}
            className="setting-checkbox"
          />
          단축키
        </label>
      </div>
      <label className="volume-control">
        볼륨
        <input
          aria-label="볼륨"
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={event => setVolume(Number(event.target.value) / 100)}
          className="volume-slider"
        />
        <span className="volume-value">{Math.round(volume * 100)}%</span>
      </label>
    </div>
  );
}
