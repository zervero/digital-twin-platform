/**
 * useAppearanceStore — user accent preference (presets + custom hex).
 *
 * Persists to localStorage under `dt.appearance.v1`. Custom colors are
 * rejected when they fail WCAG AA contrast against white button labels.
 * Semantic status tokens are never rewritten from this store.
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
  ACCENT_PRESETS,
  DEFAULT_ACCENT_ID,
  findAccentPreset,
} from '../theme/accent-presets.js';
import { isAccentUsable } from '../theme/apply-accent.js';

export const APPEARANCE_STORAGE_KEY = 'dt.appearance.v1';

interface AppearancePersisted {
  accentId?: string | null;
  customHex?: string | null;
}

function readPersisted(): AppearancePersisted | null {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppearancePersisted;
  } catch {
    return null;
  }
}

function writePersisted(value: AppearancePersisted): void {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(value));
}

export const useAppearanceStore = defineStore('dt:appearance', () => {
  const accentId = ref<string | null>(DEFAULT_ACCENT_ID);
  const customHex = ref<string | null>(null);

  const primary = computed(() => {
    if (customHex.value) return customHex.value;
    const preset = findAccentPreset(accentId.value ?? DEFAULT_ACCENT_ID);
    return preset?.primary ?? ACCENT_PRESETS[0]!.primary;
  });

  const hover = computed(() => {
    if (customHex.value) return undefined;
    const preset = findAccentPreset(accentId.value ?? DEFAULT_ACCENT_ID);
    return preset?.hover;
  });

  function hydrate(): void {
    const saved = readPersisted();
    if (!saved) return;

    if (typeof saved.customHex === 'string' && saved.customHex) {
      if (isAccentUsable(saved.customHex)) {
        customHex.value = saved.customHex;
        accentId.value = null;
      }
      return;
    }

    if (typeof saved.accentId === 'string' && findAccentPreset(saved.accentId)) {
      accentId.value = saved.accentId;
      customHex.value = null;
    }
  }

  function setPreset(id: string): boolean {
    if (!findAccentPreset(id)) return false;
    accentId.value = id;
    customHex.value = null;
    writePersisted({ accentId: id });
    return true;
  }

  function setCustom(hex: string): boolean {
    const normalized = hex.trim();
    if (!isAccentUsable(normalized)) return false;
    customHex.value = normalized;
    accentId.value = null;
    writePersisted({ customHex: normalized });
    return true;
  }

  return {
    accentId,
    customHex,
    primary,
    hover,
    hydrate,
    setPreset,
    setCustom,
  };
});
