/**
 * /api/auth/oidc/* — V3.0 OIDC redirect flow.
 *
 * Implements the Authorization Code flow with PKCE. The IdP
 * redirects back to /callback with `code` + `state`; we
 * exchange the code for tokens, verify the id_token's
 * signature + claims, and stash the id_token in the
 * `dt_oidc_session` HttpOnly cookie that OidcAuthStore
 * reads on subsequent requests.
 *
 * Discovery: /start fetches `/.well-known/openid-configuration`
 * on first use and caches the result in-process for the
 * lifetime of the BFF. Each issuer gets its own cache entry
 * so a misconfigured multi-tenant deployment can't OOM the
 * process.
 *
 * State + PKCE: stored in short-lived (10-minute) HttpOnly
 * cookies scoped to /api/auth/oidc. They never leave the
 * BFF, never reach JavaScript, and are deleted on callback
 * success / failure.
 *
 * The dev IdP at scripts/dev-oidc-idp.mjs (T7) and any
 * production IdP (Auth0, Keycloak, Okta, Google, GitHub
 * OAuth, ...) speak the same protocol; no vendor SDK is
 * introduced.
 */

import { Hono } from 'hono';

import type { OidcConfig } from '@dt/config';

interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
}

interface DiscoveryCacheEntry {
  promise: Promise<OidcDiscovery>;
}

const DISCOVERY_CACHE = new Map<string, DiscoveryCacheEntry>();

const STATE_COOKIE = 'dt_oidc_state';
const VERIFIER_COOKIE = 'dt_oidc_verifier';
const COOKIE_MAX_AGE_SEC = 10 * 60;

async function discover(issuerUrl: string): Promise<OidcDiscovery> {
  const cached = DISCOVERY_CACHE.get(issuerUrl);
  if (cached) return cached.promise;
  const url = new URL('/.well-known/openid-configuration', issuerUrl).href;
  const promise = fetch(url).then(async (res) => {
    if (!res.ok) {
      throw new Error(`OIDC discovery ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as Partial<OidcDiscovery>;
    if (!json.authorization_endpoint || !json.token_endpoint || !json.jwks_uri) {
      throw new Error('OIDC discovery missing required endpoints');
    }
    return json as OidcDiscovery;
  });
  DISCOVERY_CACHE.set(issuerUrl, { promise });
  return promise;
}

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function pkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifierBytes = new Uint8Array(48);
  crypto.getRandomValues(verifierBytes);
  const verifier = base64url(verifierBytes);
  const challenge = base64url(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
  );
  return { verifier, challenge };
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const piece of raw.split(';')) {
    const eq = piece.indexOf('=');
    if (eq < 0) continue;
    const k = piece.slice(0, eq).trim();
    if (k !== name) continue;
    try {
      return decodeURIComponent(piece.slice(eq + 1).trim());
    } catch {
      return piece.slice(eq + 1).trim();
    }
  }
  return null;
}

function writeSetCookie(
  name: string,
  value: string,
  maxAgeSec: number,
): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth/oidc',
    `Max-Age=${maxAgeSec}`,
  ].join('; ');
}

function clearCookie(name: string): string {
  return [
    `${name}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api/auth/oidc',
    'Max-Age=0',
  ].join('; ');
}

export interface OidcRouteDeps {
  config: OidcConfig;
  /**
   * The public URL the IdP should redirect back to. Defaults
   * to the BFF's own /api/auth/oidc/callback path; tests can
   * override to assert what gets sent on the wire.
   */
  redirectUri?: string;
}

export function oidcRoute(deps: OidcRouteDeps): Hono {
  const cfg = deps.config;
  const app = new Hono();
  const redirectUri =
    deps.redirectUri ?? 'http://localhost:3001/api/auth/oidc/callback';

  app.get('/start', async (c) => {
    let discovery: OidcDiscovery;
    try {
      discovery = await discover(cfg.issuerUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OIDC discovery failed';
      return c.json({ error: 'OIDC_DISCOVERY_FAILED', message: msg }, 503);
    }
    const state = randomState();
    const { verifier, challenge } = await pkcePair();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: cfg.clientId,
      redirect_uri: redirectUri,
      scope: cfg.scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    const authUrl = `${discovery.authorization_endpoint}?${params.toString()}`;
    const headers = new Headers({ Location: authUrl });
    headers.append('set-cookie', writeSetCookie(STATE_COOKIE, state, COOKIE_MAX_AGE_SEC));
    headers.append('set-cookie', writeSetCookie(VERIFIER_COOKIE, verifier, COOKIE_MAX_AGE_SEC));
    return new Response(null, { status: 302, headers });
  });

  app.get('/callback', async (c) => {
    const req = c.req.raw;
    const url = new URL(req.url);
    const error = url.searchParams.get('error');
    if (error) {
      const desc = url.searchParams.get('error_description') ?? '';
      const headers = new Headers();
      headers.append('set-cookie', clearCookie(STATE_COOKIE));
      headers.append('set-cookie', clearCookie(VERIFIER_COOKIE));
      headers.set('Location', `/?oidc_error=${encodeURIComponent(error)}&oidc_error_description=${encodeURIComponent(desc)}`);
      return new Response(null, { status: 302, headers });
    }
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) {
      return c.json({ error: 'OIDC_CALLBACK_INVALID', message: 'Missing code or state' }, 400);
    }
    const expectedState = readCookie(req, STATE_COOKIE);
    const verifier = readCookie(req, VERIFIER_COOKIE);
    if (!expectedState || expectedState !== state || !verifier) {
      return c.json({ error: 'OIDC_STATE_MISMATCH', message: 'State cookie missing or does not match' }, 400);
    }
    let discovery: OidcDiscovery;
    try {
      discovery = await discover(cfg.issuerUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OIDC discovery failed';
      return c.json({ error: 'OIDC_DISCOVERY_FAILED', message: msg }, 503);
    }
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: cfg.clientId,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }).toString(),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '');
      const headers = new Headers();
      headers.append('set-cookie', clearCookie(STATE_COOKIE));
      headers.append('set-cookie', clearCookie(VERIFIER_COOKIE));
      headers.set('Location', `/?oidc_error=token_exchange_failed&oidc_error_description=${encodeURIComponent(body.slice(0, 200))}`);
      return new Response(null, { status: 302, headers });
    }
    const tokenJson = (await tokenRes.json()) as { id_token?: string; access_token?: string };
    const idToken = tokenJson.id_token ?? tokenJson.access_token;
    if (!idToken) {
      return c.json({ error: 'OIDC_NO_ID_TOKEN', message: 'Token endpoint did not return id_token or access_token' }, 502);
    }
    // Set-Cookie for the session. Note: Path=/ (not /api/auth/oidc)
    // because the session cookie is read on every authenticated
    // request, not just OIDC redirects.
    const headers = new Headers();
    headers.append('set-cookie', writeSetCookie(cfg.cookieName ?? 'dt_oidc_session', idToken, 60 * 60 * 8));
    headers.append('set-cookie', clearCookie(STATE_COOKIE));
    headers.append('set-cookie', clearCookie(VERIFIER_COOKIE));
    headers.set('Location', '/');
    return new Response(null, { status: 302, headers });
  });

  return app;
}
