import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type AuthSession,
  type LoginRequest,
  type MeResponse,
} from '@dt/contracts';

import { AuthError } from '../auth/store.js';
import { MockAuthStore } from '../auth/mock-store.js';
import { requiresPermission } from '../middleware/requires-permission.js';

/**
 * V3.0 helper: turn a bearer token into the Headers object
 * the AuthStore interface expects. The mock extracts the
 * bearer itself; this is just plumbing for the tests.
 */
function authHeaders(token: string): Headers {
  return new Headers({ authorization: `Bearer ${token}` });
}

describe('MockAuthStore (V2.1 + V3.0 headers interface)', () => {
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

  it('getMe returns the session for a valid bearer token', async () => {
    const { session } = await store.login({ email: 'bob@example.com' });
    const me = await store.getMe(authHeaders(session.token));
    expect(me.session?.user.email).toBe('bob@example.com');
  });

  it('getMe returns null for an unknown bearer token', async () => {
    const me = await store.getMe(authHeaders('does-not-exist'));
    expect(me.session).toBeNull();
  });

  it('getMe returns null when no Authorization header is sent', async () => {
    const me = await store.getMe(new Headers());
    expect(me.session).toBeNull();
  });

  it('logout invalidates the bearer token', async () => {
    const { session } = await store.login({ email: 'carol@example.com' });
    await store.logout(authHeaders(session.token));
    const me = await store.getMe(authHeaders(session.token));
    expect(me.session).toBeNull();
  });
});

describe('requiresPermission (V2.1 + V3.0 headers)', () => {
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

  it('honors session.permissions directly when present (V3.0 OIDC path)', async () => {
    // V3.0: when the IdP issues permissions via the JWT
    // (e.g. OIDC scope claim), the session carries them
    // directly and the middleware must trust them over
    // the role-derived permissions. We hand-craft a session
    // here so the test is independent of the OIDC store.
    const session: AuthSession = {
      user: {
        id: 'oidc:test',
        displayName: 'Test',
        email: 'test@example.com',
        // No roles — OIDC path doesn't synthesize roles.
        roles: [],
      },
      token: 'opaque-session',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      permissions: ['device:read', 'scene:read'],
    };
    // Inject directly into the in-memory map so getMe
    // (which only consults bearer tokens in the mock)
    // can't find it — proving the middleware uses the
    // AuthStore surface, not the map directly. We use a
    // fake AuthStore impl that returns the session we want.
    const fakeStore = {
      async login(_req: LoginRequest) { throw new Error('not used'); },
      async getMe(_headers: Headers): Promise<MeResponse> {
        return { session };
      },
      async logout(_headers: Headers) { /* noop */ },
    };
    const app = new Hono();
    app.get('/_protected', requiresPermission(fakeStore, 'device:read'), (c) =>
      c.json({ ok: true, user: c.get('user')?.email ?? null }),
    );
    const res = await app.request('/_protected');
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; user: string | null };
    expect(body.ok).toBe(true);
    expect(body.user).toBe('test@example.com');
  });
});
