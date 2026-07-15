/**
 * Tests for the V3.0 requiresPermission middleware on the
 * real route modules (devices, scene, commands).
 *
 * Each test boots the route factory with a fresh MockAuthStore
 * and asserts the 401 / 403 / 200 paths the plan calls for.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockAuthStore } from '../auth/mock-store.js';
import { commandsRoute } from '../routes/commands.js';
import { devicesRoute } from '../routes/devices.js';
import { sceneRoute } from '../routes/scene.js';

function authHeaders(token: string): Headers {
  return new Headers({ authorization: `Bearer ${token}` });
}

async function loginViewer(store: MockAuthStore): Promise<string> {
  const { session } = await store.login({ email: 'viewer@example.com' });
  return session.token;
}

async function loginAdmin(store: MockAuthStore): Promise<string> {
  const { session } = await store.login({
    email: 'admin@example.com',
    roles: ['admin'],
  });
  return session.token;
}

async function loginOperator(store: MockAuthStore): Promise<string> {
  const { session } = await store.login({
    email: 'operator@example.com',
    roles: ['operator'],
  });
  return session.token;
}

describe('GET /api/devices (V3.0 device:read gate)', () => {
  let store: MockAuthStore;
  beforeEach(() => {
    store = new MockAuthStore();
  });

  it('returns 401 without a session', async () => {
    const app = new Hono();
    app.route('/api', devicesRoute(store));
    const res = await app.request('/api/devices');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTH_SESSION_EXPIRED');
  });

  it('returns 200 for a viewer', async () => {
    const token = await loginViewer(store);
    const app = new Hono();
    app.route('/api', devicesRoute(store));
    const res = await app.request('/api/devices', {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/scene (V3.0 scene:read gate)', () => {
  let store: MockAuthStore;
  beforeEach(() => {
    store = new MockAuthStore();
  });

  it('returns 401 without a session', async () => {
    const app = new Hono();
    app.route('/api', sceneRoute(store));
    const res = await app.request('/api/scene');
    expect(res.status).toBe(401);
  });

  it('returns 200 for a viewer with the per-tenant scene', async () => {
    const token = await loginViewer(store);
    const app = new Hono();
    app.route('/api', sceneRoute(store));
    const res = await app.request('/api/scene', {
      headers: authHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      tenantId: string;
      nodes: unknown[];
    };
    // V3.3 T6: the scene id is now per-tenant (the mock
    // store mints `acme-corp`). The legacy `scene-factory-a`
    // literal lives on only in `DEMO_SCENE` and is exercised
    // by the back-compat consumers (heartbeat + dev-source).
    expect(body.id).toBe('acme-corp-scene');
    expect(body.tenantId).toBe('acme-corp');
    expect(body.nodes.length).toBeGreaterThan(0);
  });
});

describe('POST /api/commands (V3.0 command:send gate)', () => {
  let store: MockAuthStore;
  beforeEach(() => {
    store = new MockAuthStore();
  });

  // V3.3 T6: the contract requires `tenantId` on every
  // DigitalTwinCommand, and the BFF compares it against
  // the session's resolved tenant. MockAuthStore mints
  // the default `acme-corp` tenant for every dev login,
  // so a matching tenantId keeps the happy path green.
  const validCmd = { id: 'c1', type: 'reset-view', tenantId: 'acme-corp' };

  it('returns 401 without a session', async () => {
    const app = new Hono();
    app.route('/api', commandsRoute(store));
    const res = await app.request('/api/commands', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validCmd),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for a viewer (lacks command:send)', async () => {
    const token = await loginViewer(store);
    const app = new Hono();
    app.route('/api', commandsRoute(store));
    const res = await app.request('/api/commands', {
      method: 'POST',
      headers: { ...Object.fromEntries(authHeaders(token)), 'content-type': 'application/json' },
      body: JSON.stringify(validCmd),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTH_FORBIDDEN');
  });

  it('returns 200 for an admin', async () => {
    const token = await loginAdmin(store);
    const app = new Hono();
    app.route('/api', commandsRoute(store));
    const res = await app.request('/api/commands', {
      method: 'POST',
      headers: { ...Object.fromEntries(authHeaders(token)), 'content-type': 'application/json' },
      body: JSON.stringify(validCmd),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accepted: boolean; commandId: string };
    expect(body.accepted).toBe(true);
    expect(body.commandId).toBe('c1');
  });

  it('accepts acknowledge-alarm for operator', async () => {
    const token = await loginOperator(store);
    const app = new Hono();
    app.route('/api', commandsRoute(store));
    const res = await app.request('/api/commands', {
      method: 'POST',
      headers: {
        ...Object.fromEntries(authHeaders(token)),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        id: 'cmd-1',
        tenantId: 'acme-corp',
        type: 'acknowledge-alarm',
        deviceId: 'd-1',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accepted: boolean; commandId: string };
    expect(body).toEqual({ accepted: true, commandId: 'cmd-1' });
  });
});
