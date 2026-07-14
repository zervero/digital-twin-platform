import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import DtSideNav from '../DtSideNav.vue';

const items = [
  { id: 'devices', label: 'Devices' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' },
] as const;

describe('DtSideNav', () => {
  it('mounts and renders item labels', () => {
    const wrapper = mount(DtSideNav, {
      props: { modelValue: 'devices', items: [...items] },
    });

    expect(wrapper.text()).toContain('Devices');
    expect(wrapper.text()).toContain('Users');
    expect(wrapper.text()).toContain('Settings');
  });

  it('marks the active item with aria-current', () => {
    const wrapper = mount(DtSideNav, {
      props: { modelValue: 'users', items: [...items] },
    });

    const links = wrapper.findAll('button');
    expect(links[0].attributes('aria-current')).toBeUndefined();
    expect(links[1].attributes('aria-current')).toBe('page');
  });

  it('emits update:modelValue and select when an item is clicked', async () => {
    const wrapper = mount(DtSideNav, {
      props: { modelValue: 'devices', items: [...items] },
    });

    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['users']);
    expect(wrapper.emitted('select')?.[0]).toEqual(['users']);
  });

  it('accepts activeId as an alias for the selected item', () => {
    const wrapper = mount(DtSideNav, {
      props: { activeId: 'settings', items: [...items] },
    });

    const links = wrapper.findAll('button');
    expect(links[2].attributes('aria-current')).toBe('page');
  });

  it('exposes a navigation landmark', () => {
    const wrapper = mount(DtSideNav, {
      props: { modelValue: 'devices', items: [...items] },
    });

    expect(wrapper.find('nav').exists()).toBe(true);
  });
});
