import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import DtDateRangePicker from '../DtDateRangePicker.vue';

describe('DtDateRangePicker', () => {
  it('defaults to daterange with YYYY-MM-DD', () => {
    const wrapper = mount(DtDateRangePicker, {
      props: { modelValue: null },
    });
    const picker = wrapper.findComponent({ name: 'ElDatePicker' });
    expect(picker.props('type')).toBe('daterange');
    expect(picker.props('valueFormat')).toBe('YYYY-MM-DD');
    expect(wrapper.find('.dt-date-range-picker').exists()).toBe(true);
  });

  it('uses datetimerange for rangeKind datetime', () => {
    const wrapper = mount(DtDateRangePicker, {
      props: { modelValue: null, rangeKind: 'datetime' },
    });
    const picker = wrapper.findComponent({ name: 'ElDatePicker' });
    expect(picker.props('type')).toBe('datetimerange');
    expect(picker.props('valueFormat')).toBe('YYYY-MM-DD HH:mm:ss');
  });
});
