import assert from 'node:assert/strict';
import { test } from 'node:test';
import { showTextStore } from '../src/store/store';

test('store gracefully handles localStorage errors on setItem', () => {
  let setItemCalled = false;
  const originalLocalStorage = global.localStorage;

  global.localStorage = {
    getItem: () => null,
    setItem: () => {
      setItemCalled = true;
      throw new Error('QuotaExceededError');
    },
    removeItem: () => {},
  } as any;

  try {
    assert.doesNotThrow(() => {
      showTextStore.getState().setVolume(0.5);
    });

    assert.equal(showTextStore.getState().volume, 0.5);
    assert.equal(setItemCalled, true);
  } finally {
    global.localStorage = originalLocalStorage;
  }
});

test('store gracefully handles localStorage errors on getItem', () => {
  let getItemCalled = false;
  const originalLocalStorage = global.localStorage;

  global.localStorage = {
    getItem: () => {
      getItemCalled = true;
      throw new Error('SecurityError');
    },
    setItem: () => {},
    removeItem: () => {},
  } as any;

  try {
    assert.doesNotThrow(() => {
      showTextStore.persist.rehydrate();
    });

    assert.equal(showTextStore.persist.hasHydrated(), true);
    assert.equal(getItemCalled, true);
  } finally {
    global.localStorage = originalLocalStorage;
  }
});

test('store gracefully handles localStorage errors on removeItem', () => {
  let removeItemCalled = false;
  const originalLocalStorage = global.localStorage;

  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {
      removeItemCalled = true;
      throw new Error('SecurityError');
    },
  } as any;

  try {
    assert.doesNotThrow(() => {
      showTextStore.persist.clearStorage();
    });

    assert.equal(removeItemCalled, true);
  } finally {
    global.localStorage = originalLocalStorage;
  }
});
