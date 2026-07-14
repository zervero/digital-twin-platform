import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import DtSegmentedControl from '../DtSegmentedControl.vue';

const options = [
  { value: 'ops', label: 'Ops' },
  { value: 'admin', label: 'Admin' },
  { value: 'dev', label: 'Dev', disabled: true },
] as const;

describe('DtSegmentedControl', () => {
  it('mounts and renders option labels', () => {
    const wrapper = mount(DtSegmentedControl, {
      props: { modelValue: 'ops', options: [...options] },
    });

    expect(wrapper.text()).toContain('Ops');
    expect(wrapper.text()).toContain('Admin');
    expect(wrapper.text()).toContain('Dev');
  });

  it('marks the selected option with aria-pressed', () => {
    const wrapper = mount(DtSegmentedControl, {
      props: { modelValue: 'admin', options: [...options] },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons[0].attributes('aria-pressed')).toBe('false');
    expect(buttons[1].attributes('aria-pressed')).toBe('true');
  });

  it('emits update:modelValue when a non-disabled option is clicked', async () => {
    const wrapper = mount(DtSegmentedControl, {
      props: { modelValue: 'ops', options: [...options] },
    });

    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['admin']);
  });

  it('does not emit when a disabled option is clicked', async () => {
    const wrapper = mount(DtSegmentedControl, {
      props: { modelValue: 'ops', options: [...options] },
    });

    await wrapper.findAll('button')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('uses type=button on option controls', () => {
    const wrapper = mount(DtSegmentedControl, {
      props: { modelValue: 'ops', options: [...options] },
    });

    for (const btn of wrapper.findAll('button')) {
      expect(btn.attributes('type')).toBe('button');
    }
  });
});
