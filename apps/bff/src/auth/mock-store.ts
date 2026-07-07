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
 */

import { randomUUID } from 'node:crypto';

import {
  type AuthSession,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
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
    const user: User = {
      id: `user-${req.email}`,
      displayName: req.email.split('@')[0]!,
      email: req.email,
      roles: ['viewer'],
    };
    const session: AuthSession = {
      user,
      token: `mock-${randomUUID()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
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
