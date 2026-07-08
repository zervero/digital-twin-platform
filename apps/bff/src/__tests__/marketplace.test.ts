/**
 * Marketplace route tests -- V3.4 T3.
 *
 * Cases (per V3.4 plan T3 step 3.x):
 *
 *   1. GET /api/plugins returns an empty list for a fresh
 *      registry.
 *   2. POST /api/plugins publishes a manifest + base64
 *      artifact; GET /api/plugins/:id returns it.
 *   3. POST /api/plugins/:id/install installs for the
 *      caller's tenant; the response carries `active: true`
 *      for the first install.
 *   4. A second install of the same version returns 409
 *      PLUGIN_ALREADY_INSTALLED.
 *   5. Install with an unknown plugin id returns 404
 *      PLUGIN_NOT_FOUND.
 *   6. Install with an unknown version returns 404
 *      PLUGIN_VERSION_NOT_FOUND.
 *   7. PUT /api/plugins/:id/activate sets the active flag
 *      on the requested version; the previously-active
 *      version goes inactive.
 *   8. DELETE /api/plugins/:id/installed/:version removes
 *      the install; a second DELETE returns 404.
 *   9. GET /api/plugins/:id/installed returns only the
 *      caller's tenant's installs (tenant scoping).
 *  10. A POST /api/plugins with a malformed manifest
 *      returns 400 PLUGIN_MANIFEST_INVALID.
 *  11. A request without a session returns 401
 *      AUTH_SESSION_EXPIRED (the V3.3 gate).
 *  12. A request with a session whose tenant is unknown
 *      returns 401 AUTH_NO_TENANT.
 *
 * The minimum-gate design: T3 ships the routes with
 * `plugin:read` as the floor for every action. T6 layers
 * `canInstallForTenant` / `canPublish` on top so install /
 * publish / activate / uninstall become admin-only. The
 * T3 tests assert the loose-gate behavior end-to-end.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AuthSession, MeResponse } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { DEMO_TENANTS } from '../mock/demo-data.js';
import { marketplaceRoutes } from '../routes/marketplace.js';
import { MemoryPluginStore } from '../plugins/store-memory.js';
import { createInMemoryPluginIndex } from '@dt/plugin-registry';
import { generateDevSigningSecret, resetSigningSecret } from '../plugins/signing.js';

function authHeaders(token: string): Record<string, string> {
  // Return a plain record rather than a Headers instance.
  // Tests need to spread these (`{ ...authHeaders(t), 'content-type': ... }`)
  // to merge the auth header with content-type, and `...new Headers(...)`
  // in Node 22 does not iterate the entries, so the auth header is
  // silently dropped on every spread. tenant-isolation.test.ts already
  // does the equivalent dance with `Object.fromEntries(...)`; here we
  // avoid the boilerplate by returning a record directly.
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
  roles: readonly ('admin' | 'operator' | 'viewer')[] = ['admin'],
): AuthSession {
  return {
    user: {
      id: `user-${tenantId}`,
      displayName: tenantId,
      email: `${tenantId}@example.com`,
      roles: [...roles],
    },
    token: `tok-${tenantId}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tenantId,
  };
}

function buildApp(opts?: {
  tenantIds?: readonly string[];
  roles?: readonly ('admin' | 'operator' | 'viewer')[];
}): { app: Hono; tokens: Record<string, string>; pluginStore: MemoryPluginStore } {
  const tenantIds = opts?.tenantIds ?? ['acme-corp'];
  const roles = opts?.roles ?? ['admin'];
  // Always mint a session for every requested tenantId.
  // The middleware's tenant-resolution step (`resolveTenant`)
  // is the only place that decides whether a tenant id is
  // "known". Letting an unknown tenant id through session
  // lookup exercises the AUTH_NO_TENANT branch end-to-end
  // (test 12); only a missing bearer token hits the
  // AUTH_SESSION_EXPIRED branch (test 11).
  const tokens: Record<string, string> = {};
  const tokenMap: Record<string, AuthSession> = {};
  for (const tenantId of tenantIds) {
    const tok = `tok-${tenantId}`;
    tokens[tenantId] = tok;
    tokenMap[tok] = sessionFor(tenantId, roles);
  }
  const authStore = new FakeAuthStore(tokenMap);
  const pluginStore = new MemoryPluginStore();
  const registryIndex = createInMemoryPluginIndex();
  const app = new Hono();
  app.route('/api', marketplaceRoutes({ authStore, pluginStore, registryIndex }));
  return { app, tokens, pluginStore };
}

function publishBody(version = '1.0.0'): string {
  const artifact = Buffer.from(`hello-plugin-payload-v${version}`).toString('base64');
  return JSON.stringify({
    manifest: {
      id: 'hello-plugin',
      name: 'Hello Plugin',
      version,
      vendor: 'Acme',
      permissions: ['device:read'],
    },
    artifact,
  });
}

describe('marketplace routes (V3.4 T3 + T6)', () => {
  // V3.4 T5: writePluginArtifact needs PLUGIN_SIGNING_SECRET.
  // V3.4 T4: writePluginArtifact reads PLUGIN_STORAGE_ROOT.
  // Pin both to per-test tmp dirs so the route unit tests
  // stay isolated and do not litter the workspace.
  let tmpRoot: string;
  let priorStorageRoot: string | undefined;
  let priorSecret: string | undefined;

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(tmpdir(), 'dtp-mp-test-'));
    priorStorageRoot = process.env.PLUGIN_STORAGE_ROOT;
    priorSecret = process.env.PLUGIN_SIGNING_SECRET;
    process.env.PLUGIN_STORAGE_ROOT = tmpRoot;
    process.env.PLUGIN_SIGNING_SECRET = generateDevSigningSecret();
    resetSigningSecret();
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
    if (priorStorageRoot === undefined) {
      delete process.env.PLUGIN_STORAGE_ROOT;
    } else {
      process.env.PLUGIN_STORAGE_ROOT = priorStorageRoot;
    }
    if (priorSecret === undefined) {
      delete process.env.PLUGIN_SIGNING_SECRET;
    } else {
      process.env.PLUGIN_SIGNING_SECRET = priorSecret;
    }
    resetSigningSecret();
  });
  // -- 1: empty list --
  it('GET /api/plugins returns an empty list for a fresh registry', async () => {
    const { app, tokens } = buildApp();
    const res = await app.request('/api/plugins', {
      headers: authHeaders(tokens['acme-corp']!),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  // -- 2: publish + get --
  it('POST + GET round-trip: publish then get returns the version', async () => {
    const { app, tokens } = buildApp();
    const pub = await app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: publishBody('1.0.0'),
    });
    expect(pub.status).toBe(201);
    const pubBody = (await pub.json()) as { version: string; pluginId: string };
    expect(pubBody.version).toBe('1.0.0');
    expect(pubBody.pluginId).toBe('hello-plugin');

    const get = await app.request('/api/plugins/hello-plugin', {
      headers: authHeaders(tokens['acme-corp']!),
    });
    expect(get.status).toBe(200);
    const plugin = (await get.json()) as { id: string; versions: Array<{ version: string }> };
    expect(plugin.id).toBe('hello-plugin');
    expect(plugin.versions).toHaveLength(1);
    expect(plugin.versions[0]!.version).toBe('1.0.0');
  });

  // -- 3: install --
  it('POST install creates the install with active: true', async () => {
    const { app, tokens } = buildApp();
    await app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: publishBody('1.0.0'),
    });
    const inst = await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });
    expect(inst.status).toBe(201);
    const body = (await inst.json()) as { active: boolean; version: string; tenantId: string };
    expect(body.active).toBe(true);
    expect(body.version).toBe('1.0.0');
    expect(body.tenantId).toBe('acme-corp');
  });

  // -- 4: duplicate install --
  it('POST install returns 409 PLUGIN_ALREADY_INSTALLED on the second call', async () => {
    const { app, tokens } = buildApp();
    await app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: publishBody('1.0.0'),
    });
    const installBody = JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' });
    const headers = { ...authHeaders(tokens['acme-corp']!), 'content-type': 'application/json' };
    const first = await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers,
      body: installBody,
    });
    expect(first.status).toBe(201);
    const second = await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers,
      body: installBody,
    });
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_ALREADY_INSTALLED');
  });

  // -- 5: install unknown plugin --
  it('POST install returns 404 PLUGIN_NOT_FOUND for an unknown plugin', async () => {
    const { app, tokens } = buildApp();
    const res = await app.request('/api/plugins/missing-plugin/install', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pluginId: 'missing-plugin', version: '1.0.0' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_NOT_FOUND');
  });

  // -- 6: install unknown version --
  it('POST install returns 404 PLUGIN_VERSION_NOT_FOUND for an unknown version', async () => {
    const { app, tokens } = buildApp();
    await app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: publishBody('1.0.0'),
    });
    const res = await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '9.9.9' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_VERSION_NOT_FOUND');
  });

  // -- 7: activate --
  it('PUT activate sets the active flag; previous active becomes inactive', async () => {
    const { app, tokens } = buildApp();
    const headers = { ...authHeaders(tokens['acme-corp']!), 'content-type': 'application/json' };
    await app.request('/api/plugins', {
      method: 'POST',
      headers,
      body: publishBody('1.0.0'),
    });
    await app.request('/api/plugins', {
      method: 'POST',
      headers,
      body: publishBody('1.1.0'),
    });
    await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });
    await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.1.0' }),
    });
    const act = await app.request('/api/plugins/hello-plugin/activate', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.1.0' }),
    });
    expect(act.status).toBe(200);
    const list = await app.request('/api/plugins/hello-plugin/installed', {
      headers: authHeaders(tokens['acme-corp']!),
    });
    const versions = (await list.json()) as Array<{ version: string; active: boolean }>;
    expect(versions).toHaveLength(2);
    expect(versions.find((v) => v.version === '1.0.0')!.active).toBe(false);
    expect(versions.find((v) => v.version === '1.1.0')!.active).toBe(true);
  });

  // -- 8: uninstall --
  it('DELETE removes the install; second DELETE returns 404', async () => {
    const { app, tokens } = buildApp();
    const headers = { ...authHeaders(tokens['acme-corp']!), 'content-type': 'application/json' };
    await app.request('/api/plugins', { method: 'POST', headers, body: publishBody('1.0.0') });
    await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });
    const first = await app.request('/api/plugins/hello-plugin/installed/1.0.0', {
      method: 'DELETE',
      headers: authHeaders(tokens['acme-corp']!),
    });
    expect(first.status).toBe(200);
    const second = await app.request('/api/plugins/hello-plugin/installed/1.0.0', {
      method: 'DELETE',
      headers: authHeaders(tokens['acme-corp']!),
    });
    expect(second.status).toBe(404);
  });

  // -- 9: tenant scoping on /installed --
  it("GET /installed is tenant-scoped: only the caller's tenant sees their installs", async () => {
    const { app, tokens } = buildApp({ tenantIds: ['acme-corp', 'globex-ind'] });
    const headers = (t: string) => ({
      ...authHeaders(tokens[t]!),
      'content-type': 'application/json',
    });
    // Publish once (publish is registry-global, but the
    // tenant-scoped tenant context still must be set).
    await app.request('/api/plugins', {
      method: 'POST',
      headers: headers('acme-corp'),
      body: publishBody('1.0.0'),
    });
    // acme-corp installs
    await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers: headers('acme-corp'),
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });
    // globex-ind installs
    await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers: headers('globex-ind'),
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });

    const acmeList = await app.request('/api/plugins/hello-plugin/installed', {
      headers: authHeaders(tokens['acme-corp']!),
    });
    const acmeVersions = (await acmeList.json()) as Array<{ tenantId: string }>;
    expect(acmeVersions).toHaveLength(1);
    expect(acmeVersions[0]!.tenantId).toBe('acme-corp');

    const globexList = await app.request('/api/plugins/hello-plugin/installed', {
      headers: authHeaders(tokens['globex-ind']!),
    });
    const globexVersions = (await globexList.json()) as Array<{ tenantId: string }>;
    expect(globexVersions).toHaveLength(1);
    expect(globexVersions[0]!.tenantId).toBe('globex-ind');
  });

  // -- 10: malformed manifest --
  it('POST publish with a malformed manifest returns 400 PLUGIN_MANIFEST_INVALID', async () => {
    const { app, tokens } = buildApp();
    const res = await app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        manifest: {
          id: 'BadId', // capital letters -> INVALID_ID
          name: 'X',
          version: '1.0.0',
          vendor: 'X',
          permissions: ['device:read'],
        },
        artifact: Buffer.from('x').toString('base64'),
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_MANIFEST_INVALID');
  });

  // -- 11: no session --
  it('a request without a session returns 401 AUTH_SESSION_EXPIRED', async () => {
    const { app } = buildApp();
    const res = await app.request('/api/plugins');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTH_SESSION_EXPIRED');
  });

  // -- 12: unknown tenant --
  it('a session whose tenant is not in the registry returns 401 AUTH_NO_TENANT', async () => {
    // The token claims tenantId='unknown-tenant' but the
    // FakeAuthStore only hands out sessions for tenants in
    // DEMO_TENANTS; an unknown tenant id has no session,
    // which the middleware treats as 401.
    const { app } = buildApp({ tenantIds: ['unknown-tenant'] });
    const res = await app.request('/api/plugins', {
      headers: authHeaders('tok-unknown-tenant'),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTH_NO_TENANT');
  });

  // -- bonus: each demo tenant can install independently --
  it('every DEMO_TENANT can install independently', async () => {
    for (const tenant of DEMO_TENANTS) {
      const { app, tokens } = buildApp({ tenantIds: [tenant.id] });
      const headers = { ...authHeaders(tokens[tenant.id]!), 'content-type': 'application/json' };
      await app.request('/api/plugins', { method: 'POST', headers, body: publishBody('1.0.0') });
      const inst = await app.request('/api/plugins/hello-plugin/install', {
        method: 'POST',
        headers,
        body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
      });
      expect(inst.status).toBe(201);
    }
  });
});

describe('marketplace routes policy (V3.4 T6)', () => {
  // V3.4 T5: writePluginArtifact needs PLUGIN_SIGNING_SECRET.
  // V3.4 T4: writePluginArtifact reads PLUGIN_STORAGE_ROOT.
  // Pin both to per-test tmp dirs so the route unit tests
  // stay isolated and do not litter the workspace.
  let tmpRoot: string;
  let priorStorageRoot: string | undefined;
  let priorSecret: string | undefined;

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(tmpdir(), 'dtp-mp-t6-'));
    priorStorageRoot = process.env.PLUGIN_STORAGE_ROOT;
    priorSecret = process.env.PLUGIN_SIGNING_SECRET;
    process.env.PLUGIN_STORAGE_ROOT = tmpRoot;
    process.env.PLUGIN_SIGNING_SECRET = generateDevSigningSecret();
    resetSigningSecret();
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
    if (priorStorageRoot === undefined) {
      delete process.env.PLUGIN_STORAGE_ROOT;
    } else {
      process.env.PLUGIN_STORAGE_ROOT = priorStorageRoot;
    }
    if (priorSecret === undefined) {
      delete process.env.PLUGIN_SIGNING_SECRET;
    } else {
      process.env.PLUGIN_SIGNING_SECRET = priorSecret;
    }
    resetSigningSecret();
  });

  it('admin can install for the caller\'s tenant', async () => {
    const { app, tokens } = buildApp({ roles: ['admin'] });
    // admin publishes...
    const pub = await app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: publishBody('1.0.0'),
    });
    expect(pub.status).toBe(201);
    // ...then installs.
    const inst = await app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers: {
        ...authHeaders(tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });
    expect(inst.status).toBe(201);
  });

  it('operator install is denied with 403 PLUGIN_PERMISSION_DENIED', async () => {
    // Operators have `plugin:read` but not `plugin:install`.
    // The minimum gate passes them through; the explicit
    // canInstallForTenant check is what returns 403.
    // The plugin is not in the in-memory registry, but the
    // policy gate fires before the registry lookup so the
    // response is 403 (not 404).
    const op = buildApp({ roles: ['operator'] });
    const res = await op.app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers: {
        ...authHeaders(op.tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_PERMISSION_DENIED');
  });

  it('viewer install is denied with 403 PLUGIN_PERMISSION_DENIED', async () => {
    const v = buildApp({ roles: ['viewer'] });
    const res = await v.app.request('/api/plugins/hello-plugin/install', {
      method: 'POST',
      headers: {
        ...authHeaders(v.tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pluginId: 'hello-plugin', version: '1.0.0' }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_PERMISSION_DENIED');
  });

  it('operator can list plugins (200, plugin:read is enough)', async () => {
    const op = buildApp({ roles: ['operator'] });
    const res = await op.app.request('/api/plugins', {
      headers: authHeaders(op.tokens['acme-corp']!),
    });
    expect(res.status).toBe(200);
  });

  it('operator publish is denied with 403 PLUGIN_PERMISSION_DENIED', async () => {
    const op = buildApp({ roles: ['operator'] });
    const res = await op.app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(op.tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: publishBody('1.0.0'),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_PERMISSION_DENIED');
  });

  it('viewer publish is denied with 403 PLUGIN_PERMISSION_DENIED', async () => {
    const v = buildApp({ roles: ['viewer'] });
    const res = await v.app.request('/api/plugins', {
      method: 'POST',
      headers: {
        ...authHeaders(v.tokens['acme-corp']!),
        'content-type': 'application/json',
      },
      body: publishBody('1.0.0'),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('PLUGIN_PERMISSION_DENIED');
  });
});
