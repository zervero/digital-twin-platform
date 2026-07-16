import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import DtAppCard from '../DtAppCard.vue';

describe('DtAppCard', () => {
  it('mounts and renders title, description, and tag', () => {
    const wrapper = mount(DtAppCard, {
      props: {
        title: 'Telemetry Bridge',
        description: 'Streams device metrics into the twin.',
        tag: 'Official',
      },
    });

    expect(wrapper.text()).toContain('Telemetry Bridge');
    expect(wrapper.text()).toContain('Streams device metrics into the twin.');
    expect(wrapper.text()).toContain('Official');
  });

  it('renders actionLabel as a primary button and emits action on click', async () => {
    const wrapper = mount(DtAppCard, {
      props: {
        title: 'Plugin',
        description: 'Desc',
        actionLabel: 'Install',
      },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0]!.text()).toBe('Install');
    await buttons[0]!.trigger('click');
    expect(wrapper.emitted('action')?.length).toBe(1);
  });

  it('renders the action slot instead of the default button when provided', () => {
    const wrapper = mount(DtAppCard, {
      props: {
        title: 'Plugin',
        description: 'Desc',
        actionLabel: 'Install',
      },
      slots: {
        action: '<button type="button" class="custom-action">Activate</button>',
      },
    });

    expect(wrapper.find('.custom-action').text()).toBe('Activate');
    expect(wrapper.text()).not.toContain('Install');
  });

  it('is presentational: no button when neither actionLabel nor action slot', () => {
    const wrapper = mount(DtAppCard, {
      props: { title: 'Read-only', description: 'No action' },
    });

    expect(wrapper.findAll('button').length).toBe(0);
  });
});
