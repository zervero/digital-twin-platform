/**
 * AuthStore — V2.1 baseline, carried into V3.0 with
 * headers-based methods.
 *
 * Both the in-memory mock and the real OIDC provider expose
 * the same surface so the BFF routes + `requiresPermission`
 * middleware don't need to know which provider is active.
 *
 * V3.0 changes:
 * - `getMe(headers)` instead of `getMe(token)`. Each provider
 *   extracts its own credential shape (bearer for mock,
 *   session cookie for OIDC).
 * - `logout(headers)` follows the same rule. Mock invalidates
 *   the bearer token; OIDC clears the session cookie (see
 *   oidc-store.ts for the cookie write/read helpers).
 *
 * Authenticated requests always yield an `AuthSession` via
 * `MeResponse`. Anonymous or invalid requests yield
 * `{ session: null }` — never throw. The route layer is
 * responsible for translating that to a 401.
 */

import {
  type AuthErrorCode,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type Role,
} from '@dt/contracts';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface AuthStore {
  login(req: LoginRequest): Promise<LoginResponse>;
  getMe(headers: Headers): Promise<MeResponse>;
  logout(headers: Headers): Promise<void>;
  /**
   * V4 T11: optional hook used by admin role assignment to
   * sync live sessions after a directory update. MockAuthStore
   * implements this; OIDC leaves it undefined (IdP is SoT).
   */
  updateUserRoles?(userId: string, roles: readonly Role[]): Promise<void>;
}
