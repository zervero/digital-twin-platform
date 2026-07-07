/**
 * Tests for the OIDC redirect routes (V3.0 T4).
 *
 * These cover the route surface (start, callback happy +
 * error paths). They do NOT spin up a real IdP — discovery
 * and the token endpoint are mocked via vi.spyOn(globalThis,
 * 'fetch').
 */

import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OidcConfig } from '@dt/config';

import { oidcRoute } from '../routes/oidc.js';

const ISSUER = 'https://idp.example.test/';
const AUTHZ = `${ISSUER}authorize`;
const TOKEN = `${ISSUER}token`;

function makeConfig(): OidcConfig {
  return {
    issuerUrl: ISSUER,
    clientId: 'digital-twin',
    audience: 'digital-twin-platform',
    scopes: ['openid', 'profile', 'device:read'],
  };
}

function mockDiscovery(extra?: { tokenStatus?: number; tokenBody?: unknown }) {
  const tokenStatus = extra?.tokenStatus ?? 200;
  const tokenBody = extra?.tokenBody ?? { id_token: 'fake.id.token' };
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('.well-known/openid-configuration')) {
      return new Response(
        JSON.stringify({
          issuer: ISSUER,
          authorization_endpoint: AUTHZ,
          token_endpoint: TOKEN,
          jwks_uri: `${ISSUER}jwks.json`,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (url === TOKEN) {
      return new Response(JSON.stringify(tokenBody), {
        status: tokenStatus,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
}

function makeApp() {
  const app = new Hono();
  app.route('/api/auth/oidc', oidcRoute({ config: makeConfig() }));
  return app;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/auth/oidc/start', () => {
  it('redirects to the issuer authorize endpoint with PKCE + state', async () => {
    mockDiscovery();
    const res = await makeApp().request('/api/auth/oidc/start', { redirect: 'manual' });
    expect(res.status).toBe(302);
    const location = res.headers.get('location')!;
    expect(location.startsWith(AUTHZ)).toBe(true);
    const params = new URL(location).searchParams;
    expect(params.get('response_type')).toBe('code');
    expect(params.get('client_id')).toBe('digital-twin');
    expect(params.get('redirect_uri')).toBe('http://localhost:3001/api/auth/oidc/callback');
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.get('code_challenge')?.length).toBeGreaterThan(20);
    expect(params.get('state')?.length).toBeGreaterThan(10);
    // Two short-lived HttpOnly cookies: state + verifier.
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.length).toBe(2);
    expect(setCookies.some((c) => c.startsWith('dt_oidc_state='))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('dt_oidc_verifier='))).toBe(true);
    expect(setCookies.every((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('returns 503 when discovery fails', async () => {
    // Use a fresh issuer URL so the discovery cache from the
    // earlier tests does not serve the success response.
    const brokenIssuer = 'https://broken-idp.example.test/';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('boom', { status: 500 }),
    );
    const app = new Hono();
    app.route(
      '/api/auth/oidc',
      oidcRoute({
        config: { ...makeConfig(), issuerUrl: brokenIssuer },
      }),
    );
    const res = await app.request('/api/auth/oidc/start');
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('OIDC_DISCOVERY_FAILED');
  });
});

describe('GET /api/auth/oidc/callback', () => {
  it('rejects when state cookie is missing', async () => {
    mockDiscovery();
    const res = await makeApp().request(
      '/api/auth/oidc/callback?code=abc&state=xyz',
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('OIDC_STATE_MISMATCH');
  });

  it('rejects when state query does not match the cookie', async () => {
    mockDiscovery();
    const start = await makeApp().request('/api/auth/oidc/start', { redirect: 'manual' });
    const setCookies = start.headers.getSetCookie();
    const stateCookie = setCookies.find((c) => c.startsWith('dt_oidc_state='))!;
    const verifierCookie = setCookies.find((c) => c.startsWith('dt_oidc_verifier='))!;
    const stateValue = decodeURIComponent(stateCookie.split(';')[0]!.split('=')[1]!);
    const verifierValue = decodeURIComponent(verifierCookie.split(';')[0]!.split('=')[1]!);
    const cb = await makeApp().request(
      `/api/auth/oidc/callback?code=abc&state=wrong-state`,
      {
        headers: {
          cookie: `dt_oidc_state=${stateValue}; dt_oidc_verifier=${verifierValue}`,
        },
      },
    );
    expect(cb.status).toBe(400);
    const body = (await cb.json()) as { error: string };
    expect(body.error).toBe('OIDC_STATE_MISMATCH');
  });

  it('exchanges code + verifier for tokens and sets the session cookie', async () => {
    mockDiscovery();
    const start = await makeApp().request('/api/auth/oidc/start', { redirect: 'manual' });
    const setCookies = start.headers.getSetCookie();
    const stateCookie = setCookies.find((c) => c.startsWith('dt_oidc_state='))!;
    const verifierCookie = setCookies.find((c) => c.startsWith('dt_oidc_verifier='))!;
    const stateValue = decodeURIComponent(stateCookie.split(';')[0]!.split('=')[1]!);
    const verifierValue = decodeURIComponent(verifierCookie.split(';')[0]!.split('=')[1]!);
    const startUrl = new URL(start.headers.get('location')!);
    const state = startUrl.searchParams.get('state')!;

    const cb = await makeApp().request(
      `/api/auth/oidc/callback?code=auth-code-123&state=${state}`,
      {
        headers: {
          cookie: `dt_oidc_state=${stateValue}; dt_oidc_verifier=${verifierValue}`,
        },
      },
    );
    expect(cb.status).toBe(302);
    expect(cb.headers.get('location')).toBe('/');
    const cbCookies = cb.headers.getSetCookie();
    // Session cookie + two clear-cookies for state/verifier.
    expect(cbCookies.some((c) => c.startsWith('dt_oidc_session=fake.id.token'))).toBe(true);
    expect(cbCookies.some((c) => c.startsWith('dt_oidc_state=') && c.includes('Max-Age=0'))).toBe(true);
    expect(cbCookies.some((c) => c.startsWith('dt_oidc_verifier=') && c.includes('Max-Age=0'))).toBe(true);
    // Verify fetch was called with the right token endpoint body.
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const tokenCall = fetchMock.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/token'),
    );
    expect(tokenCall).toBeDefined();
    const body = tokenCall![1]!.body as string;
    expect(body).toContain('grant_type=authorization_code');
    expect(body).toContain('code=auth-code-123');
    expect(body).toContain(`code_verifier=${verifierValue}`);
    expect(body).toContain('client_id=digital-twin');
  });

  it('surfaces IdP error redirects back to the SPA with error info', async () => {
    mockDiscovery();
    const res = await makeApp().request(
      '/api/auth/oidc/callback?error=access_denied&error_description=user%20cancelled',
      { redirect: 'manual' },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('oidc_error=access_denied');
    expect(res.headers.get('location')).toContain('oidc_error_description=user%20cancelled');
    // Both state and verifier cookies are cleared.
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith('dt_oidc_state=') && c.includes('Max-Age=0'))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('dt_oidc_verifier=') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('returns 502 when the token endpoint does not return id_token', async () => {
    mockDiscovery({ tokenBody: { access_token: undefined, id_token: undefined } });
    // Drive the start + callback flow.
    const start = await makeApp().request('/api/auth/oidc/start', { redirect: 'manual' });
    const setCookies = start.headers.getSetCookie();
    const stateCookie = setCookies.find((c) => c.startsWith('dt_oidc_state='))!;
    const verifierCookie = setCookies.find((c) => c.startsWith('dt_oidc_verifier='))!;
    const stateValue = decodeURIComponent(stateCookie.split(';')[0]!.split('=')[1]!);
    const verifierValue = decodeURIComponent(verifierCookie.split(';')[0]!.split('=')[1]!);
    const startUrl = new URL(start.headers.get('location')!);
    const state = startUrl.searchParams.get('state')!;
    const cb = await makeApp().request(
      `/api/auth/oidc/callback?code=abc&state=${state}`,
      {
        headers: {
          cookie: `dt_oidc_state=${stateValue}; dt_oidc_verifier=${verifierValue}`,
        },
      },
    );
    expect(cb.status).toBe(502);
    const body = (await cb.json()) as { error: string };
    expect(body.error).toBe('OIDC_NO_ID_TOKEN');
  });
});
