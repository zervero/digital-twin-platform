import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import DtDatePicker from '../DtDatePicker.vue';

describe('DtDatePicker', () => {
  it('mounts and forwards v-model updates', async () => {
    const wrapper = mount(DtDatePicker, {
      props: {
        modelValue: '2022-11-20',
        'onUpdate:modelValue': (value: string | null) =>
          wrapper.setProps({ modelValue: value }),
      },
    });

    expect(wrapper.find('.dt-date-picker').exists()).toBe(true);

    const picker = wrapper.findComponent({ name: 'ElDatePicker' });
    expect(picker.exists()).toBe(true);
    await picker.vm.$emit('update:modelValue', '2026-01-15');
    await flushPromises();

    expect(wrapper.props('modelValue')).toBe('2026-01-15');
  });

  it('applies default value-format and allows override', async () => {
    const withDefault = mount(DtDatePicker, {
      props: { modelValue: null },
    });
    expect(
      withDefault.findComponent({ name: 'ElDatePicker' }).props('valueFormat'),
    ).toBe('YYYY-MM-DD');

    const overridden = mount(DtDatePicker, {
      props: { modelValue: null, valueFormat: 'YYYY/MM/DD' },
    });
    expect(
      overridden.findComponent({ name: 'ElDatePicker' }).props('valueFormat'),
    ).toBe('YYYY/MM/DD');
  });

  it('forwards Element props such as type and disabled', () => {
    const wrapper = mount(DtDatePicker, {
      props: {
        modelValue: null,
        type: 'daterange',
        disabled: true,
        placeholder: 'pick',
      },
    });
    const picker = wrapper.findComponent({ name: 'ElDatePicker' });
    expect(picker.props('type')).toBe('daterange');
    expect(picker.props('disabled')).toBe(true);
    expect(picker.props('placeholder')).toBe('pick');
  });

  it('forwards slots to ElDatePicker', () => {
    const wrapper = mount(DtDatePicker, {
      props: { modelValue: null, type: 'daterange' },
      slots: {
        'range-separator': '<span class="sep-slot">to</span>',
      },
    });
    expect(wrapper.find('.sep-slot').exists()).toBe(true);
  });

  it('exposes Element DatePicker methods', async () => {
    const wrapper = mount(DtDatePicker, {
      props: { modelValue: null },
      attachTo: document.body,
    });
    await nextTick();
    const exposed = wrapper.vm as unknown as {
      focus: () => void;
      blur: () => void;
      handleOpen: () => void;
      handleClose: () => void;
    };
    expect(typeof exposed.focus).toBe('function');
    expect(typeof exposed.blur).toBe('function');
    expect(typeof exposed.handleOpen).toBe('function');
    expect(typeof exposed.handleClose).toBe('function');
    wrapper.unmount();
  });
});
