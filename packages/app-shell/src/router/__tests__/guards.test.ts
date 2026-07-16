import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, effectScope } from 'vue';
import {
  createMemoryHistory,
  createRouter,
  type RouteLocationNormalized,
  type RouteRecordRaw,
} from 'vue-router';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import { ApiClientKey } from '../../stores/api-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { adminNavigationGuard } from '../guards.js';

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getMe: async () => ({ session: null } satisfies MeResponse),
    login: (async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    } satisfies LoginResponse)) as unknown as ApiClient['login'],
    logout: async () => undefined,
    setAuthToken: () => undefined,
    getHealth: async () => ({ ok: true }),
    getDevices: async () => [],
    getScene: async () => ({ id: 'x', tenantId: 'acme-corp', name: 'x', nodes: [] }),
    sendCommand: async () => ({ accepted: true as const, commandId: 'c' }),
    ...overrides,
  } as unknown as ApiClient;
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

function routeTo(
  path: string,
  meta: Record<string, unknown> = {},
): RouteLocationNormalized {
  return {
    path,
    name: undefined,
    params: {},
    query: {},
    hash: '',
    fullPath: path,
    matched: [
      {
        path,
        redirect: undefined,
        name: undefined,
        meta,
        components: {},
        children: [],
        instances: {},
        leaveGuards: new Set(),
        updateGuards: new Set(),
        enterCallbacks: {},
        props: {},
        aliasOf: undefined,
        beforeEnter: undefined,
        mods: {},
      } as unknown as RouteLocationNormalized['matched'][number],
    ],
    meta,
    redirectedFrom: undefined,
  };
}

const from = routeTo('/ops');

beforeEach(() => {
  setActivePinia(createPinia());
  sessionStorage.clear();
});

describe('adminNavigationGuard', () => {
  it('allows /ops for anonymous users', () => {
    withApi(fakeApiClient(), () => {
      const result = adminNavigationGuard(routeTo('/ops'), from);
      expect(result).toBe(true);
    });
  });

  it('redirects /admin to /ops when the user is anonymous', () => {
    withApi(fakeApiClient(), () => {
      const result = adminNavigationGuard(
        routeTo('/admin', { requiresAdmin: true }),
        from,
      );
      expect(result).toEqual({ path: '/ops' });
    });
  });

  it('redirects /admin to /ops when the user is authenticated without admin role', async () => {
    const client = fakeApiClient({
      login: (async () => ({
        session: {
          user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
          token: 't',
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
      } satisfies LoginResponse)) as unknown as ApiClient['login'],
    });
    await withApi(client, async () => {
      const store = useAuthStore();
      await store.login('u@x');
      const result = adminNavigationGuard(
        routeTo('/admin/marketplace', { requiresAdmin: true }),
        from,
      );
      expect(result).toEqual({ path: '/ops' });
    });
  });

  it('allows /admin when the user has the admin role', async () => {
    const client = fakeApiClient({
      login: (async () => ({
        session: {
          user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['admin'] },
          token: 't',
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
      } satisfies LoginResponse)) as unknown as ApiClient['login'],
    });
    await withApi(client, async () => {
      const store = useAuthStore();
      await store.login('u@x');
      const result = adminNavigationGuard(
        routeTo('/admin/marketplace', { requiresAdmin: true }),
        from,
      );
      expect(result).toBe(true);
    });
  });

  it('honours requiresAdmin on matched parent records via the router', async () => {
    const routes: RouteRecordRaw[] = [
      { path: '/ops', component: { template: '<div />' } },
      {
        path: '/admin',
        meta: { requiresAdmin: true },
        component: { template: '<div />' },
        children: [
          { path: 'marketplace', component: { template: '<div />' } },
        ],
      },
    ];
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
    router.beforeEach(adminNavigationGuard);

    const client = fakeApiClient({
      login: (async () => ({
        session: {
          user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['operator'] },
          token: 't',
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
      } satisfies LoginResponse)) as unknown as ApiClient['login'],
    });

    await withApi(client, async () => {
      const store = useAuthStore();
      await store.login('u@x');
      await router.push('/admin/marketplace');
      expect(router.currentRoute.value.path).toBe('/ops');
    });
  });
});
