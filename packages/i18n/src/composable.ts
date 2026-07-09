/**
 * `useI18n` is the only API app-shell components need. It
 * returns a reactive `{ t, locale, choice, setLocale, available }`
 * and resolves keys against the dictionary of the currently
 * active locale.
 *
 * `t(key, vars?)` behavior:
 *   - Missing key: returns the key itself (no throw). This
 *     keeps the UI rendering during incremental dictionary
 *     work; the dictionary-completeness test is the gate
 *     that catches gaps in CI, not runtime.
 *   - Interpolation: `{name}` placeholders, replaced from
 *     the `vars` record. Unknown placeholders are left as
 *     `{name}` so the missing-var is visible in the UI
 *     (better than silently empty).
 */
import { computed } from 'vue';
import type { ComputedRef } from 'vue';

import { useLocaleStore } from './store.js';
import { en } from './locales/en/index.js';
import { zhCN } from './locales/zh-CN/index.js';
import type { Dictionary, LocaleChoice, LocaleCode } from './types.js';

const TABLES: Record<LocaleCode, Dictionary> = {
  en,
  'zh-CN': zhCN,
};

export const AVAILABLE_LOCALES = ['en', 'zh-CN'] as const satisfies readonly LocaleCode[];

function lookup(dict: Dictionary, key: string): string {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Dictionary)) {
      cur = (cur as Dictionary)[p];
    } else {
      return key;
    }
  }
  return typeof cur === 'string' ? cur : key;
}

function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, k: string) =>
    k in vars ? String(vars[k]) : whole,
  );
}

export interface I18nApi {
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: ComputedRef<LocaleCode>;
  choice: ComputedRef<LocaleChoice>;
  setLocale: (next: LocaleChoice) => void;
  available: typeof AVAILABLE_LOCALES;
}

export function useI18n(): I18nApi {
  const store = useLocaleStore();
  const table = computed<Dictionary>(() => TABLES[store.resolved]);
  const t = (key: string, vars?: Record<string, string | number>): string =>
    interpolate(lookup(table.value, key), vars);
  return {
    t,
    locale: computed(() => store.resolved),
    choice: computed(() => store.choice),
    setLocale: store.set,
    available: AVAILABLE_LOCALES,
  };
}
