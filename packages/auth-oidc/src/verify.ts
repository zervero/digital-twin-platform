/**
 * @dt/auth-oidc — JWT verification + permission extraction.
 *
 * V3.0 boundary. Host-agnostic and runtime-agnostic: no Vue,
 * no Three, no BFF. Consumers are the BFF (`apps/bff`) and
 * any future server-side plugin that needs to verify a user's
 * identity against an external OIDC issuer.
 *
 * The package depends on `jose` (RSA / EC JWT verification +
 * remote JWKS fetching) and `@dt/contracts` (the canonical
 * `Permission` union). It does NOT introduce a vendor SDK;
 * any OIDC-compliant IdP (Auth0, Keycloak, Okta, Google,
 * GitHub OAuth, etc.) works as long as it signs JWTs with
 * RSA or EC keys and serves a JWKS document.
 */

import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
  type JWTVerifyResult,
} from 'jose';

import { ALL_PERMISSIONS, type Permission } from '@dt/contracts';

/** Default cache TTL for the JWKS resolver (5 minutes). */
const DEFAULT_JWKS_TTL_MS = 5 * 60 * 1000;

/** Cooldown after a JWKS fetch failure (30 seconds). */
const DEFAULT_JWKS_COOLDOWN_MS = 30 * 1000;

export interface OidcVerifyConfig {
  /** The issuer URL — must match the JWT `iss` claim exactly. */
  issuerUrl: string;
  /** The audience claim — must match the JWT `aud` claim. */
  audience: string;
  /** Optional JWKS URI override; defaults to `${issuerUrl}/.well-known/jwks.json`. */
  jwksUri?: string;
  /** Cache TTL for the JWKS, in milliseconds. Defaults to 5 minutes. */
  jwksTtlMs?: number;
  /**
   * Cache cooldown after a JWKS fetch failure, in milliseconds.
   * Defaults to 30 seconds.
   */
  jwksCooldownMs?: number;
}

export interface VerifiedSession {
  /** The `sub` claim of the verified token. */
  subject: string;
  /** Permissions extracted from `scope` / `permissions` claims. */
  permissions: readonly Permission[];
  /** The full JWT payload, for downstream consumers that need more claims. */
  claims: JWTPayload;
}

/**
 * Result type for `verifyJwt`. The `ok` discriminator lets
 * callers branch on outcome without try/catch. Each `code` is
 * stable and machine-readable; the `message` is for logs only.
 */
export type VerifyResult =
  | { ok: true; session: VerifiedSession }
  | {
      ok: false;
      code:
        | 'EXPIRED'
        | 'BAD_SIGNATURE'
        | 'BAD_AUDIENCE'
        | 'BAD_ISSUER'
        | 'JWKS_ERROR'
        | 'UNKNOWN';
      message: string;
    };

const PERMISSION_SET: ReadonlySet<string> = new Set<string>(ALL_PERMISSIONS);

/**
 * Verify a JWT against an issuer's JWKS and extract the user's
 * permissions.
 *
 * On success, returns `{ ok: true, session: { subject, permissions, claims } }`.
 * On failure, returns a discriminated `{ ok: false, code, message }`.
 *
 * `code` values:
 * - `EXPIRED`: the `exp` claim is in the past.
 * - `BAD_SIGNATURE`: the JWT signature did not verify against the JWKS.
 * - `BAD_AUDIENCE`: the `aud` claim does not match `config.audience`.
 * - `BAD_ISSUER`: the `iss` claim does not match `config.issuerUrl`.
 * - `JWKS_ERROR`: the JWKS fetch / parse failed.
 * - `UNKNOWN`: any other verification error.
 */
export async function verifyJwt(
  token: string,
  config: OidcVerifyConfig,
): Promise<VerifyResult> {
  let jwksResolver: JWTVerifyGetKey;
  try {
    const jwksEndpoint =
      config.jwksUri ??
      new URL('/.well-known/jwks.json', config.issuerUrl).href;
    jwksResolver = createRemoteJWKSet(new URL(jwksEndpoint), {
      cacheMaxAge: config.jwksTtlMs ?? DEFAULT_JWKS_TTL_MS,
      cooldownDuration: config.jwksCooldownMs ?? DEFAULT_JWKS_COOLDOWN_MS,
    });
  } catch (e) {
    return {
      ok: false,
      code: 'JWKS_ERROR',
      message: e instanceof Error ? e.message : String(e),
    };
  }
  return verifyJwtWithResolver(token, jwksResolver, {
    issuerUrl: config.issuerUrl,
    audience: config.audience,
  });
}

/**
 * Like `verifyJwt` but takes a pre-built resolver. Lets tests
 * inject a local JWKS via `createLocalJWKSet` so the suite
 * runs offline and deterministically. Production should use
 * `verifyJwt`; this is exported for callers that want to manage
 * resolver lifecycle (e.g., sharing one resolver across many
 * tokens).
 */
export async function verifyJwtWithResolver(
  token: string,
  jwksResolver: JWTVerifyGetKey,
  opts: { issuerUrl: string; audience: string },
): Promise<VerifyResult> {
  let result: JWTVerifyResult;
  try {
    result = await jwtVerify(token, jwksResolver, {
      issuer: opts.issuerUrl,
      audience: opts.audience,
    });
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const message = err.message ?? 'JWT verification failed';
    if (err.code === 'ERR_JWT_EXPIRED') {
      return { ok: false, code: 'EXPIRED', message };
    }
    if (err.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      return { ok: false, code: 'BAD_SIGNATURE', message };
    }
    if (err.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      // jose reports aud / iss claim mismatches under this code.
      // We disambiguate by reading the message — the signature
      // check has already passed at this point.
      if (/aud/i.test(message)) {
        return { ok: false, code: 'BAD_AUDIENCE', message };
      }
      if (/iss/i.test(message)) {
        return { ok: false, code: 'BAD_ISSUER', message };
      }
    }
    return { ok: false, code: 'UNKNOWN', message };
  }

  const permissions = extractPermissions(result.payload);
  const subject =
    typeof result.payload.sub === 'string' ? result.payload.sub : '';
  return {
    ok: true,
    session: {
      subject,
      permissions,
      claims: result.payload,
    },
  };
}

/**
 * Parse the `scope` (space-separated string, OIDC standard) and
 * `permissions` (JSON array, Auth0-style) claims into the
 * `Permission` union from `@dt/contracts`.
 *
 * Unknown values are dropped silently. Duplicate values are
 * deduped. The order follows the input claims (stable in
 * practice).
 */
export function extractPermissions(payload: JWTPayload): readonly Permission[] {
  const out: Permission[] = [];
  if (typeof payload.scope === 'string') {
    for (const p of payload.scope.split(/\s+/).filter(Boolean)) {
      if (PERMISSION_SET.has(p) && !out.includes(p as Permission)) {
        out.push(p as Permission);
      }
    }
  }
  if (Array.isArray(payload.permissions)) {
    for (const p of payload.permissions) {
      if (typeof p === 'string' && PERMISSION_SET.has(p)) {
        if (!out.includes(p as Permission)) {
          out.push(p as Permission);
        }
      }
    }
  }
  return out;
}
