/**
 * `useI18n()` behavior:
 *   - `t(key)` returns the localized string for the active locale
 *   - `t(key, vars)` interpolates `{name}` placeholders
 *   - `t(unknownKey)` returns the key itself (no throw)
 *   - Switching locale flips the resolved value reactively
 */
import { beforeEach, describe, it, expect } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import { useLocaleStore } from '../store.js';
import { useI18n } from '../composable.js';

interface Nav {
  language?: string;
}
interface Global {
  localStorage?: Storage;
  navigator?: Nav;
}

function setNavigator(lang: string): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: lang },
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
  delete (globalThis as unknown as Global).localStorage;
  setNavigator('en-US');
});

describe('useI18n()', () => {
  it('returns the English string under default locale', () => {
    setNavigator('en-US');
    const { t } = useI18n();
    expect(t('device.title')).toBe('Devices');
    expect(t('device.empty')).toBe('No devices yet');
    expect(t('device.drawer.tabs.overview')).toBe('Overview');
    expect(t('device.drawer.emptyTitle')).toBe('No device selected');
    expect(t('common.loading')).toBe('Loading…');
  });

  it('returns the Chinese string when resolved is zh-CN', () => {
    setNavigator('zh-CN');
    const store = useLocaleStore();
    store.set('zh-CN');
    const { t } = useI18n();
    expect(t('device.title')).toBe('设备');
    expect(t('device.empty')).toBe('暂无设备');
    expect(t('device.drawer.tabs.overview')).toBe('概览');
    expect(t('device.drawer.emptyTitle')).toBe('未选择设备');
    expect(t('common.loading')).toBe('加载中…');
    expect(t('marketplace.install')).toBe('安装');
    expect(t('marketplace.uninstall')).toBe('卸载');
  });

  it('interpolates {placeholders} with vars', () => {
    setNavigator('en-US');
    const { t } = useI18n();
    expect(
      t('marketplace.installHint', { permission: 'plugin:publish' }),
    ).toBe('Publishing requires the plugin:publish permission.');
  });

  it('interpolates Chinese strings too', () => {
    setNavigator('zh-CN');
    const store = useLocaleStore();
    store.set('zh-CN');
    const { t } = useI18n();
    expect(
      t('marketplace.installHint', { permission: 'plugin:publish' }),
    ).toBe('发布插件需要 plugin:publish 权限。');
  });

  it('returns the key itself when the key is missing (no throw)', () => {
    const { t } = useI18n();
    expect(t('nonexistent.key')).toBe('nonexistent.key');
    expect(t('a.b.c.d.e')).toBe('a.b.c.d.e');
  });

  it('leaves unknown placeholders visible (better than empty)', () => {
    const { t } = useI18n();
    expect(t('marketplace.installHint')).toBe(
      'Publishing requires the {permission} permission.',
    );
  });

  it('exposes the active locale and available list', () => {
    const i18n = useI18n();
    expect(i18n.available).toEqual(['en', 'zh-CN']);
    expect(i18n.locale.value).toBe('en');
  });

  it('switches reactively when the store changes', () => {
    const i18n = useI18n();
    const store = useLocaleStore();
    expect(i18n.t('auth.logout')).toBe('Logout');
    store.set('zh-CN');
    expect(i18n.t('auth.logout')).toBe('退出');
  });

  it('resolves nested keys (scene.toolbar.reset)', () => {
    const { t } = useI18n();
    expect(t('scene.toolbar.reset')).toBe('Clear selection');
    const store = useLocaleStore();
    store.set('zh-CN');
    expect(t('scene.toolbar.reset')).toBe('清除选择');
  });
});
