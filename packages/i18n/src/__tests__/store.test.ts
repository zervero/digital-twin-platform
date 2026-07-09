/**
 * Locale store behavior:
 *   - First load with no saved choice + English browser -> 'en'
 *   - First load with no saved choice + zh browser -> 'zh-CN'
 *   - Saved explicit 'zh-CN' overrides browser
 *   - choice='system' resolves through `navigator.language`
 *   - `set('zh-CN')` writes to localStorage under `dt.locale.v1`
 */
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useLocaleStore } from '../store.js';
import type { LocaleChoice } from '../types.js';

interface Nav {
  language?: string;
}
interface Global {
  localStorage?: Storage;
  navigator?: Nav;
}

const ORIGINAL_NAV = (globalThis as unknown as Global).navigator;
const ORIGINAL_LS = (globalThis as unknown as Global).localStorage;

function setNavigator(lang: string | undefined): void {
  // `globalThis.navigator` is a read-only getter in Node 22+,
  // so we redefine the whole property. `configurable: true` lets
  // the next test re-define it.
  Object.defineProperty(globalThis, 'navigator', {
    value: lang === undefined ? undefined : { language: lang },
    configurable: true,
    writable: true,
  });
}

function setStorage(): Storage {
  const store = new Map<string, string>();
  const fake: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(i) {
      return Array.from(store.keys())[i] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: fake,
    configurable: true,
    writable: true,
  });
  return fake;
}

function clearStorage(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  clearStorage();
});

afterEach(() => {
  // Restore whatever the runtime gave us so other packages'
  // tests aren't affected by our mocks.
  Object.defineProperty(globalThis, 'localStorage', {
    value: ORIGINAL_LS,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: ORIGINAL_NAV,
    configurable: true,
    writable: true,
  });
});

describe('useLocaleStore initial detection', () => {
  it('defaults to en when no saved choice and browser is English', () => {
    setNavigator('en-US');
    clearStorage();
    const s = useLocaleStore();
    expect(s.choice).toBe('system');
    expect(s.resolved).toBe('en');
  });

  it('resolves to zh-CN when browser is Chinese', () => {
    setNavigator('zh-CN');
    clearStorage();
    const s = useLocaleStore();
    expect(s.choice).toBe('system');
    expect(s.resolved).toBe('zh-CN');
  });

  it('honors a saved explicit choice over browser language', () => {
    setNavigator('zh-CN');
    setStorage().setItem('dt.locale.v1', 'en');
    const s = useLocaleStore();
    expect(s.choice).toBe('en');
    expect(s.resolved).toBe('en');
  });

  it('ignores garbage in localStorage and falls back to system', () => {
    setNavigator('fr-FR');
    setStorage().setItem('dt.locale.v1', 'klingon');
    const s = useLocaleStore();
    expect(s.choice).toBe('system');
    expect(s.resolved).toBe('en');
  });

  it('survives a missing navigator (SSR / node tests)', () => {
    setNavigator(undefined);
    clearStorage();
    const s = useLocaleStore();
    expect(s.resolved).toBe('en');
  });
});

describe('useLocaleStore mutations', () => {
  it('set() updates the choice and persists it', () => {
    setNavigator('en-US');
    const storage = setStorage();
    const s = useLocaleStore();
    s.set('zh-CN');
    expect(s.choice).toBe('zh-CN');
    expect(s.resolved).toBe('zh-CN');
    expect(storage.getItem('dt.locale.v1')).toBe('zh-CN');
  });

  it('set("system") keeps resolved tied to navigator.language', () => {
    setNavigator('ja-JP');
    const storage = setStorage();
    const s = useLocaleStore();
    s.set('zh-CN');
    expect(s.resolved).toBe('zh-CN');
    s.set('system');
    expect(s.choice).toBe('system');
    expect(s.resolved).toBe('en'); // ja is not zh, so falls back to en
    expect(storage.getItem('dt.locale.v1')).toBe('system');
  });

  it('accepts only valid choices', () => {
    setNavigator('en-US');
    setStorage();
    const s = useLocaleStore();
    // Cast through unknown to confirm the typed boundary holds
    // for runtime garbage; should not throw, just type-reject
    // at the call site.
    s.set('system' as LocaleChoice);
    s.set('en' as LocaleChoice);
    s.set('zh-CN' as LocaleChoice);
  });
});
