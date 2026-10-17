import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
import { showTextStore } from '../src/store/store';

// Helper to fully reset the store to defaults
function resetStoreState() {
  // Reset the in-memory state
  showTextStore.setState({
    showPitch: true,
    showKeyboard: true,
    volume: 0.7,
  });

  // Explicitly clear hydration state
  showTextStore.persist.clearStorage();
}

// Helper to safely mock localStorage
function mockLocalStorage(mockMethods: Partial<Storage>) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(global, 'localStorage');

  Object.defineProperty(global, 'localStorage', {
    value: mockMethods,
    configurable: true,
    writable: true,
  });

  return function restoreLocalStorage() {
    if (originalDescriptor) {
      Object.defineProperty(global, 'localStorage', originalDescriptor);
    } else {
      delete (global as any).localStorage;
    }
  };
}

beforeEach(() => {
  resetStoreState();
});

test('store successfully saves and restores state (control path)', async () => {
  let storedData: string | null = null;
  let receivedKeyForSet: string | null = null;
  let receivedKeyForGet: string | null = null;
  let receivedKeyForRemove: string | null = null;

  const restore = mockLocalStorage({
    getItem: (key) => {
      receivedKeyForGet = key;
      return storedData;
    },
    setItem: (key, value) => {
      receivedKeyForSet = key;
      storedData = value;
    },
    removeItem: (key) => {
      receivedKeyForRemove = key;
      storedData = null;
    },
  });

  try {
    // 1. Modify state to trigger save
    showTextStore.getState().setVolume(0.2);
    showTextStore.getState().toggleShowPitch();
    showTextStore.getState().toggleShowKeyboard();

    // Verify state was saved to our mock using the exact correct key
    assert.equal(receivedKeyForSet, 'nijoow-settings');
    assert.ok(storedData !== null);
    const parsed = JSON.parse(storedData as string);
    assert.equal(parsed.state.volume, 0.2);
    assert.equal(parsed.state.showPitch, false);
    assert.equal(parsed.state.showKeyboard, false);

    // 2. Reset memory state manually
    showTextStore.setState({ volume: 0.7, showPitch: true, showKeyboard: true });

    // Since our mock storage isn't fully integrated with JSONStorage in the same way `localStorage` is (JSONStorage wraps it but we are replacing `localStorage` midway), wait, rehydrate works by pulling from the storage option configured during store creation.
    // Wait, the storage was created with `localStorage` reference, which we mocked.

    // We just manually mock the getItem return string that JSONStorage expects
    storedData = JSON.stringify({
      state: {
        volume: 0.2,
        showPitch: false,
        showKeyboard: false,
      },
      version: 1,
    });

    // 3. Force rehydrate and wait
    await showTextStore.persist.rehydrate();

    // Verify it requested the exact correct key
    assert.equal(receivedKeyForGet, 'nijoow-settings');

    // We expect the store to rehydrate volume and settings
    assert.equal(showTextStore.getState().volume, 0.2);
    assert.equal(showTextStore.getState().showPitch, false);
    assert.equal(showTextStore.getState().showKeyboard, false);
    assert.equal(showTextStore.persist.hasHydrated(), true);

    // 4. Test removeItem path
    await showTextStore.persist.clearStorage();
    assert.equal(receivedKeyForRemove, 'nijoow-settings');
    assert.equal(storedData, null);
  } finally {
    restore();
    resetStoreState();
  }
});

test('store gracefully handles localStorage errors on setItem', () => {
  let setItemCalled = false;
  const restore = mockLocalStorage({
    getItem: () => null,
    setItem: () => {
      setItemCalled = true;
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {},
  });

  try {
    assert.doesNotThrow(() => {
      showTextStore.getState().setVolume(0.5);
      showTextStore.getState().toggleShowPitch();
      showTextStore.getState().toggleShowKeyboard();
    });

    assert.equal(setItemCalled, true);

    // Verify memory state is maintained despite storage failure
    assert.equal(showTextStore.getState().volume, 0.5);
    assert.equal(showTextStore.getState().showPitch, false);
    assert.equal(showTextStore.getState().showKeyboard, false);
  } finally {
    restore();
    resetStoreState();
  }
});

test('store gracefully handles localStorage errors on getItem', async () => {
  let getItemCalled = false;
  const restore = mockLocalStorage({
    getItem: () => {
      getItemCalled = true;
      throw new Error('SecurityError');
    },
    setItem: () => {},
    removeItem: () => {},
  });

  try {
    // Assert immediate state is default
    assert.equal(showTextStore.getState().volume, 0.7);
    assert.equal(showTextStore.getState().showPitch, true);
    assert.equal(showTextStore.getState().showKeyboard, true);

    assert.doesNotThrow(() => {
      showTextStore.persist.rehydrate();
    });

    assert.equal(getItemCalled, true);
    assert.equal(showTextStore.persist.hasHydrated(), true);

    // Verify defaults are maintained when load fails
    assert.equal(showTextStore.getState().volume, 0.7);
    assert.equal(showTextStore.getState().showPitch, true);
    assert.equal(showTextStore.getState().showKeyboard, true);
  } finally {
    restore();
    resetStoreState();
  }
});

test('store gracefully handles localStorage errors on removeItem', () => {
  let removeItemCalled = false;
  let receivedKeyForRemove: string | null = null;
  const restore = mockLocalStorage({
    getItem: () => null,
    setItem: () => {},
    removeItem: (key) => {
      removeItemCalled = true;
      receivedKeyForRemove = key;
      throw new Error('SecurityError');
    },
  });

  try {
    assert.doesNotThrow(() => {
      showTextStore.persist.clearStorage();
    });

    assert.equal(removeItemCalled, true);
    assert.equal(receivedKeyForRemove, 'nijoow-settings');
  } finally {
    restore();
    resetStoreState();
  }
});

test('cleanup explicitly resets state successfully', () => {
  showTextStore.setState({ volume: 0.1 });
  resetStoreState();
  assert.equal(showTextStore.getState().volume, 0.7);
});
