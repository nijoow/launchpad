import assert from 'node:assert/strict';
import { test } from 'node:test';
import { showTextStore } from '../src/store/store';

// Helper to fully reset the store to defaults
function resetStoreState() {
  // Reset the in-memory state
  showTextStore.setState({
    showPitch: true,
    showKeyboard: true,
    volume: 0.7,
  });
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
    resetStoreState();

    // 1. Modify state to trigger save using public actions as requested
    showTextStore.getState().setVolume(0.2);
    showTextStore.getState().toggleShowPitch();
    showTextStore.getState().toggleShowKeyboard();

    // Verify state was saved to our mock using the exact correct key
    assert.equal(receivedKeyForSet, 'nijoow-settings');
    assert.ok(storedData !== null);

    // Check version explicitly
    const parsed = JSON.parse(storedData as string);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.state.volume, 0.2);
    assert.equal(parsed.state.showPitch, false);
    assert.equal(parsed.state.showKeyboard, false);

    // Keep the exact JSON string
    const preservedString = storedData;

    // 2. Reset memory state manually
    showTextStore.setState({ volume: 0.7, showPitch: true, showKeyboard: true });

    // In order to prove a true round trip, we rely on the string we captured from setItem.
    storedData = preservedString;

    // Since skipHydration is true, hasHydrated evaluates to false normally until the first manual rehydrate().
    // We already proved earlier that simply re-assigning `storedData` and calling `await showTextStore.persist.rehydrate()` correctly rehydrates, unless skipHydration blocks it.
    // wait, I must test this. If I call rehydrate() directly, I need to check if it parses.
    await showTextStore.persist.rehydrate();
    assert.equal(receivedKeyForGet, 'nijoow-settings');

    // We expect the store to rehydrate volume and settings
    assert.equal(showTextStore.getState().volume, 0.2);
    assert.equal(showTextStore.getState().showPitch, false);
    assert.equal(showTextStore.getState().showKeyboard, false);

    // 4. Test removeItem path
    await showTextStore.persist.clearStorage();
    assert.equal(receivedKeyForRemove, 'nijoow-settings');
    assert.equal(storedData, null);
  } finally {
    resetStoreState();
    restore();
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
    resetStoreState();

    // Reset flag because `resetStoreState` might trigger `setItem`
    setItemCalled = false;

    assert.doesNotThrow(() => {
      // Use public actions
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
    resetStoreState();
    restore();
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
    resetStoreState();

    // Mutate state to non-default values to ensure getItem failure preserves current memory state, not just defaults
    showTextStore.setState({ volume: 0.3, showPitch: false, showKeyboard: false });

    assert.doesNotThrow(() => {
      // Simulate rehydrate fetching logic by calling rehydrate.
      showTextStore.persist.rehydrate();
    });

    // We expect getItem to have been called during rehydrate.
    assert.equal(getItemCalled, true);

    // Verify non-default memory state is preserved when load fails
    assert.equal(showTextStore.getState().volume, 0.3);
    assert.equal(showTextStore.getState().showPitch, false);
    assert.equal(showTextStore.getState().showKeyboard, false);
  } finally {
    resetStoreState();
    restore();
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
    resetStoreState();

    assert.doesNotThrow(() => {
      showTextStore.persist.clearStorage();
    });

    assert.equal(removeItemCalled, true);
    assert.equal(receivedKeyForRemove, 'nijoow-settings');
  } finally {
    resetStoreState();
    restore();
  }
});

test('cleanup explicitly resets state successfully', () => {
  const restore = mockLocalStorage({
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });

  try {
    showTextStore.setState({ volume: 0.1 });
    resetStoreState();
    assert.equal(showTextStore.getState().volume, 0.7);
  } finally {
    restore();
  }
});
