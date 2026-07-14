import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse, Permission } from '@dt/contracts';

import AdminMarketplacePage from '../AdminMarketplacePage.vue';
import { ApiClientKey } from '../../../stores/api-store.js';
import { useAuthStore } from '../../../stores/auth-store.js';
import { BffBaseUrlKey } from '../../../composables/useOIDCStart.js';

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

describe('AdminMarketplacePage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the marketplace title, filter tabs, and catalog cards', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/plugins') || /\/api\/plugins$/.test(url)) {
        return new Response(
          JSON.stringify([
            {
              id: 'hello-plugin',
              name: 'Hello',
              vendor: 'Digital Twin',
              versions: [
                {
                  pluginId: 'hello-plugin',
                  version: '1.0.0',
                  publishedAt: '2026-01-01T00:00:00.000Z',
                  manifest: { description: 'Demo plugin' },
                },
              ],
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.includes('/installed')) {
        return new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchImpl);

    const pinia = createPinia();
    setActivePinia(pinia);
    const client = fakeApiClient();

    withApi(client, () => {
      const auth = useAuthStore();
      auth.state = {
        kind: 'authenticated',
        session: {
          user: {
            id: 'u',
            displayName: 'Admin',
            email: 'a@x',
            roles: ['admin'],
          },
          token: 't',
          expiresAt: '2026-12-31T00:00:00.000Z',
          tenantId: 'acme-corp',
          permissions: ['plugin:install', 'plugin:publish', 'plugin:read'] as Permission[],
        },
      };
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: AdminMarketplacePage }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(AdminMarketplacePage, {
      global: {
        plugins: [pinia, router],
        provide: {
          [ApiClientKey as symbol]: client,
          [BffBaseUrlKey as symbol]: 'http://localhost:3001',
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toMatch(/App marketplace|应用市场/);
    expect(wrapper.text()).toMatch(/All|全部/);
    expect(wrapper.text()).toContain('Hello');

    vi.unstubAllGlobals();
  });
});
