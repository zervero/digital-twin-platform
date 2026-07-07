/**
 * Tests for the V3.3 `requiresTenantScope` middleware.
 *
 * The middleware wires together the V3.0 `requiresPermission`
 * behavior (auth + permission check) with the V3.3 tenant
 * extraction (read `session.tenantId`, resolve through the
 * dev registry, set `c.var.tenant`). Four cases per the
 * V3.3 plan T4:
 *
 *   1. valid session + tenant       -> 200 (handler runs)
 *   2. valid session, no tenant id  -> 401 AUTH_NO_TENANT
 *   3. no session                   -> 401 AUTH_SESSION_EXPIRED
 *   4. valid session + tenant + missing permission -> 403 AUTH_FORBIDDEN
 *
 * The "no tenant id" case is exercised by injecting a fake
 * `AuthStore` whose `getMe()` returns an `AuthSession` with
 * `tenantId` omitted -- the mock store always sets the
 * default `acme-corp`, so a fake store is the only way to
 * probe the missing-tenant path without forking the mock.
 * The "unknown tenant id" path (registry miss) is covered
 * implicitly: the dev registry currently has only
 * `acme-corp`, so a session with `tenantId: 'globex-ind'`
 * would 401 AUTH_NO_TENANT. That case lands as a separate
 * test in T5 when the registry has 3 tenants to choose from.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';

import type { AuthSession, MeResponse } from '@dt/contracts';

import { MockAuthStore } from '../auth/mock-store.js';
import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';

function authHeaders(token: string): Headers {
  return new Headers({ authorization: `Bearer ${token}` });
}

async function loginViewer(store: MockAuthStore): Promise<string> {
  const { session } = await store.login({ email: 'viewer@example.com' });
  return session.token;
}

/** Fake AuthStore that returns the same session for every call. */
class FakeAuthStore implements AuthStore {
  constructor(private readonly session: AuthSession | null) {}

  async login(): Promise<never> {
    throw new Error('FakeAuthStore.login is not callable');
  }

  async getMe(): Promise<MeResponse> {
    return this.session ? { session: this.session } : { session: null };
  }

  async logout(): Promise<void> {
    // no-op
  }
}

describe('requiresTenantScope (V3.3 T4)', () => {
  describe('happy path', () => {
    let store: MockAuthStore;
    beforeEach(() => {
      store = new MockAuthStore();
    });

    it('returns 200 when the session has a registered tenant', async () => {
      const token = await loginViewer(store);
      const app = new Hono();
      app.get(
        '/_protected',
        requiresTenantScope(store, 'device:read'),
        (c) => {
          // V3.3: the middleware sets c.var.tenant; the route
          // handler reads it without recomputing.
          const t = c.get('tenant');
          return c.json({ ok: true, tenantId: t?.tenant.id });
        },
      );
      const res = await app.request('/_protected', { headers: authHeaders(token) });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok: boolean; tenantId?: string };
      expect(body).toEqual({ ok: true, tenantId: 'acme-corp' });
    });
  });

  describe('401 paths', () => {
    it('returns AUTH_NO_TENANT when the session has no tenantId', async () => {
      // Build a session that mimics what a future OIDC config
      // without the tenant claim would produce. The mock store
      // always sets `tenantId`, so we go around it.
      const sessionWithoutTenant: AuthSession = {
        user: { id: 'u-1', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 'synthetic',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        // tenantId omitted on purpose
      };
      const store = new FakeAuthStore(sessionWithoutTenant);
      const app = new Hono();
      app.get(
        '/_protected',
        requiresTenantScope(store, 'device:read'),
        (c) => c.json({ ok: true }),
      );
      const res = await app.request('/_protected');
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('AUTH_NO_TENANT');
    });

    it('returns AUTH_SESSION_EXPIRED when there is no session at all', async () => {
      const store = new FakeAuthStore(null);
      const app = new Hono();
      app.get(
        '/_protected',
        requiresTenantScope(store, 'device:read'),
        (c) => c.json({ ok: true }),
      );
      const res = await app.request('/_protected');
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      // The "no session" path uses AUTH_SESSION_EXPIRED, not
      // AUTH_NO_TENANT -- the two are deliberately distinct so
      // a dev / smoke can tell "not logged in" from "logged in
      // but missing tenant". See V3.3 plan T4 step 1.
      expect(body.error).toBe('AUTH_SESSION_EXPIRED');
    });
  });

  describe('403 path', () => {
    let store: MockAuthStore;
    beforeEach(() => {
      store = new MockAuthStore();
    });

    it('returns AUTH_FORBIDDEN when the session has the right tenant but lacks the permission', async () => {
      const token = await loginViewer(store);
      const app = new Hono();
      // viewer has device:read but NOT device:write, so
      // requesting device:write here exercises the 403 path
      // after the tenant gate has already passed.
      app.get(
        '/_protected',
        requiresTenantScope(store, 'device:write'),
        (c) => c.json({ ok: true }),
      );
      const res = await app.request('/_protected', { headers: authHeaders(token) });
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('AUTH_FORBIDDEN');
    });
  });
});
