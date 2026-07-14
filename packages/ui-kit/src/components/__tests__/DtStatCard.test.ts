import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import DtStatCard from '../DtStatCard.vue';

describe('DtStatCard', () => {
  it('mounts and renders label and value', () => {
    const wrapper = mount(DtStatCard, {
      props: { label: 'Online', value: '128' },
    });

    expect(wrapper.text()).toContain('Online');
    expect(wrapper.text()).toContain('128');
  });

  it('renders optional hint text', () => {
    const wrapper = mount(DtStatCard, {
      props: { label: 'Latency', value: '42ms', hint: 'p95 last hour' },
    });

    expect(wrapper.text()).toContain('p95 last hour');
  });

  it('renders optional trend label', () => {
    const wrapper = mount(DtStatCard, {
      props: {
        label: 'Alarms',
        value: 3,
        trend: 'up',
        trendLabel: '+2',
      },
    });

    expect(wrapper.text()).toContain('+2');
    expect(wrapper.find('[data-trend="up"]').exists()).toBe(true);
  });

  it('is presentational: no interactive controls by default', () => {
    const wrapper = mount(DtStatCard, {
      props: { label: 'Devices', value: 10 },
    });

    expect(wrapper.findAll('button').length).toBe(0);
    expect(wrapper.findAll('a').length).toBe(0);
  });
});
