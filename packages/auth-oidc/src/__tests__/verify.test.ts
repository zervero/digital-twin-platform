/**
 * Tests for @dt/auth-oidc (V3.0).
 *
 * Uses a locally generated RSA key pair and `createLocalJWKSet`
 * so no HTTP server is needed. The production path
 * (`verifyJwt`) builds a remote resolver from the issuer URL;
 * tests exercise the resolver-agnostic `verifyJwtWithResolver`
 * for the same code paths.
 */

import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type JSONWebKeySet,
  type KeyLike,
  SignJWT,
} from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  extractPermissions,
  verifyJwt,
  verifyJwtWithResolver,
} from '../verify.js';

const ISSUER = 'https://idp.example.test/';
const AUDIENCE = 'digital-twin-platform';
const SUB = 'user-123';

interface Fixture {
  publicJwk: JWK;
  privateKey: KeyLike;
  resolver: ReturnType<typeof makeResolver>;
}

function makeResolver(jwks: JSONWebKeySet) {
  // createLocalJWKSet takes a JSONWebKeySet (an object with a
  // `keys` array) and serves keys synchronously. The resolver
  // signature matches what createRemoteJWKSet returns, so
  // verifyJwtWithResolver can accept it directly.
  return createLocalJWKSet(jwks);
}

async function sign(
  claims: Record<string, unknown>,
  key: KeyLike,
  overrides?: { audience?: string; issuer?: string },
): Promise<string> {
  let builder = new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(overrides?.issuer ?? ISSUER)
    .setAudience(overrides?.audience ?? AUDIENCE)
    .setSubject(SUB)
    .setIssuedAt();
  if (typeof claims['exp'] !== 'number') {
    builder = builder.setExpirationTime('5m');
  }
  return builder.sign(key);
}

let fixture: Fixture;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk: JWK = {
    ...(await exportJWK(publicKey)),
    kid: 'test-kid',
    alg: 'RS256',
  };
  fixture = {
    publicJwk,
    privateKey,
    resolver: makeResolver({ keys: [publicJwk] }),
  };
});

afterAll(() => {
  // nothing to clean up; vitest drops the module graph.
});

describe('verifyJwtWithResolver', () => {
  it('accepts a valid RS256 JWT with iss + aud + sub + scope', async () => {
    const token = await sign(
      { scope: 'device:read device:write scene:read' },
      fixture.privateKey,
    );
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.subject).toBe(SUB);
    expect(result.session.permissions).toEqual([
      'device:read',
      'device:write',
      'scene:read',
    ]);
    expect(result.session.claims.iss).toBe(ISSUER);
    expect(result.session.claims.aud).toBe(AUDIENCE);
  });

  it('returns BAD_AUDIENCE when aud claim does not match', async () => {
    const token = await sign(
      { scope: 'device:read' },
      fixture.privateKey,
      { audience: 'some-other-audience' },
    );
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('BAD_AUDIENCE');
  });

  it('returns BAD_ISSUER when iss claim does not match', async () => {
    const token = await sign(
      { scope: 'device:read' },
      fixture.privateKey,
      { issuer: 'https://other-idp.example.test/' },
    );
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('BAD_ISSUER');
  });

  it('returns EXPIRED for a token whose exp is in the past', async () => {
    // Issue a token that has already expired (exp = 1 second ago).
    const expired = Math.floor(Date.now() / 1000) - 1;
    const token = await sign({ scope: 'device:read', exp: expired }, fixture.privateKey);

    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('EXPIRED');
  });

  it('accepts a JWT with the Auth0-style `permissions` array claim', async () => {
    const token = await sign(
      { permissions: ['device:read', 'scene:read'] },
      fixture.privateKey,
    );
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.permissions).toEqual(['device:read', 'scene:read']);
  });

  it('drops unknown permission values from `scope`', async () => {
    const token = await sign(
      { scope: 'unknown:perm device:read also:unknown scene:write' },
      fixture.privateKey,
    );
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.permissions).toEqual(['device:read', 'scene:write']);
  });

  it('returns BAD_SIGNATURE when the JWT was signed with a different key', async () => {
    // Generate a SECOND key pair the resolver does not know about.
    const { privateKey: otherPrivate } = await generateKeyPair('RS256');
    const token = await sign({ scope: 'device:read' }, otherPrivate);
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('BAD_SIGNATURE');
  });
});

describe('extractPermissions', () => {
  it('extracts from scope (space-separated string)', () => {
    expect(
      extractPermissions({ scope: 'device:read device:write' }),
    ).toEqual(['device:read', 'device:write']);
  });

  it('extracts from permissions (JSON array)', () => {
    expect(
      extractPermissions({ permissions: ['device:read', 'scene:write'] }),
    ).toEqual(['device:read', 'scene:write']);
  });

  it('merges scope + permissions and dedupes', () => {
    expect(
      extractPermissions({
        scope: 'device:read device:write',
        permissions: ['device:read', 'scene:read'],
      }),
    ).toEqual(['device:read', 'device:write', 'scene:read']);
  });

  it('returns empty array for an empty payload', () => {
    expect(extractPermissions({})).toEqual([]);
  });

  it('ignores malformed scope (non-string) and permissions (non-array)', () => {
    expect(
      // Cast through unknown so the test can pass invalid shapes
      // that the runtime contract rejects without a type error.
      extractPermissions({ scope: 123, permissions: 'device:read' } as unknown as Parameters<typeof extractPermissions>[0]),
    ).toEqual([]);
  });
});

describe('verifyJwt (production path)', () => {
  it('returns JWKS_ERROR when the issuer URL is malformed', async () => {
    const token = await sign({ scope: 'device:read' }, fixture.privateKey);
    const result = await verifyJwt(token, {
      issuerUrl: 'not-a-real-url',
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('JWKS_ERROR');
  });
});
