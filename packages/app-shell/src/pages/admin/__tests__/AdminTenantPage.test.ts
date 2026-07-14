import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, effectScope } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse, Permission } from '@dt/contracts';

import AdminTenantPage from '../AdminTenantPage.vue';
import { ApiClientKey } from '../../../stores/api-store.js';
import { useAuthStore } from '../../../stores/auth-store.js';

function fakeApiClient(): ApiClient {
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
    listUsers: async () => ({ users: [] }),
    setUserRoles: async () => ({
      user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['admin'] },
    }),
    listAuditEvents: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
  };
}

function withApi<T>(client: ApiClient, fn: () => T): T {
  const app = createApp({});
  app.provide(ApiClientKey, client);
  let result!: T;
  effectScope(true).run(() => {
    app.runWithContext(() => {
      result = fn();
    });
  });
  return result;
}

describe('AdminTenantPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders tenant id and session user from the auth store', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const client = fakeApiClient();

    withApi(client, () => {
      const auth = useAuthStore();
      auth.state = {
        kind: 'authenticated',
        session: {
          user: {
            id: 'u1',
            displayName: 'Ada Lovelace',
            email: 'ada@acme.example.com',
            roles: ['admin'],
          },
          token: 't',
          expiresAt: '2026-12-31T00:00:00.000Z',
          tenantId: 'acme-corp',
          permissions: ['admin:users', 'plugin:read'] as Permission[],
        },
      };
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: AdminTenantPage }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(AdminTenantPage, {
      global: {
        plugins: [pinia, router],
        provide: { [ApiClientKey as symbol]: client },
      },
    });

    expect(wrapper.text()).toMatch(/Tenant|租户/);
    expect(wrapper.text()).toContain('acme-corp');
    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.text()).toContain('ada@acme.example.com');
    expect(wrapper.text()).toContain('admin:users');
  });

  it('shows empty state when anonymous', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const client = fakeApiClient();

    withApi(client, () => {
      useAuthStore();
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: AdminTenantPage }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(AdminTenantPage, {
      global: {
        plugins: [pinia, router],
        provide: { [ApiClientKey as symbol]: client },
      },
    });

    expect(wrapper.text()).toMatch(/Not signed in|未登录/);
  });
});
