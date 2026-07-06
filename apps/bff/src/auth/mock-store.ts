/**
 * MockAuthStore — V2.1 only.
 *
 * Deterministic in-memory replacement for a real auth provider.
 * Any well-formed email returns a user with the `viewer` role
 * so the smoke and the dev UI can drive the flow without a
 * database. V3 swaps this for a real provider behind the same
 * `AuthStore` interface (out of scope here).
 */

import { randomUUID } from 'node:crypto';

import {
  type AuthErrorCode,
  type AuthSession,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type User,
} from '@dt/contracts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthStore {
  login(req: LoginRequest): Promise<LoginResponse>;
  getMe(token: string): Promise<MeResponse>;
  logout(token: string): Promise<void>;
}

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

  async getMe(token: string): Promise<MeResponse> {
    const session = this.sessions.get(token);
    return session ? { session } : { session: null };
  }

  async logout(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
