import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import DtDialog from '../DtDialog.vue';

describe('DtDialog', () => {
  it('does not render when closed', () => {
    const wrapper = mount(DtDialog, {
      props: { open: false, title: 'Settings' },
      attachTo: document.body,
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('renders title and body when open', async () => {
    const wrapper = mount(DtDialog, {
      props: { open: true, title: 'Appearance' },
      slots: { default: '<p>Dialog body</p>' },
      attachTo: document.body,
    });
    await nextTick();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('Appearance');
    expect(dialog!.textContent).toContain('Dialog body');
    wrapper.unmount();
  });

  it('emits update:open false on backdrop click', async () => {
    const wrapper = mount(DtDialog, {
      props: { open: true, title: 'Appearance' },
      attachTo: document.body,
    });
    await nextTick();
    document.querySelector<HTMLElement>('[data-testid="dt-dialog-backdrop"]')!.click();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('emits update:open false on close button click', async () => {
    const wrapper = mount(DtDialog, {
      props: { open: true, title: 'Appearance' },
      attachTo: document.body,
    });
    await nextTick();
    document.querySelector<HTMLElement>('[data-testid="dt-dialog-close"]')!.click();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
    wrapper.unmount();
  });
});
