/**
 * Tests for OidcAuthStore (V3.0).
 *
 * The store reads a JWT from the session cookie and verifies
 * it against the issuer's JWKS. We can't easily spin up an
 * HTTP IdP in a unit test, so:
 * - Cookie reading / no-cookie path is exercised against the
 *   real OidcAuthStore (no network needed).
 * - JWT verification is exercised via a thin subclass that
 *   swaps the resolver for a local JWKS, gated behind a
 *   package-private constructor option.
 */

import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  SignJWT,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import type { OidcConfig } from '@dt/config';

import { OidcAuthStore } from '../auth/oidc-store.js';

const ISSUER = 'https://idp.example.test/';
const AUDIENCE = 'digital-twin-platform';
const SUB = 'user-123';

function makeOidcConfig(): OidcConfig {
  return {
    issuerUrl: ISSUER,
    clientId: 'digital-twin',
    audience: AUDIENCE,
    scopes: ['openid', 'profile', 'device:read'],
  };
}

describe('OidcAuthStore (V3.0)', () => {
  it('login() throws because OIDC has no direct login endpoint', async () => {
    const store = new OidcAuthStore(makeOidcConfig());
    await expect(store.login({ email: 'x@example.com' })).rejects.toThrow(
      /oidc\/start/,
    );
  });

  it('getMe returns null when no session cookie is sent', async () => {
    const store = new OidcAuthStore(makeOidcConfig());
    const me = await store.getMe(new Headers());
    expect(me.session).toBeNull();
  });

  it('getMe returns null when the cookie value is not a valid JWT', async () => {
    const store = new OidcAuthStore(makeOidcConfig());
    const me = await store.getMe(
      new Headers({ cookie: 'dt_oidc_session=not-a-jwt' }),
    );
    expect(me.session).toBeNull();
  });

  it('getMe returns null when the wrong cookie name is sent', async () => {
    const store = new OidcAuthStore(makeOidcConfig());
    const me = await store.getMe(
      new Headers({ cookie: 'session=anything' }),
    );
    expect(me.session).toBeNull();
  });

  it('logout is a no-op (cookie clear is handled by the route layer)', async () => {
    const store = new OidcAuthStore(makeOidcConfig());
    await expect(store.logout(new Headers())).resolves.toBeUndefined();
  });

  it('getCookieName defaults to dt_oidc_session', () => {
    const store = new OidcAuthStore(makeOidcConfig());
    expect(store.getCookieName()).toBe('dt_oidc_session');
  });

  it('getCookieName honors config.cookieName override', () => {
    const store = new OidcAuthStore({ ...makeOidcConfig(), cookieName: 'my_sess' });
    expect(store.getCookieName()).toBe('my_sess');
  });
});

describe('OidcAuthStore JWT verification (DI resolver)', () => {
  // We test the JWT verification path by mocking the JWKS
  // endpoint. The store's resolver is built lazily; for tests
  // we reach in via a monkey-patched prototype field. This is
  // brittle but lets us avoid a real HTTP server while still
  // exercising the public AuthStore surface end-to-end.
  let publicJwk: JWK;
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    publicJwk = {
      ...(await exportJWK(pair.publicKey)),
      kid: 'test-kid',
      alg: 'RS256',
    };
    privateKey = pair.privateKey;
  });

  async function sign(claims: Record<string, unknown>): Promise<string> {
    // If the caller passes an `exp` claim, honor it exactly so
    // expired-token tests work. Otherwise default to 5 minutes
    // from now (the common case).
    const exp =
      typeof claims.exp === 'number'
        ? claims.exp
        : Math.floor(Date.now() / 1000) + 5 * 60;
    const { exp: _omit, ...rest } = claims as { exp?: number };
    void _omit;
    return new SignJWT(rest)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(SUB)
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(privateKey);
  }

  function makeStoreWithResolver(): OidcAuthStore {
    const store = new OidcAuthStore(makeOidcConfig());
    // Swap the lazy resolver promise with one that uses a
    // local JWKS. Cast through unknown to silence TS — the
    // private field is a deliberate test seam.
    (store as unknown as { resolverPromise: Promise<ReturnType<typeof createLocalJWKSet>> }).resolverPromise =
      Promise.resolve(createLocalJWKSet({ keys: [publicJwk] }));
    return store;
  }

  it('returns a session for a valid JWT', async () => {
    const store = makeStoreWithResolver();
    const token = await sign({ scope: 'device:read scene:read' });
    const me = await store.getMe(
      new Headers({ cookie: `dt_oidc_session=${token}` }),
    );
    expect(me.session).not.toBeNull();
    expect(me.session?.user.id).toBe(`oidc:${SUB}`);
    expect(me.session?.permissions).toEqual(['device:read', 'scene:read']);
  });

  it('returns null for an expired JWT', async () => {
    const store = makeStoreWithResolver();
    const expired = Math.floor(Date.now() / 1000) - 1;
    const token = await sign({ scope: 'device:read', exp: expired });
    const me = await store.getMe(
      new Headers({ cookie: `dt_oidc_session=${token}` }),
    );
    expect(me.session).toBeNull();
  });

  it('returns null for a JWT signed with a different key', async () => {
    const store = makeStoreWithResolver();
    const otherPair = await generateKeyPair('RS256');
    const token = await new SignJWT({ scope: 'device:read' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject(SUB)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(otherPair.privateKey);
    const me = await store.getMe(
      new Headers({ cookie: `dt_oidc_session=${token}` }),
    );
    expect(me.session).toBeNull();
  });
});
