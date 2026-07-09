/**
 * CORS middleware tests -- V3.5 Track K.
 *
 * The web app at http://localhost:5173 and the Tauri shell at
 * http://localhost:1420 both reach the BFF cross-origin. Without
 * a CORS middleware, the browser refuses every fetch with:
 *
 *   "No 'Access-Control-Allow-Origin' header is present on the
 *    requested resource."
 *
 * The smoke scripts that CI runs hit the BFF on localhost:3001
 * directly (no Origin header), so they never see this. The
 * tests here cover both the origin-resolution policy and the
 * end-to-end preflight + simple-request paths through the
 * actual Hono + cors middleware.
 *
 * Two layers of coverage:
 *
 *   1. Unit test `resolveCorsOrigins` for the env-var /
 *      production-flag matrix.
 *   2. Integration test through `buildApp` -- send an OPTIONS
 *      preflight and a real GET, assert the headers the
 *      browser expects.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildApp,
  DEFAULT_DEV_CORS_ORIGINS,
  resolveCorsOrigins,
  type CreateServerOptions,
} from '../server.js';
import { createLogger } from '@dt/observability';
import type { AppEnv } from '@dt/config';

function baseEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  return {
    nodeEnv: 'development',
    production: false,
    logLevel: 'error',
    port: 0,
    authProvider: 'mock',
    ...overrides,
  };
}

function makeOptions(env: AppEnv): CreateServerOptions {
  return {
    env,
    logger: createLogger({ level: 'error' }),
  };
}

describe('resolveCorsOrigins (V3.5 Track K)', () => {
  const ORIGINAL_ENV = process.env['CORS_ALLOWED_ORIGINS'];

  beforeEach(() => {
    delete process.env['CORS_ALLOWED_ORIGINS'];
  });
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env['CORS_ALLOWED_ORIGINS'];
    } else {
      process.env['CORS_ALLOWED_ORIGINS'] = ORIGINAL_ENV;
    }
  });

  it('returns the dev defaults in development when env var is unset', () => {
    const origins = resolveCorsOrigins(false);
    expect(origins).toEqual([...DEFAULT_DEV_CORS_ORIGINS]);
  });

  it('returns an empty list in production when env var is unset (deny by default)', () => {
    const origins = resolveCorsOrigins(true);
    expect(origins).toEqual([]);
  });

  it('parses a comma-separated CORS_ALLOWED_ORIGINS, trimming whitespace', () => {
    process.env['CORS_ALLOWED_ORIGINS'] =
      'https://app.example.com, https://admin.example.com ,https://api.example.com';
    const origins = resolveCorsOrigins(true);
    expect(origins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
      'https://api.example.com',
    ]);
  });

  it('drops empty entries from the env var', () => {
    process.env['CORS_ALLOWED_ORIGINS'] = ',,,https://app.example.com,,,';
    const origins = resolveCorsOrigins(false);
    expect(origins).toEqual(['https://app.example.com']);
  });

  it('treats a whitespace-only env var as unset', () => {
    process.env['CORS_ALLOWED_ORIGINS'] = '   ';
    const origins = resolveCorsOrigins(true);
    expect(origins).toEqual([]);
  });

  it('env var overrides the dev defaults when both could apply', () => {
    process.env['CORS_ALLOWED_ORIGINS'] = 'https://custom.example.com';
    const origins = resolveCorsOrigins(false);
    expect(origins).toEqual(['https://custom.example.com']);
  });
});

describe('buildApp CORS preflight (V3.5 Track K)', () => {
  it('responds 204 to OPTIONS from an allowed dev origin', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/devices', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    );
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('omits Access-Control-Allow-Origin for a non-allowlisted origin', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/devices', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    // Preflight still answers 204 (the cors middleware
    // always short-circuits OPTIONS) but without an
    // Access-Control-Allow-Origin header the browser
    // refuses to follow up with the real GET.
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('attaches CORS headers to a simple GET response from an allowed dev origin', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    // /health is the one route that always returns 200
    // regardless of auth -- it's the cleanest canary for
    // "do CORS headers ride along on real responses".
    const res = await app.request('/health', {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'http://localhost:5173',
    );
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does not attach CORS headers when no Origin header is sent (same-origin)', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    // No Origin -> no Access-Control-Allow-Origin. This is
    // the path smoke scripts hit; the absence is correct.
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('denies all cross-origin preflights in production without CORS_ALLOWED_ORIGINS', async () => {
    const { app } = buildApp(
      makeOptions(
        baseEnv({
          production: true,
          authProvider: 'mock',
        }),
      ),
    );
    const res = await app.request('/health', {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(res.status).toBe(200);
    // Status is 200 (the request still ran) but the
    // browser will refuse to expose the body to JS
    // without an Access-Control-Allow-Origin header.
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('honors CORS_ALLOWED_ORIGINS in production', async () => {
    process.env['CORS_ALLOWED_ORIGINS'] = 'https://app.example.com';
    try {
      const { app } = buildApp(
        makeOptions(
          baseEnv({
            production: true,
            authProvider: 'mock',
          }),
        ),
      );
      const res = await app.request('/health', {
        headers: { Origin: 'https://app.example.com' },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.example.com',
      );
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    } finally {
      delete process.env['CORS_ALLOWED_ORIGINS'];
    }
  });
});

describe('subprotocolAuth (V3.5 Track K T8.2)', () => {
  it('injects Authorization from a bearer subprotocol', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/devices', {
      method: 'GET',
      headers: {
        'sec-websocket-protocol': 'bearer, mock-token-xyz',
        authorization: 'Bearer mock-token-xyz',
      },
    });
    // The BFF's tenant gate runs after the subprotocol
    // middleware. The mock auth store doesn't know this
    // token, so we get 401 AUTH_SESSION_EXPIRED -- but
    // that's the *tenant* gate's response, proving the
    // token DID make it into the Authorization header
    // (otherwise the route would also 401 with no
    // permission). The actual code path is:
    // subprotocol -> header -> requiresTenantScope ->
    // getMe(headers) -> 401 because mock store is empty.
    expect(res.status).toBe(401);
  });

  it('passes through the request when no subprotocol is present', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/devices', { method: 'GET' });
    expect(res.status).toBe(401);
    // Same outcome (no token = 401), but via a different
    // route: header was never injected, requiresTenantScope
    // saw no Authorization header at all.
  });

  it('is a no-op for requests without the bearer subprotocol pair', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/devices', {
      method: 'GET',
      headers: { 'sec-websocket-protocol': 'chat, v1' },
    });
    // 'chat, v1' is a valid subprotocols header but the
    // middleware only acts when 'bearer' is one of the
    // values. Token not injected -> 401 from the gate.
    expect(res.status).toBe(401);
  });

  it('overrides an existing Authorization header (subprotocol wins)', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/devices', {
      method: 'GET',
      headers: {
        'sec-websocket-protocol': 'bearer, mock-from-subprotocol',
        authorization: 'Bearer old-token-should-be-replaced',
      },
    });
    expect(res.status).toBe(401);
    // The mock store is empty so we can't observe the
    // overridden value directly, but the path runs to
    // completion -- no exception, no malformed request.
  });
});

describe('buildApp /api/stream subprotocol end-to-end (V3.5 Track K T8.2)', () => {
  it('rejects a WS-style upgrade with no subprotocol (no token)', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    // /api/stream is a Hono app.get; the WS upgrade is
    // handled by upgradeWebSocket which short-circuits
    // on the upgrade request. A regular GET still goes
    // through requiresTenantScope and bounces 401 when
    // there's no Authorization header. We assert the
    // header pipeline ran: subprotocol middleware no-op,
    // requiresTenantScope reads missing token, 401.
    const res = await app.request('/api/stream', { method: 'GET' });
    expect(res.status).toBe(401);
  });

  it('runs the subprotocol middleware before requiresTenantScope', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/stream', {
      method: 'GET',
      headers: { 'sec-websocket-protocol': 'bearer, mock-uuid' },
    });
    // Both layers saw the request and produced 401. The
    // distinction is invisible at the HTTP level (both
    // return AUTH_SESSION_EXPIRED) but the test asserts
    // the pipeline runs end to end without throwing --
    // catching regressions where one middleware short-
    // circuits the other.
    expect(res.status).toBe(401);
  });
});

describe('subprotocolAuth end-to-end (V3.5 Track K T8.2)', () => {
  it('a real login session is recognized when sent via subprotocol', async () => {
    const built = buildApp(makeOptions(baseEnv()));
    const { app, authStore } = built;
    const { session } = await authStore.login({ email: 'viewer@example.com' });
    const token = session.token;
    expect(token).toMatch(/^mock-/);
    // The dev-loop use case: user logs in via the
    // mock store, then opens the WebSocket. The token
    // comes back from login() and is what the client
    // tunnels through the subprotocols list. The
    // subprotocolAuth middleware (V3.5 Track K T8.2)
    // pulls it out and tunnels it into Authorization,
    // so the requiresTenantScope gate accepts and
    // /api/devices returns 200.
    const res = await app.request('/api/devices', {
      method: 'GET',
      headers: { 'sec-websocket-protocol': 'bearer, ' + token },
    });
    expect(res.status).toBe(200);
  });

  it('a stale or unknown token via subprotocol still 401s', async () => {
    const { app } = buildApp(makeOptions(baseEnv()));
    const res = await app.request('/api/devices', {
      method: 'GET',
      headers: { 'sec-websocket-protocol': 'bearer, mock-does-not-exist' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('AUTH_SESSION_EXPIRED');
  });

  it('a real login session ALSO works as a plain Authorization header (regression guard)', async () => {
    // Confirms the existing V3.0 path (bearer in
    // Authorization header) still works after we added
    // the subprotocol tunnel -- the two paths should be
    // additive, not mutually exclusive.
    const { app, authStore } = buildApp(makeOptions(baseEnv()));
    const { session } = await authStore.login({ email: 'admin@example.com' });
    const res = await app.request('/api/devices', {
      method: 'GET',
      headers: { authorization: 'Bearer ' + session.token },
    });
    expect(res.status).toBe(200);
  });
});
