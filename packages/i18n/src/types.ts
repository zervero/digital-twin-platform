/**
 * Locale surface (the public set of locale codes we ship).
 * Adding a new locale = a new entry in `LocaleCode` +
 * a new dictionary in `locales/<code>/` + a new entry in
 * the `TABLES` map inside `composable.ts`. The completeness
 * test (`dictionary-completeness.test.ts`) is the gate that
 * fails when the dictionaries drift.
 */
export type LocaleCode = 'en' | 'zh-CN';

/**
 * User-facing choice: `system` follows the browser language
 * (resolved to a `LocaleCode`); the two literal codes pin the
 * locale regardless of browser settings.
 */
export type LocaleChoice = 'system' | LocaleCode;

/**
 * `Dictionary` is the structural shape of a merged locale
 * tree. `lookup(dict, 'a.b.c')` walks it.
 */
export type Dictionary = Record<string, unknown>;
