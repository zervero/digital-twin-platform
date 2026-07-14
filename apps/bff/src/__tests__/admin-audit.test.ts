/**
 * Admin audit route tests — V4 T11.
 *
 * Cases:
 *   1. GET /api/admin/audit returns a paginated empty list
 *      for a fresh store.
 *   2. Events recorded for the tenant appear in the list.
 *   3. type= filter narrows results.
 *   4. Pagination respects page / pageSize.
 *   5. Anonymous -> 401; operator -> 403.
 *   6. Events from another tenant are excluded.
 */

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import type { AuthSession, MeResponse, Role } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { createMemoryAuditStore } from '../admin/audit-store.js';
import { adminAuditRoutes } from '../routes/admin-audit.js';

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

class FakeAuthStore implements AuthStore {
  constructor(private readonly tokens: Readonly<Record<string, AuthSession>>) {}
  async login(): Promise<never> {
    throw new Error('FakeAuthStore.login is not callable');
  }
  async getMe(headers: Headers): Promise<MeResponse> {
    const header = headers.get('authorization');
    if (!header) return { session: null };
    const token = header.replace(/^Bearer\s+/i, '').trim();
    const session = this.tokens[token];
    return session ? { session } : { session: null };
  }
  async logout(): Promise<void> {
    // no-op
  }
}

function sessionFor(
  tenantId: string,
  roles: readonly Role[] = ['admin'],
): AuthSession {
  return {
    user: {
      id: `user-${tenantId}`,
      displayName: tenantId,
      email: `${tenantId}@example.com`,
      roles: [...roles],
    },
    token: `tok-${tenantId}-${roles.join('-')}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tenantId,
  };
}

function buildApp(opts?: { roles?: readonly Role[] }): {
  app: Hono;
  token: string;
  auditStore: ReturnType<typeof createMemoryAuditStore>;
} {
  const roles = opts?.roles ?? ['admin'];
  const session = sessionFor('acme-corp', roles);
  const authStore = new FakeAuthStore({ [session.token]: session });
  const auditStore = createMemoryAuditStore();
  const app = new Hono();
  app.route('/api', adminAuditRoutes({ authStore, auditStore }));
  return { app, token: session.token, auditStore };
}

describe('admin audit routes (V4 T11)', () => {
  it('returns an empty paginated list by default', async () => {
    const { app, token } = buildApp();
    const res = await app.request('/api/admin/audit', {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
    };
    expect(body.items).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBeGreaterThan(0);
  });

  it('lists recorded events for the tenant', async () => {
    const { app, token, auditStore } = buildApp();
    auditStore.record({
      tenantId: 'acme-corp',
      type: 'plugin.publish',
      actorUserId: 'user-admin',
      actorEmail: 'admin@acme.example.com',
      summary: 'Published hello-plugin@1.0.0',
    });
    const res = await app.request('/api/admin/audit', {
      headers: authHeaders(token),
    });
    const body = (await res.json()) as { items: Array<{ type: string }>; total: number };
    expect(body.total).toBe(1);
    expect(body.items[0]!.type).toBe('plugin.publish');
  });

  it('filters by type query param', async () => {
    const { app, token, auditStore } = buildApp();
    auditStore.record({
      tenantId: 'acme-corp',
      type: 'plugin.publish',
      actorUserId: 'u1',
      actorEmail: 'a@x',
      summary: 'publish',
    });
    auditStore.record({
      tenantId: 'acme-corp',
      type: 'user.roles_change',
      actorUserId: 'u1',
      actorEmail: 'a@x',
      summary: 'roles',
    });
    const res = await app.request('/api/admin/audit?type=user.roles_change', {
      headers: authHeaders(token),
    });
    const body = (await res.json()) as { items: Array<{ type: string }>; total: number };
    expect(body.total).toBe(1);
    expect(body.items[0]!.type).toBe('user.roles_change');
  });

  it('paginates with page and pageSize', async () => {
    const { app, token, auditStore } = buildApp();
    for (let i = 0; i < 5; i++) {
      auditStore.record({
        tenantId: 'acme-corp',
        type: 'plugin.install',
        actorUserId: 'u1',
        actorEmail: 'a@x',
        summary: `install-${i}`,
      });
    }
    const res = await app.request('/api/admin/audit?page=2&pageSize=2', {
      headers: authHeaders(token),
    });
    const body = (await res.json()) as {
      items: unknown[];
      total: number;
      page: number;
      pageSize: number;
    };
    expect(body.total).toBe(5);
    expect(body.page).toBe(2);
    expect(body.pageSize).toBe(2);
    expect(body.items).toHaveLength(2);
  });

  it('rejects anonymous with 401 and operator with 403', async () => {
    const anon = buildApp();
    const anonRes = await anon.app.request('/api/admin/audit');
    expect(anonRes.status).toBe(401);

    const op = buildApp({ roles: ['operator'] });
    const opRes = await op.app.request('/api/admin/audit', {
      headers: authHeaders(op.token),
    });
    expect(opRes.status).toBe(403);
  });

  it('excludes events from other tenants', async () => {
    const { app, token, auditStore } = buildApp();
    auditStore.record({
      tenantId: 'globex-ind',
      type: 'plugin.publish',
      actorUserId: 'u2',
      actorEmail: 'b@y',
      summary: 'other tenant',
    });
    auditStore.record({
      tenantId: 'acme-corp',
      type: 'plugin.install',
      actorUserId: 'u1',
      actorEmail: 'a@x',
      summary: 'mine',
    });
    const res = await app.request('/api/admin/audit', {
      headers: authHeaders(token),
    });
    const body = (await res.json()) as { items: Array<{ summary: string }>; total: number };
    expect(body.total).toBe(1);
    expect(body.items[0]!.summary).toBe('mine');
  });
});
