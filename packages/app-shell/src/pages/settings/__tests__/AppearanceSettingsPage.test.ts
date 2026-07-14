import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import AppearanceSettingsPage from '../AppearanceSettingsPage.vue';
import { useAppearanceStore } from '../../../stores/appearance-store.js';
import { ACCENT_PRESETS } from '../../../theme/accent-presets.js';

describe('AppearanceSettingsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('applies a preset and persists via appearance-store', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: AppearanceSettingsPage }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(AppearanceSettingsPage, {
      global: { plugins: [pinia, router] },
    });

    const teal = ACCENT_PRESETS.find((p) => p.id === 'teal');
    expect(teal).toBeDefined();

    const swatch = wrapper
      .findAll('button.appearance-settings__swatch')
      .find((b) => b.attributes('aria-label') === teal!.label);
    expect(swatch).toBeDefined();
    await swatch!.trigger('click');
    await flushPromises();

    const store = useAppearanceStore();
    expect(store.accentId).toBe('teal');
    expect(store.customHex).toBeNull();
    expect(document.documentElement.style.getPropertyValue('--dt-accent-primary')).toBe(
      teal!.primary,
    );
  });

  it('rejects a low-contrast custom color with an inline error', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: AppearanceSettingsPage }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(AppearanceSettingsPage, {
      global: { plugins: [pinia, router] },
    });

    const store = useAppearanceStore();
    store.setPreset('blue');

    const hexInput = wrapper.find('input.appearance-settings__hex');
    await hexInput.setValue('#EEEEEE');
    await wrapper.findAll('button').find((b) => /Apply custom|应用自定义/.test(b.text()))!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(store.accentId).toBe('blue');
    expect(store.customHex).toBeNull();
  });
});
