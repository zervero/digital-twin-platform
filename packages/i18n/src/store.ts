/**
 * Locale state lives in a Pinia store so it composes with
 * the rest of `@dt/app-shell` (which already uses Pinia for
 * scene, device, plugin stores). The store persists the
 * *choice* (`system` / `en` / `zh-CN`) to `localStorage`;
 * the *resolved* locale is a computed view of choice +
 * `navigator.language`.
 *
 * The store deliberately swallows the case where
 * `localStorage` or `navigator` are undefined (SSR, tests
 * without happy-dom) so the same code path runs everywhere.
 */
import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import type { LocaleChoice, LocaleCode } from './types.js';

const STORAGE_KEY = 'dt.locale.v1';
const ZH_RE = /^zh/i;

function hasStorage(): boolean {
  return typeof globalThis !== 'undefined'
    && typeof (globalThis as { localStorage?: Storage }).localStorage !== 'undefined';
}

function hasNavigator(): boolean {
  return typeof globalThis !== 'undefined'
    && typeof (globalThis as { navigator?: { language?: string } }).navigator !== 'undefined';
}

function readSaved(): LocaleChoice | null {
  if (!hasStorage()) return null;
  const v = globalThis.localStorage.getItem(STORAGE_KEY);
  if (v === 'system' || v === 'en' || v === 'zh-CN') return v;
  return null;
}

function detectBrowser(): LocaleCode {
  if (!hasNavigator()) return 'en';
  const lang = globalThis.navigator.language ?? 'en';
  return ZH_RE.test(lang) ? 'zh-CN' : 'en';
}

function initialChoice(): LocaleChoice {
  return readSaved() ?? 'system';
}

function initialResolved(choice: LocaleChoice): LocaleCode {
  return choice === 'system' ? detectBrowser() : choice;
}

export const useLocaleStore = defineStore('dt.locale', () => {
  const choice = ref<LocaleChoice>(initialChoice());
  const resolved = computed<LocaleCode>(() =>
    choice.value === 'system' ? detectBrowser() : choice.value,
  );

  function set(next: LocaleChoice): void {
    choice.value = next;
    if (hasStorage()) {
      globalThis.localStorage.setItem(STORAGE_KEY, next);
    }
  }

  /**
   * Test-only escape hatch: re-run the initial detection
   * logic so a unit test can flip the global navigator /
   * localStorage and assert the store re-reads them.
   */
  function _resetForTests(): void {
    const c = initialChoice();
    choice.value = c;
    // resolved is computed; first read triggers the new branch
    void initialResolved(c);
  }

  return { choice, resolved, set, _resetForTests };
});
