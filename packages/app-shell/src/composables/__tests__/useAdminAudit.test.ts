import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, effectScope } from 'vue';

import type { ApiClient } from '@dt/api-client';
import type { AuditEvent, LoginResponse, MeResponse } from '@dt/contracts';

import { ApiClientKey } from '../../stores/api-store.js';
import { useAdminAudit } from '../useAdminAudit.js';

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
    setUserRoles: async () => ({
      user: { id: 'u', displayName: 'u', email: 'u@x', roles: ['admin'] },
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

describe('useAdminAudit', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads audit events and forwards type filter', async () => {
    const event: AuditEvent = {
      id: 'e1',
      tenantId: 'acme-corp',
      type: 'plugin.publish',
      createdAt: '2026-07-14T00:00:00.000Z',
      actorUserId: 'u',
      actorEmail: 'admin@x',
      summary: 'Published hello-plugin@1.0.0',
    };
    const listAuditEvents = vi.fn(async () => ({
      items: [event],
      total: 1,
      page: 1,
      pageSize: 20,
    }));
    const handle = withApi(fakeApiClient({ listAuditEvents }), () => useAdminAudit());
    await handle.refresh();
    expect(listAuditEvents).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      type: undefined,
    });
    expect(handle.items.value).toEqual([event]);

    handle.typeFilter.value = 'plugin.publish';
    await handle.refresh();
    expect(listAuditEvents).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      type: 'plugin.publish',
    });
  });
});
