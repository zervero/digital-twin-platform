/**
 * MockAuthStore — V2.1 baseline, carried into V3.0 with a
 * headers-based AuthStore interface.
 *
 * In-memory replacement for a real auth provider. Any
 * well-formed email returns a user with the `viewer` role so
 * the smoke and the dev UI can drive the flow without a
 * database. The mock delivers credentials via
 * `Authorization: Bearer mock-<uuid>` (same shape the V2.x
 * smoke tests expect).
 *
 * V3.0 changes:
 * - `AuthStore.getMe(token)` -> `AuthStore.getMe(headers)`.
 *   The mock extracts the bearer token from the request
 *   headers itself so callers don't need to know the
 *   transport.
 * - Same change for `logout`.
 * - AuthError moved to `auth/store.ts` so the OIDC store can
 *   raise the same typed error from `login()` without a
 *   cross-module import (and so the test suite can import it
 *   from a single place).
 *
 * V3.3 tenant claim: every minted session gets the dev
 * default `tenantId: 'acme-corp'`. The existing `smoke:v2`
 * and `smoke:oidc` smokes depend on this so they keep
 * passing under the new `requiresTenantScope` middleware
 * without changes. Test fixtures that probe the
 * `AUTH_NO_TENANT` path construct an `AuthSession` directly
 * with `tenantId` omitted.
 */

import { randomUUID } from 'node:crypto';

import {
  type AuthSession,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type Role,
  type User,
} from '@dt/contracts';

import { AuthError, type AuthStore } from './store.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class MockAuthStore implements AuthStore {
  private readonly sessions = new Map<string, AuthSession>();

  async login(req: LoginRequest): Promise<LoginResponse> {
    if (!EMAIL_RE.test(req.email)) {
      throw new AuthError('AUTH_INVALID_CREDENTIALS', 'Email is not well-formed');
    }
    // V3.0: callers may pass `roles` (e.g. the smoke) to
    // drive permission tests. The mock trusts the value; a
    // real OIDC provider would never honor this — the IdP
    // issues claims, not the client. Production never sets
    // it; the dev BFF / smoke does.
    const roles: readonly Role[] =
      req.roles && req.roles.length > 0 ? req.roles : ['viewer'];
    const user: User = {
      id: `user-${req.email}`,
      displayName: req.email.split('@')[0]!,
      email: req.email,
      roles: [...roles],
    };
    const session: AuthSession = {
      user,
      token: `mock-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      // V3.3: every dev session gets the default tenant so
      // existing smokes / dev loops keep working under
      // `requiresTenantScope`. T5 splits this into 3
      // tenants via the `LoginRequest` (out of scope for
      // T4; the mock store does not yet accept a tenantId
      // parameter because no smoke needs it).
      tenantId: 'acme-corp',
    };
    this.sessions.set(session.token, session);
    return { session };
  }

  async getMe(headers: Headers): Promise<MeResponse> {
    const token = extractBearer(headers.get('authorization'));
    if (!token) return { session: null };
    const session = this.sessions.get(token);
    return session ? { session } : { session: null };
  }

  async logout(headers: Headers): Promise<void> {
    const token = extractBearer(headers.get('authorization'));
    if (token) this.sessions.delete(token);
  }
}

function extractBearer(header: string | null): string {
  if (!header) return '';
  const trimmed = header.trim();
  return trimmed.toLowerCase().startsWith('bearer ')
    ? trimmed.slice('Bearer '.length).trim()
    : '';
}
