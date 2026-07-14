import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import DtTabs from '../DtTabs.vue';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'telemetry', label: 'Telemetry' },
  { id: 'logs', label: 'Logs', disabled: true },
] as const;

describe('DtTabs', () => {
  it('mounts and renders tab labels', () => {
    const wrapper = mount(DtTabs, {
      props: { modelValue: 'overview', tabs: [...tabs] },
    });

    expect(wrapper.text()).toContain('Overview');
    expect(wrapper.text()).toContain('Telemetry');
    expect(wrapper.text()).toContain('Logs');
  });

  it('marks the active tab with aria-selected', () => {
    const wrapper = mount(DtTabs, {
      props: { modelValue: 'telemetry', tabs: [...tabs] },
    });

    const tabButtons = wrapper.findAll('[role="tab"]');
    expect(tabButtons[0].attributes('aria-selected')).toBe('false');
    expect(tabButtons[1].attributes('aria-selected')).toBe('true');
  });

  it('emits update:modelValue when a non-disabled tab is clicked', async () => {
    const wrapper = mount(DtTabs, {
      props: { modelValue: 'overview', tabs: [...tabs] },
    });

    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['telemetry']);
  });

  it('does not emit when a disabled tab is clicked', async () => {
    const wrapper = mount(DtTabs, {
      props: { modelValue: 'overview', tabs: [...tabs] },
    });

    await wrapper.findAll('[role="tab"]')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('renders default slot content in the tab panel', () => {
    const wrapper = mount(DtTabs, {
      props: { modelValue: 'overview', tabs: [...tabs] },
      slots: { default: '<p class="panel-body">Panel content</p>' },
    });

    expect(wrapper.find('[role="tabpanel"] .panel-body').text()).toBe('Panel content');
  });
});
