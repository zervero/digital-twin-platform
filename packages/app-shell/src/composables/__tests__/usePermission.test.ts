import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope } from 'vue';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse } from '@dt/contracts';

import { ApiClientKey } from '../../stores/api-store.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useCurrentUser } from '../useCurrentUser.js';
import { usePermission } from '../usePermission.js';

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

beforeEach(() => {
  setActivePinia(createPinia());
  sessionStorage.clear();
});

describe('useAuthStore + composables', () => {
  it('usePermission is false for an anonymous viewer', () => {
    withApi(fakeApiClient(), () => {
      const can = usePermission('device:write');
      expect(can.value).toBe(false);
    });
  });

  it('login() promotes state to authenticated and exposes permissions', async () => {
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
      expect(store.state.kind).toBe('authenticated');
      const user = useCurrentUser();
      expect(user.value?.email).toBe('u@x');
      const can = usePermission('device:write');
      expect(can.value).toBe(true);
    });
  });

  it('logout() returns to anonymous', async () => {
    const client = fakeApiClient();
    await withApi(client, async () => {
      const store = useAuthStore();
      await store.login('u@x');
      await store.logout();
      expect(store.state.kind).toBe('anonymous');
    });
  });

  it('refresh() rehydrates a session from a stored token', async () => {
    const login = vi.fn(async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 'stored-token',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    } satisfies LoginResponse));
    const getMe = vi.fn<() => Promise<MeResponse>>(async () => ({
      session: {
        user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 'stored-token',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    }));
    const setAuthToken = vi.fn();
    sessionStorage.setItem('dt:auth:token', 'stored-token');
    const client = fakeApiClient({ login: login as unknown as ApiClient['login'], getMe, setAuthToken });
    await withApi(client, async () => {
      const store = useAuthStore();
      await store.refresh();
      expect(setAuthToken).toHaveBeenCalledWith('stored-token');
      expect(store.state.kind).toBe('authenticated');
      expect(getMe).toHaveBeenCalledOnce();
    });
  });

  it('refresh() drops the token when /me returns null', async () => {
    sessionStorage.setItem('dt:auth:token', 'stale');
    const getMe = vi.fn<() => Promise<MeResponse>>(async () => ({ session: null }));
    const setAuthToken = vi.fn();
    const client = fakeApiClient({ getMe, setAuthToken });
    await withApi(client, async () => {
      const store = useAuthStore();
      await store.refresh();
      expect(setAuthToken).toHaveBeenLastCalledWith(null);
      expect(sessionStorage.getItem('dt:auth:token')).toBeNull();
    });
  });
});
