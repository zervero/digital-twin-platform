/**
 * Tenant isolation — V3.3 T6.
 *
 * `requiresTenantScope` (T4) is the security boundary; this
 * file is the data-layer contract: every tenant-scoped
 * route returns data scoped to the caller's tenant, and a
 * cross-tenant write is rejected before dispatch.
 *
 * Cases (per V3.3 plan T6 step 6.1):
 *
 *   1. Three tokens (one per dev tenant) hit `/api/devices`
 *      and see only their own devices.
 *   2. The same three tokens hit `/api/scene` and see
 *      only their own scene (same factory graph, different
 *      ids / names).
 *   3. A token for `acme-corp` posts a `DigitalTwinCommand`
 *      whose `tenantId` is `globex-ind` -- 403
 *      `TENANT_FORBIDDEN` (cross-tenant write rejected
 *      before the echo).
 *   4. A session whose `tenantId` was never set (mimics a
 *      JWT without the tenant claim) -- 401 `AUTH_NO_TENANT`
 *      on every tenant-scoped route.
 *   5. A session whose `tenantId` is not in the dev
 *      registry -- 401 `AUTH_NO_TENANT` (registry miss).
 *
 * The legacy `DEMO_DEVICES` / `DEMO_SCENE` exports (used
 * by `dev-source.ts` heartbeat and the V3.0-era
 * `protected-routes.test.ts`) are intentionally not
 * touched here: T7 is the realtime-side fix; the HTTP
 * routes now serve per-tenant data, but the heartbeat
 * still emits a single global list.
 *
 * The fake store pattern mirrors `requires-tenant.test.ts`:
 * `MockAuthStore` mints only `acme-corp`, so a multi-tenant
 * test suite needs a `FakeAuthStore` that can hand out
 * different sessions per token. We construct it inline
 * rather than exporting it from `mock-store.ts` because
 * no production code path uses it -- the boundary stays
 * at the real store for the runtime.
 */

import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import type { AuthSession, MeResponse } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import {
  DEMO_TENANTS,
  getDevicesForTenant,
  getSceneForTenant,
} from '../mock/demo-data.js';
import { commandsRoute } from '../routes/commands.js';
import { devicesRoute } from '../routes/devices.js';
import { sceneRoute } from '../routes/scene.js';

function authHeaders(token: string): Headers {
  return new Headers({ authorization: `Bearer ${token}` });
}

/**
 * Multi-tenant fake: `getMe(headers)` looks the bearer
 * token up in a fixed map. A token that is not in the
 * map (or missing entirely) returns `{ session: null }`,
 * which the middleware translates to 401
 * `AUTH_SESSION_EXPIRED`. Tests that want to probe that
 * path simply omit the Authorization header.
 */
class MultiTenantFakeAuthStore implements AuthStore {
  constructor(private readonly tokens: Readonly<Record<string, AuthSession>>) {}

  async login(): Promise<never> {
    throw new Error('MultiTenantFakeAuthStore.login is not callable');
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
  tenantId: string | undefined,
  overrides: Partial<Pick<AuthSession, 'user' | 'expiresAt'>> = {},
): AuthSession {
  return {
    user: {
      id: `user-${tenantId ?? 'no-tenant'}`,
      displayName: tenantId ?? 'no-tenant',
      email: `${tenantId ?? 'no-tenant'}@example.com`,
      roles: ['admin'],
    },
    token: `tok-${tenantId ?? 'no-tenant'}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    // `tenantId` is intentionally optional here so the
    // "session without tenant" case can be expressed as
    // a literal omission rather than a sentinel string.
    ...(tenantId === undefined ? {} : { tenantId }),
    ...overrides,
  };
}

describe('tenant isolation (V3.3 T6)', () => {
  describe('GET /api/devices returns only the caller tenant devices', () => {
    const tokens = {
      'tok-acme-corp': sessionFor('acme-corp'),
      'tok-globex-ind': sessionFor('globex-ind'),
      'tok-initech-llc': sessionFor('initech-llc'),
    };

    for (const tenant of DEMO_TENANTS) {
      it(`${tenant.id} sees only its own devices`, async () => {
        const store = new MultiTenantFakeAuthStore(tokens);
        const app = new Hono();
        app.route('/api', devicesRoute(store));
        const res = await app.request('/api/devices', {
          headers: authHeaders(`tok-${tenant.id}`),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as Array<{ tenantId: string; id: string }>;
        // Every returned device must carry the caller's tenant.
        expect(body.length).toBeGreaterThan(0);
        for (const d of body) {
          expect(d.tenantId).toBe(tenant.id);
        }
        // And the count matches the per-tenant helper --
        // this catches a regression where a route accidentally
        // returned the union of all tenants.
        expect(body.length).toBe(getDevicesForTenant(tenant.id).length);
      });
    }

    it('three tenants served by the same BFF see disjoint device lists', async () => {
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', devicesRoute(store));
      const seen: Record<string, string[]> = {};
      for (const tenant of DEMO_TENANTS) {
        const res = await app.request('/api/devices', {
          headers: authHeaders(`tok-${tenant.id}`),
        });
        const body = (await res.json()) as Array<{ id: string }>;
        seen[tenant.id] = body.map((d) => d.id);
      }
      // No device id appears for two tenants. The fixture
      // uses `${tenantId}-device-${i}` prefixes so this is
      // also a guard against the legacy `device-1..4` ids
      // leaking into a per-tenant response.
      const allIds = Object.values(seen).flat();
      expect(new Set(allIds).size).toBe(allIds.length);
    });
  });

  describe('GET /api/scene returns only the caller tenant scene', () => {
    const tokens = {
      'tok-acme-corp': sessionFor('acme-corp'),
      'tok-globex-ind': sessionFor('globex-ind'),
      'tok-initech-llc': sessionFor('initech-llc'),
    };

    for (const tenant of DEMO_TENANTS) {
      it(`${tenant.id} sees only its own scene`, async () => {
        const store = new MultiTenantFakeAuthStore(tokens);
        const app = new Hono();
        app.route('/api', sceneRoute(store));
        const res = await app.request('/api/scene', {
          headers: authHeaders(`tok-${tenant.id}`),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { id: string; tenantId: string };
        expect(body.tenantId).toBe(tenant.id);
        // The per-tenant scene id embeds the tenant id
        // (`${tenantId}-scene`), so it doubles as a guard
        // against the legacy `scene-factory-a` literal
        // leaking through.
        expect(body.id).toBe(getSceneForTenant(tenant.id)!.id);
      });
    }
  });

  describe('POST /api/commands rejects cross-tenant writes', () => {
    const tokens = {
      'tok-acme-corp': sessionFor('acme-corp'),
    };

    it('returns 200 when command.tenantId matches the session tenant', async () => {
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', commandsRoute(store));
      const cmd = { id: 'c1', type: 'reset-view', tenantId: 'acme-corp' };
      const res = await app.request('/api/commands', {
        method: 'POST',
        headers: {
          ...Object.fromEntries(authHeaders('tok-acme-corp')),
          'content-type': 'application/json',
        },
        body: JSON.stringify(cmd),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { accepted: boolean; commandId: string };
      expect(body.accepted).toBe(true);
      expect(body.commandId).toBe('c1');
    });

    it('returns 403 TENANT_FORBIDDEN when command.tenantId differs from session tenant', async () => {
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', commandsRoute(store));
      const cmd = { id: 'c2', type: 'reset-view', tenantId: 'globex-ind' };
      const res = await app.request('/api/commands', {
        method: 'POST',
        headers: {
          ...Object.fromEntries(authHeaders('tok-acme-corp')),
          'content-type': 'application/json',
        },
        body: JSON.stringify(cmd),
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('TENANT_FORBIDDEN');
      // Diagnostic message should name both tenants so a
      // dev / smoke reading the response knows which way
      // the mismatch went.
      expect(body.message).toContain('globex-ind');
      expect(body.message).toContain('acme-corp');
    });

    it('returns 400 InvalidCommand when the body lacks tenantId', async () => {
      // The shape guard rejects a tenant-less command body
      // before the cross-tenant check runs. This is the
      // "client forgot to stamp tenantId" path: 400 with a
      // clear error code, not 403.
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', commandsRoute(store));
      const cmd = { id: 'c3', type: 'reset-view' };
      const res = await app.request('/api/commands', {
        method: 'POST',
        headers: {
          ...Object.fromEntries(authHeaders('tok-acme-corp')),
          'content-type': 'application/json',
        },
        body: JSON.stringify(cmd),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('InvalidCommand');
    });
  });

  describe('sessions without a tenant id are rejected at the gate', () => {
    // The `MockAuthStore` always sets `tenantId: acme-corp`,
    // so the only way to probe the missing-tenant path is
    // to construct a session with `tenantId` omitted and
    // hand it to the fake store directly. This mirrors the
    // pattern in `requires-tenant.test.ts`.
    const sessionNoTenant = sessionFor(undefined, {
      user: {
        id: 'u-no-tenant',
        displayName: 'no-tenant',
        email: 'no-tenant@example.com',
        roles: ['admin'],
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const tokens = { 'tok-no-tenant': sessionNoTenant };

    it('GET /api/devices returns 401 AUTH_NO_TENANT', async () => {
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', devicesRoute(store));
      const res = await app.request('/api/devices', {
        headers: authHeaders('tok-no-tenant'),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('AUTH_NO_TENANT');
    });

    it('GET /api/scene returns 401 AUTH_NO_TENANT', async () => {
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', sceneRoute(store));
      const res = await app.request('/api/scene', {
        headers: authHeaders('tok-no-tenant'),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('AUTH_NO_TENANT');
    });

    it('POST /api/commands returns 401 AUTH_NO_TENANT', async () => {
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', commandsRoute(store));
      const cmd = { id: 'c1', type: 'reset-view', tenantId: 'acme-corp' };
      const res = await app.request('/api/commands', {
        method: 'POST',
        headers: {
          ...Object.fromEntries(authHeaders('tok-no-tenant')),
          'content-type': 'application/json',
        },
        body: JSON.stringify(cmd),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe('AUTH_NO_TENANT');
    });
  });

  describe('sessions with an unknown tenant id are rejected at the gate', () => {
    const tokens = { 'tok-unknown': sessionFor('not-a-tenant') };

    it('GET /api/devices returns 401 AUTH_NO_TENANT', async () => {
      const store = new MultiTenantFakeAuthStore(tokens);
      const app = new Hono();
      app.route('/api', devicesRoute(store));
      const res = await app.request('/api/devices', {
        headers: authHeaders('tok-unknown'),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string; message: string };
      expect(body.error).toBe('AUTH_NO_TENANT');
      // The middleware surfaces the rejected id so a dev
      // / smoke can see which tenant id failed.
      expect(body.message).toContain('not-a-tenant');
    });
  });
});
