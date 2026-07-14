import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope, nextTick } from 'vue';

import type { ApiClient } from '@dt/api-client';
import type { LoginResponse, MeResponse, User } from '@dt/contracts';

import { ApiClientKey } from '../../stores/api-store.js';
import { useAdminUsers } from '../useAdminUsers.js';

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
    listUsers: async () => ({ users: [] }),
    setUserRoles: async (_id, req) => ({
      user: { id: 'u1', displayName: 'Ada', email: 'ada@x', roles: req.roles },
    }),
    listAuditEvents: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    ...overrides,
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

describe('useAdminUsers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads users from listUsers', async () => {
    const users: User[] = [
      { id: 'u1', displayName: 'Ada', email: 'ada@x', roles: ['admin'] },
      { id: 'u2', displayName: 'Bob', email: 'bob@x', roles: ['viewer'] },
    ];
    const listUsers = vi.fn(async () => ({ users }));
    const handle = withApi(fakeApiClient({ listUsers }), () => useAdminUsers());
    await handle.refresh();
    expect(listUsers).toHaveBeenCalled();
    expect(handle.users.value).toEqual(users);
  });

  it('setRoles calls setUserRoles and updates the local list', async () => {
    const setUserRoles = vi.fn(async (id: string, req: { roles: User['roles'] }) => ({
      user: { id, displayName: 'Ada', email: 'ada@x', roles: req.roles },
    }));
    const handle = withApi(
      fakeApiClient({
        listUsers: async () => ({
          users: [{ id: 'u1', displayName: 'Ada', email: 'ada@x', roles: ['admin'] }],
        }),
        setUserRoles,
      }),
      () => useAdminUsers(),
    );
    await handle.refresh();
    await handle.setRoles('u1', ['viewer']);
    await nextTick();
    expect(setUserRoles).toHaveBeenCalledWith('u1', { roles: ['viewer'] });
    expect(handle.users.value[0]?.roles).toEqual(['viewer']);
  });
});
