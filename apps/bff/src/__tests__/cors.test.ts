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
