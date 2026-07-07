/**
 * Tests for the V3.3 tenant-claim extraction in
 * `@dt/auth-oidc`. Reuses the local-JWKS pattern from
 * `verify.test.ts` (no HTTP server) but in its own file so
 * the V3.0 surface and the V3.3 addition can evolve
 * independently.
 *
 * Three cases:
 *   1. JWT carries the default tenant claim -> `tenantId`
 *      is set on `VerifiedSession`.
 *   2. JWT has no tenant claim -> `tenantId` is `undefined`
 *      (NOT `null`, per the spec note in V3.3 plan T3 --
 *      normalizing missing-vs-present to a single sentinel
 *      would leak the difference into downstream code that
 *      only needs to know "is there a tenant?").
 *   3. Custom claim name override: `OidcVerifyConfig`
 *      reads `tenantClaimName` and `verifyJwtWithResolver`
 *      honors it. A deployment that uses Auth0 should not
 *      have to fork this package.
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
import { beforeAll, describe, expect, it } from 'vitest';

import { TENANT_ID_CLAIM } from '@dt/tenant';

import { verifyJwt, verifyJwtWithResolver } from '../verify.js';

const ISSUER = 'https://idp.example.test/';
const AUDIENCE = 'digital-twin-platform';
const SUB = 'user-123';

interface Fixture {
  publicJwk: JWK;
  privateKey: KeyLike;
  resolver: ReturnType<typeof createLocalJWKSet>;
}

async function sign(
  claims: Record<string, unknown>,
  key: KeyLike,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(SUB)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
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
    resolver: createLocalJWKSet({ keys: [publicJwk] } satisfies JSONWebKeySet),
  };
});

describe('verifyJwtWithResolver — V3.3 tenant claim extraction', () => {
  it('surfaces tenantId when the default claim is present', async () => {
    const token = await sign(
      { [TENANT_ID_CLAIM]: 'acme-corp' },
      fixture.privateKey,
    );
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.tenantId).toBe('acme-corp');
  });

  it('leaves tenantId undefined when the claim is missing', async () => {
    // No tenant claim at all.
    const token = await sign({ scope: 'device:read' }, fixture.privateKey);
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Spec note in V3.3 T3: must be `undefined`, not `null`,
    // so downstream code does not have to handle both
    // "missing" and "present-but-falsy" as separate cases.
    expect(result.session.tenantId).toBeUndefined();
    expect('tenantId' in result.session).toBe(false);
  });

  it('honors a custom tenantClaimName', async () => {
    const customClaim = 'https://auth.example.test/tenant_id';
    const token = await sign(
      { [customClaim]: 'globex-ind' },
      fixture.privateKey,
    );
    const result = await verifyJwtWithResolver(token, fixture.resolver, {
      issuerUrl: ISSUER,
      audience: AUDIENCE,
      tenantClaimName: customClaim,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.tenantId).toBe('globex-ind');
  });
});

describe('verifyJwt — V3.3 tenantClaimName passthrough', () => {
  // This test verifies the production path forwards
  // tenantClaimName from OidcVerifyConfig into the resolver
  // call. We can't exercise the real `verifyJwt` (it builds a
  // remote JWKS resolver and would need an HTTP server), but
  // we can use a malformed issuer URL to short-circuit the
  // resolver construction -- which is enough to prove the
  // config field is accepted. The end-to-end claim extraction
  // path is already covered by the verifyJwtWithResolver suite
  // above.
  it('accepts a tenantClaimName in OidcVerifyConfig', async () => {
    const result = await verifyJwt('not-a-real-token', {
      issuerUrl: 'not-a-real-url',
      audience: AUDIENCE,
      tenantClaimName: 'https://example.test/tenant_id',
    });
    // The malformed issuer URL surfaces as JWKS_ERROR before
    // any claim extraction runs. All this test asserts is that
    // the config field typechecks and the call returns
    // gracefully (no thrown exception from an unknown config
    // field).
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('JWKS_ERROR');
  });
});
