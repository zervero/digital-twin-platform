import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import { ApiClientKey } from '../../stores/api-store.js';
import OpsWorkspace from '../OpsWorkspace.vue';

function fakeApiClient(): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
        tenantId: 'acme-corp',
      },
    } satisfies LoginResponse)) as unknown as ApiClient['login'],
    logout: async () => undefined,
    setAuthToken: () => undefined,
    getHealth: async () => ({ ok: true }),
    getDevices: async () => [],
    getScene: async () => ({ id: 'x', tenantId: 'acme-corp', name: 'x', nodes: [] }),
    sendCommand: async () => ({ accepted: true as const, commandId: 'c' }),
  } as unknown as ApiClient;
}

function mountOps() {
  return mount(OpsWorkspace, {
    global: {
      plugins: [createPinia()],
      provide: { [ApiClientKey as symbol]: fakeApiClient() },
      stubs: {
        SceneViewport: true,
        DeviceTreePanel: true,
      },
    },
  });
}

describe('OpsWorkspace push drawers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('collapses and expands the left rail', async () => {
    const wrapper = mountOps();
    await flushPromises();

    const body = wrapper.find('.ops-workspace__body');
    expect(body.classes()).not.toContain('is-sidebar-collapsed');
    expect(wrapper.find('[data-testid="ops-sidebar-collapse"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ops-sidebar-expand"]').exists()).toBe(false);

    await wrapper.get('[data-testid="ops-sidebar-collapse"]').trigger('click');
    expect(body.classes()).toContain('is-sidebar-collapsed');
    expect(wrapper.find('[data-testid="ops-sidebar-expand"]').exists()).toBe(true);

    await wrapper.get('[data-testid="ops-sidebar-expand"]').trigger('click');
    expect(body.classes()).not.toContain('is-sidebar-collapsed');
  });

  it('collapses and expands the right detail drawer', async () => {
    const wrapper = mountOps();
    await flushPromises();

    const body = wrapper.find('.ops-workspace__body');
    expect(body.classes()).not.toContain('is-detail-collapsed');
    expect(wrapper.find('[data-testid="ops-detail-collapse"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ops-detail-expand"]').exists()).toBe(false);

    await wrapper.get('[data-testid="ops-detail-collapse"]').trigger('click');
    expect(body.classes()).toContain('is-detail-collapsed');
    expect(wrapper.find('[data-testid="ops-detail-expand"]').exists()).toBe(true);

    await wrapper.get('[data-testid="ops-detail-expand"]').trigger('click');
    expect(body.classes()).not.toContain('is-detail-collapsed');
  });

  it('restores collapsed rails from localStorage on mount', async () => {
    localStorage.setItem(
      'dt.ops.layout.v1',
      JSON.stringify({ sidebarOpen: false, detailOpen: false }),
    );
    const wrapper = mountOps();
    await flushPromises();

    const body = wrapper.find('.ops-workspace__body');
    expect(body.classes()).toContain('is-sidebar-collapsed');
    expect(body.classes()).toContain('is-detail-collapsed');
    expect(wrapper.find('[data-testid="ops-sidebar-expand"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ops-detail-expand"]').exists()).toBe(true);
  });
});
