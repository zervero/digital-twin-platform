/**
 * Map product locale codes (`@dt/i18n`) to Element Plus `Language`
 * packs. Pass the result to `DtConfigProvider`’s Element `locale` prop.
 * See https://element-plus.org/en-US/guide/i18n (ConfigProvider + Day.js).
 */
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';

import en from 'element-plus/es/locale/lang/en';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import type { Language } from 'element-plus/es/locale';

/** Locales the product shell currently ships. */
export type DtUiLocale = 'en' | 'zh-CN';

export function elementLocaleOf(code: DtUiLocale): Language {
  return code === 'zh-CN' ? zhCn : en;
}

/** DatePicker / TimePicker read Day.js locale separately from Element. */
export function applyDayjsLocale(code: DtUiLocale): void {
  dayjs.locale(code === 'zh-CN' ? 'zh-cn' : 'en');
}
