/**
 * Admin users route tests — V4 T11.
 *
 * Cases:
 *   1. GET /api/admin/users returns seeded users for the
 *      caller's tenant (at least two for UI demos).
 *   2. GET without a session returns 401 AUTH_SESSION_EXPIRED.
 *   3. GET as operator returns 403 AUTH_FORBIDDEN.
 *   4. PATCH /api/admin/users/:id/roles updates roles and
 *      records an audit event.
 *   5. PATCH with an unknown user id returns 404.
 *   6. Users from another tenant are not returned.
 */

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import type { AuthSession, MeResponse, Role } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { createMemoryAuditStore } from '../admin/audit-store.js';
import { createMemoryUserDirectory } from '../admin/user-directory.js';
import { adminUsersRoutes } from '../routes/admin-users.js';

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
  async updateUserRoles(userId: string, roles: readonly Role[]): Promise<void> {
    for (const session of Object.values(this.tokens)) {
      if (session.user.id === userId) {
        session.user = { ...session.user, roles: [...roles] };
      }
    }
  }
}

function sessionFor(
  tenantId: string,
  roles: readonly Role[] = ['admin'],
  email = `${tenantId}@example.com`,
): AuthSession {
  return {
    user: {
      id: `user-${email}`,
      displayName: email.split('@')[0]!,
      email,
      roles: [...roles],
    },
    token: `tok-${tenantId}-${roles.join('-')}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tenantId,
  };
}

function buildApp(opts?: {
  tenantId?: string;
  roles?: readonly Role[];
}): {
  app: Hono;
  token: string;
  auditStore: ReturnType<typeof createMemoryAuditStore>;
  userDirectory: ReturnType<typeof createMemoryUserDirectory>;
} {
  const tenantId = opts?.tenantId ?? 'acme-corp';
  const roles = opts?.roles ?? ['admin'];
  const session = sessionFor(tenantId, roles);
  const authStore = new FakeAuthStore({ [session.token]: session });
  const userDirectory = createMemoryUserDirectory();
  userDirectory.seedDemoUsers();
  const auditStore = createMemoryAuditStore();
  const app = new Hono();
  app.route(
    '/api',
    adminUsersRoutes({ authStore, userDirectory, auditStore }),
  );
  return { app, token: session.token, auditStore, userDirectory };
}

describe('admin users routes (V4 T11)', () => {
  it('lists at least two seeded users for the tenant', async () => {
    const { app, token } = buildApp();
    const res = await app.request('/api/admin/users', {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: Array<{ email: string }> };
    expect(body.users.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects anonymous requests with 401', async () => {
    const { app } = buildApp();
    const res = await app.request('/api/admin/users');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTH_SESSION_EXPIRED');
  });

  it('rejects operators with 403', async () => {
    const { app, token } = buildApp({ roles: ['operator'] });
    const res = await app.request('/api/admin/users', {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTH_FORBIDDEN');
  });

  it('updates roles and records an audit event', async () => {
    const { app, token, auditStore, userDirectory } = buildApp();
    const target = userDirectory.list('acme-corp').find((u) =>
      u.roles.includes('operator') || u.roles.includes('viewer'),
    );
    expect(target).toBeDefined();
    const res = await app.request(`/api/admin/users/${target!.id}/roles`, {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ roles: ['viewer'] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { roles: string[] } };
    expect(body.user.roles).toEqual(['viewer']);

    const audit = auditStore.list('acme-corp', { page: 1, pageSize: 20 });
    expect(audit.total).toBeGreaterThanOrEqual(1);
    expect(audit.items.some((e) => e.type === 'user.roles_change')).toBe(true);
  });

  it('returns 404 for an unknown user id', async () => {
    const { app, token } = buildApp();
    const res = await app.request('/api/admin/users/user-missing/roles', {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ roles: ['viewer'] }),
    });
    expect(res.status).toBe(404);
  });

  it('does not leak users from another tenant', async () => {
    const { app, token, userDirectory } = buildApp({ tenantId: 'acme-corp' });
    userDirectory.upsert('globex-ind', {
      id: 'user-secret@globex.example.com',
      displayName: 'secret',
      email: 'secret@globex.example.com',
      roles: ['admin'],
    });
    const res = await app.request('/api/admin/users', {
      headers: authHeaders(token),
    });
    const body = (await res.json()) as { users: Array<{ email: string }> };
    expect(body.users.every((u) => !u.email.includes('globex'))).toBe(true);
  });
});
