/**
 * useAppearanceStore — accent + color mode preferences (SPEC 0002).
 *
 * Persists to localStorage under `dt.appearance.v1`. Custom accent colors
 * are rejected when they are too light for white primary-button labels.
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
import {
  applyResolvedTheme,
  DEFAULT_COLOR_MODE,
  isColorMode,
  readPrefersDark,
  resolveColorMode,
  type ColorMode,
  type ResolvedColorMode,
} from '../theme/apply-theme.js';

export const APPEARANCE_STORAGE_KEY = 'dt.appearance.v1';

interface AppearancePersisted {
  accentId?: string | null;
  customHex?: string | null;
  colorMode?: ColorMode;
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

export const useAppearanceStore = defineStore('dt:appearance', () => {
  const accentId = ref<string | null>(DEFAULT_ACCENT_ID);
  const customHex = ref<string | null>(null);
  const colorMode = ref<ColorMode>(DEFAULT_COLOR_MODE);
  /** Shared chrome: left admin nav + user menu open the same dialog. */
  const dialogOpen = ref(false);

  let mediaQuery: MediaQueryList | null = null;
  let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

  function openDialog(): void {
    dialogOpen.value = true;
  }

  function closeDialog(): void {
    dialogOpen.value = false;
  }

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

  const resolvedColorMode = computed<ResolvedColorMode>(() =>
    resolveColorMode(colorMode.value, readPrefersDark(mediaQuery)),
  );

  function persist(): void {
    const payload: AppearancePersisted = {
      colorMode: colorMode.value,
    };
    if (customHex.value) {
      payload.customHex = customHex.value;
    } else if (accentId.value) {
      payload.accentId = accentId.value;
    }
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(payload));
  }

  function syncDomTheme(): void {
    applyResolvedTheme(resolvedColorMode.value);
  }

  function detachSystemListener(): void {
    if (mediaQuery && mediaListener) {
      mediaQuery.removeEventListener('change', mediaListener);
    }
    mediaListener = null;
  }

  function attachSystemListener(): void {
    detachSystemListener();
    if (typeof window === 'undefined') return;
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (colorMode.value !== 'system') return;
    mediaListener = () => {
      syncDomTheme();
    };
    mediaQuery.addEventListener('change', mediaListener);
  }

  function hydrate(): void {
    const saved = readPersisted();
    if (saved && isColorMode(saved.colorMode)) {
      colorMode.value = saved.colorMode;
    }

    if (saved) {
      if (typeof saved.customHex === 'string' && saved.customHex) {
        if (isAccentUsable(saved.customHex)) {
          customHex.value = saved.customHex;
          accentId.value = null;
        }
      } else if (
        typeof saved.accentId === 'string' &&
        findAccentPreset(saved.accentId)
      ) {
        accentId.value = saved.accentId;
        customHex.value = null;
      }
    }

    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    }
    attachSystemListener();
    syncDomTheme();
  }

  function setColorMode(mode: ColorMode): boolean {
    if (!isColorMode(mode)) return false;
    colorMode.value = mode;
    persist();
    attachSystemListener();
    syncDomTheme();
    return true;
  }

  function setPreset(id: string): boolean {
    if (!findAccentPreset(id)) return false;
    accentId.value = id;
    customHex.value = null;
    persist();
    return true;
  }

  function setCustom(hex: string): boolean {
    const normalized = hex.trim();
    if (!isAccentUsable(normalized)) return false;
    customHex.value = normalized;
    accentId.value = null;
    persist();
    return true;
  }

  return {
    accentId,
    customHex,
    colorMode,
    resolvedColorMode,
    dialogOpen,
    primary,
    hover,
    hydrate,
    setColorMode,
    setPreset,
    setCustom,
    openDialog,
    closeDialog,
  };
});
