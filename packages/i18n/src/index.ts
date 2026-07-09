/**
 * @dt/i18n public surface.
 *
 * Consumers (app-shell, future apps) import from this module
 * only. Internal layout (locales directory, store module,
 * composable module) is implementation detail.
 */
export { useI18n, AVAILABLE_LOCALES } from './composable.js';
export type { I18nApi } from './composable.js';
export { useLocaleStore } from './store.js';
export type { LocaleCode, LocaleChoice, Dictionary } from './types.js';
