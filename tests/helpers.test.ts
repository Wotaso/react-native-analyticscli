import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectDefaultAppVersion,
  detectDefaultPlatform,
  detectRuntimeEnv,
  readStorageAsync,
  readStorageSync,
  resolveBrowserStorageAdapter,
  sanitizeProperties,
  toNumericBucket,
  toStableKey,
  toTextLengthBucket,
  writeStorageSync,
} from '../src/helpers.js';

const withGlobalProperty = async <T>(
  key: keyof typeof globalThis,
  value: unknown,
  fn: () => Promise<T> | T,
): Promise<T> => {
  const hadOwn = Object.prototype.hasOwnProperty.call(globalThis, key);
  const original = (globalThis as Record<string, unknown>)[key as string];
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true,
  });

  try {
    return await fn();
  } finally {
    if (hadOwn) {
      Object.defineProperty(globalThis, key, {
        value: original,
        configurable: true,
        writable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  }
};

test('readStorageSync and readStorageAsync support sync + async adapters', async () => {
  const syncStorage = {
    getItem: (key: string) => (key === 'present' ? 'value' : null),
    setItem: () => undefined,
  };
  const asyncStorage = {
    getItem: async (key: string) => (key === 'present' ? 'value' : null),
    setItem: async () => undefined,
  };

  assert.equal(readStorageSync(syncStorage, 'present'), 'value');
  assert.equal(readStorageSync(asyncStorage, 'present'), null);
  assert.equal(await readStorageAsync(syncStorage, 'present'), 'value');
  assert.equal(await readStorageAsync(asyncStorage, 'present'), 'value');
});

test('writeStorageSync swallows sync and async storage failures', async () => {
  const syncFailStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('sync fail');
    },
  };

  const asyncFailStorage = {
    getItem: async () => null,
    setItem: async () => {
      throw new Error('async fail');
    },
  };

  assert.doesNotThrow(() => writeStorageSync(syncFailStorage, 'key', 'value'));
  assert.doesNotThrow(() => writeStorageSync(asyncFailStorage, 'key', 'value'));
  await new Promise((resolve) => setTimeout(resolve, 0));
});

test('detectDefaultPlatform returns undefined when only ReactNative product is known', async () => {
  await withGlobalProperty('navigator', { product: 'ReactNative' }, () => {
    assert.equal(detectDefaultPlatform(), undefined);
  });
});

test('detectDefaultPlatform resolves native os when Platform.OS is available', async () => {
  await withGlobalProperty('Platform' as keyof typeof globalThis, { OS: 'ios' }, () => {
    assert.equal(detectDefaultPlatform(), 'ios');
  });
});

test('detectDefaultAppVersion reads Expo application version hints', async () => {
  await withGlobalProperty(
    'expo' as keyof typeof globalThis,
    {
      modules: {
        ExpoApplication: {
          nativeApplicationVersion: '2.3.4',
        },
      },
    },
    () => {
      assert.equal(detectDefaultAppVersion(), '2.3.4');
    },
  );
});

test('detectDefaultAppVersion returns undefined when no runtime hint is present', () => {
  assert.equal(detectDefaultAppVersion(), undefined);
});

test('detectRuntimeEnv prioritizes __DEV__ then process env', async () => {
  await withGlobalProperty('__DEV__' as keyof typeof globalThis, true, () => {
    assert.equal(detectRuntimeEnv(), 'development');
  });

  await withGlobalProperty('__DEV__' as keyof typeof globalThis, false, () => {
    assert.equal(detectRuntimeEnv(), 'production');
  });

  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    assert.equal(detectRuntimeEnv(), 'development');
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test('resolveBrowserStorageAdapter returns null when localStorage access throws', async () => {
  const brokenWindow = {};
  Object.defineProperty(brokenWindow, 'localStorage', {
    get() {
      throw new Error('denied');
    },
    configurable: true,
  });

  await withGlobalProperty('window', brokenWindow, () => {
    assert.equal(resolveBrowserStorageAdapter(), null);
  });
});

test('resolveBrowserStorageAdapter uses provided localStorage implementation', async () => {
  const backing = new Map<string, string>();
  const windowLike = {
    localStorage: {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value);
      },
      removeItem: (key: string) => {
        backing.delete(key);
      },
    },
  };

  await withGlobalProperty('window', windowLike, () => {
    const storage = resolveBrowserStorageAdapter();
    assert.ok(storage);
    storage?.setItem('alpha', '1');
    assert.equal(storage?.getItem('alpha'), '1');
    storage?.removeItem?.('alpha');
    assert.equal(storage?.getItem('alpha'), null);
  });
});

test('property and survey helpers normalize payload values', () => {
  assert.deepEqual(sanitizeProperties({ email: 'redacted@example.com', source: 'welcome' }), {
    source: 'welcome',
  });
  assert.equal(toStableKey(' Welcome Screen #1 '), 'welcome_screen__1');
  assert.equal(toNumericBucket(7), '0_10');
  assert.equal(toNumericBucket(999), 'gt_100');
  assert.equal(toTextLengthBucket(''), 'empty');
  assert.equal(toTextLengthBucket('hello world'), '11_30');
});
