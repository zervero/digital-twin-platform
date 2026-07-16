import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';

import DtToolStrip from '../DtToolStrip.vue';

const items = [
  { id: 'orbit', icon: 'Orbit' as const, ariaLabel: 'Orbit camera' },
  { id: 'pan', icon: 'Move' as const, ariaLabel: 'Pan camera' },
  { id: 'fit', icon: 'Maximize2' as const, ariaLabel: 'Fit view', disabled: true },
];

describe('DtToolStrip', () => {
  it('mounts and renders a button per item', () => {
    const wrapper = mount(DtToolStrip, {
      props: { items },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(3);
  });

  it('requires and applies aria-label on every button', () => {
    const wrapper = mount(DtToolStrip, {
      props: { items },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[0]!.attributes('aria-label')).toBe('Orbit camera');
    expect(buttons[1]!.attributes('aria-label')).toBe('Pan camera');
    expect(buttons[2]!.attributes('aria-label')).toBe('Fit view');
  });

  it('emits select with the item id when a non-disabled button is clicked', async () => {
    const wrapper = mount(DtToolStrip, {
      props: { items },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(3);
    await buttons[1]!.trigger('click');
    expect(wrapper.emitted('select')?.[0]).toEqual(['pan']);
  });

  it('does not emit when a disabled button is clicked', async () => {
    const wrapper = mount(DtToolStrip, {
      props: { items },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(3);
    await buttons[2]!.trigger('click');
    expect(wrapper.emitted('select')).toBeUndefined();
  });

  it('marks the active item when activeId is set', () => {
    const wrapper = mount(DtToolStrip, {
      props: { items, activeId: 'orbit' },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[0]!.classes()).toContain('dt-tool-strip__btn--active');
    expect(buttons[1]!.classes()).not.toContain('dt-tool-strip__btn--active');
  });
});
