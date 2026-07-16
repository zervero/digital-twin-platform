import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppearanceStore, APPEARANCE_STORAGE_KEY } from '../appearance-store.js';
import { ACCENT_PRESETS } from '../../theme/accent-presets.js';

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});

describe('useAppearanceStore', () => {
  it(`hydrates accentId from localStorage key ${APPEARANCE_STORAGE_KEY}`, () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ accentId: 'teal' }),
    );
    const store = useAppearanceStore();
    store.hydrate();
    expect(store.accentId).toBe('teal');
    expect(store.customHex).toBeNull();
  });

  it('hydrates customHex from localStorage', () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ customHex: '#1D4ED8' }),
    );
    const store = useAppearanceStore();
    store.hydrate();
    expect(store.customHex).toBe('#1D4ED8');
    expect(store.accentId).toBeNull();
  });

  it('setPreset updates accentId, clears customHex, and persists', () => {
    const store = useAppearanceStore();
    const preset = ACCENT_PRESETS.find((p) => p.id === 'indigo');
    expect(preset).toBeDefined();

    store.setPreset('indigo');
    expect(store.accentId).toBe('indigo');
    expect(store.customHex).toBeNull();
    expect(store.primary).toBe(preset!.primary);

    const saved = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!);
    expect(saved).toEqual({ accentId: 'indigo' });
  });

  it('setCustom rejects unusable colors without mutating state', () => {
    const store = useAppearanceStore();
    store.setPreset('blue');
    const before = {
      accentId: store.accentId,
      customHex: store.customHex,
      primary: store.primary,
    };

    const ok = store.setCustom('#EEEEEE');
    expect(ok).toBe(false);
    expect(store.accentId).toBe(before.accentId);
    expect(store.customHex).toBe(before.customHex);
    expect(store.primary).toBe(before.primary);
  });

  it('setCustom accepts usable colors, clears accentId, and persists', () => {
    const store = useAppearanceStore();
    const ok = store.setCustom('#1D4ED8');
    expect(ok).toBe(true);
    expect(store.customHex).toBe('#1D4ED8');
    expect(store.accentId).toBeNull();
    expect(store.primary).toBe('#1D4ED8');

    const saved = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!);
    expect(saved).toEqual({ customHex: '#1D4ED8' });
  });
});
