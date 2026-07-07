/**
 * OidcAuthStore — V3.0.
 *
 * Implements `AuthStore` against an external OIDC issuer.
 * Pulls a JWT from the `dt_oidc_session` HttpOnly cookie set
 * by the OIDC redirect callback (T4), verifies it via
 * `@dt/auth-oidc`, and returns an `AuthSession` whose
 * `permissions` field carries the claims directly (so the
 * V2.x role-based fallback is bypassed when an OIDC token is
 * present).
 *
 * `login` throws because OIDC has no direct login endpoint;
 * the BFF mounts `/api/auth/oidc/start` and
 * `/api/auth/oidc/callback` instead (see `routes/oidc.ts`).
 *
 * `logout` clears the session cookie (Max-Age=0). The BFF's
 * `authRoute` is mounted in both modes; for OIDC the
 * `POST /api/auth/logout` handler should call this method.
 */

import { createOidcResolver, verifyJwtWithResolver, type VerifiedSession } from '@dt/auth-oidc';
import {
  type AuthSession,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type User,
} from '@dt/contracts';

import type { OidcConfig } from '@dt/config';

import type { AuthStore } from './store.js';

const DEFAULT_COOKIE_NAME = 'dt_oidc_session';

export class OidcAuthStore implements AuthStore {
  private readonly cookieName: string;
  // Resolver is created lazily on first request so a misconfigured
  // server doesn't crash at boot; the failure is surfaced as
  // JWKS_ERROR on the first request that exercises it.
  private resolverPromise: Promise<ReturnType<typeof createOidcResolver>> | null = null;

  constructor(private readonly config: OidcConfig) {
    this.cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME;
  }

  async login(_req: LoginRequest): Promise<LoginResponse> {
    // OIDC does not have a direct login endpoint. The BFF
    // exposes /api/auth/oidc/start and /api/auth/oidc/callback
    // instead. Reaching this method is a programming error:
    // either the route is mounted in the wrong mode, or a
    // future caller forgot the OIDC start path.
    throw new Error(
      '[auth/oidc] login() is not supported; redirect to /api/auth/oidc/start instead',
    );
  }

  async getMe(headers: Headers): Promise<MeResponse> {
    const token = this.readCookie(headers, this.cookieName);
    if (!token) return { session: null };
    const resolver = await this.getResolver();
    const result = await verifyJwtWithResolver(token, resolver, {
      issuerUrl: this.config.issuerUrl,
      audience: this.config.audience,
    });
    if (!result.ok) {
      // Verification failed: signature, expiry, audience, issuer.
      // We treat all of these as "no session" so callers can
      // cleanly differentiate "anonymous" from "broken config".
      return { session: null };
    }
    return {
      session: toAuthSession(result.session),
    };
  }

  async logout(_headers: Headers): Promise<void> {
    // OIDC logout on the BFF side just clears the session
    // cookie. Real RP-initiated logout (with end_session_endpoint
    // round-trip) is a T4 / T7 follow-up; for V3.0 we keep it
    // cookie-only and let the IdP session expire naturally.
    // The cookie clear is written by the auth route, not here.
  }

  /**
   * Cookie name this store reads from / writes to. Exposed
   * so the auth route can build the matching Set-Cookie header.
   */
  getCookieName(): string {
    return this.cookieName;
  }

  private async getResolver(): Promise<ReturnType<typeof createOidcResolver>> {
    if (!this.resolverPromise) {
      this.resolverPromise = Promise.resolve(
        createOidcResolver({
          issuerUrl: this.config.issuerUrl,
          ...(this.config.jwksUri ? { jwksUri: this.config.jwksUri } : {}),
        }),
      );
    }
    return this.resolverPromise;
  }

  private readCookie(headers: Headers, name: string): string | null {
    const raw = headers.get('cookie');
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
}

function toAuthSession(verified: VerifiedSession): AuthSession {
  // Prefer the standard OIDC claims (`email`, `name`,
  // `preferred_username`) for the AuthSession display fields.
  // Fall back to `sub` for dev IdPs that put the email in the
  // subject (the dev-oidc-idp script in scripts/ does this).
  // We deliberately do NOT synthesize `email` from
  // `${sub}@${issuer}`; that produced nonsense addresses
  // like `admin@example.com@localhost:9999` for any IdP
  // whose subject is already an email.
  const claims = verified.claims;
  const email = typeof claims.email === 'string' && claims.email
    ? claims.email
    : verified.subject;
  const displayName =
    (typeof claims.name === 'string' && claims.name) ||
    (typeof claims.preferred_username === 'string' && claims.preferred_username) ||
    email;
  const user: User = {
    id: `oidc:${verified.subject}`,
    displayName,
    email,
    // Roles are derived from the OIDC permissions in the
    // middleware via permissionsFor; we don't synthesize roles
    // here so the OIDC token stays the source of truth.
    roles: [],
  };
  return {
    user,
    token: 'opaque-session',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    permissions: verified.permissions,
  };
}
