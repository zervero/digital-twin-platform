import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthError, MockAuthStore } from '../auth/mock-store.js';
import { requiresPermission } from '../middleware/requires-permission.js';

describe('MockAuthStore (V2.1)', () => {
  let store: MockAuthStore;
  beforeEach(() => {
    store = new MockAuthStore();
  });

  it('logs in any well-formed email', async () => {
    const res = await store.login({ email: 'alice@example.com' });
    expect(res.session.user.email).toBe('alice@example.com');
    expect(res.session.token.length).toBeGreaterThan(8);
    expect(res.session.user.roles).toContain('viewer');
  });

  it('rejects malformed email with AUTH_INVALID_CREDENTIALS', async () => {
    await expect(store.login({ email: 'not-an-email' }))
      .rejects.toBeInstanceOf(AuthError);
    try {
      await store.login({ email: 'not-an-email' });
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('getMe returns the session for a valid token', async () => {
    const { session } = await store.login({ email: 'bob@example.com' });
    const me = await store.getMe(session.token);
    expect(me.session?.user.email).toBe('bob@example.com');
  });

  it('getMe returns null for an unknown token', async () => {
    const me = await store.getMe('does-not-exist');
    expect(me.session).toBeNull();
  });

  it('logout invalidates the token', async () => {
    const { session } = await store.login({ email: 'carol@example.com' });
    await store.logout(session.token);
    const me = await store.getMe(session.token);
    expect(me.session).toBeNull();
  });
});

describe('requiresPermission (V2.1)', () => {
  function makeProtectedApp(store: MockAuthStore): Hono {
    const app = new Hono();
    app.get('/_protected', requiresPermission(store, 'device:write'), (c) =>
      c.json({ ok: true, user: c.get('user')?.email ?? null }),
    );
    return app;
  }

  it('passes when the user has the permission', async () => {
    const store = new MockAuthStore();
    const { session } = await store.login({ email: 'admin@example.com' });
    // Promote to admin via direct mutation (test-only).
    session.user.roles = ['admin'];
    const app = makeProtectedApp(store);
    const res = await app.request('/_protected', {
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; user: string | null };
    expect(body.ok).toBe(true);
    expect(body.user).toBe('admin@example.com');
  });

  it('returns 403 when the user lacks the permission', async () => {
    const store = new MockAuthStore();
    const { session } = await store.login({ email: 'viewer@example.com' });
    const app = makeProtectedApp(store);
    const res = await app.request('/_protected', {
      headers: { authorization: `Bearer ${session.token}` },
    });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('AUTH_FORBIDDEN');
  });

  it('returns 401 when no token is supplied', async () => {
    const store = new MockAuthStore();
    const app = makeProtectedApp(store);
    const res = await app.request('/_protected');
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('AUTH_SESSION_EXPIRED');
  });
});
