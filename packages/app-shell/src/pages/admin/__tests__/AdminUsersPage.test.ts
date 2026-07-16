import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import AdminUsersPage from '../AdminUsersPage.vue';
import { ApiClientKey } from '../../../stores/api-store.js';

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['admin'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    } satisfies LoginResponse)) as unknown as ApiClient['login'],
    logout: async () => undefined,
    setAuthToken: () => undefined,
    getAuthToken: () => 't',
    getHealth: async () => ({ ok: true }),
    getDevices: async () => [],
    getScene: async () => ({ id: 'x', tenantId: 'acme-corp', name: 'x', nodes: [] }),
    sendCommand: async () => ({ accepted: true as const, commandId: 'c' }),
    listUsers: async () => ({
      users: [
        { id: 'u1', displayName: 'Ada Lovelace', email: 'ada@acme.example.com', roles: ['admin'] },
        { id: 'u2', displayName: 'Bob', email: 'bob@acme.example.com', roles: ['viewer'] },
      ],
    }),
    setUserRoles: async () => ({
      user: { id: 'u2', displayName: 'Bob', email: 'bob@acme.example.com', roles: ['operator'] },
    }),
    listAuditEvents: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    ...overrides,
  };
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('lists users from the api client', async () => {
    const listUsers = vi.fn(async () => ({
      users: [
        { id: 'u1', displayName: 'Ada Lovelace', email: 'ada@acme.example.com', roles: ['admin' as const] },
      ],
    }));
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: AdminUsersPage }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(AdminUsersPage, {
      global: {
        plugins: [pinia, router],
        provide: { [ApiClientKey as symbol]: fakeApiClient({ listUsers }) },
      },
    });
    await flushPromises();

    expect(listUsers).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.text()).toMatch(/Users|用户/);
  });
});
