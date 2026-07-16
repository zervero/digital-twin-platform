/**
 * Auth factory — V3.0.
 *
 * Picks the right AuthStore implementation based on
 * `env.authProvider`. MockAuthStore keeps the V2.1 / V2.3
 * dev experience (POST /api/auth/login with email -> mock
 * bearer token). OidcAuthStore uses the env.oidc config from
 * T2 to verify JWTs presented via the session cookie set by
 * the OIDC redirect callback (T4).
 *
 * In dev, AUTH_PROVIDER=oidc without a complete OIDC config
 * falls back to MockAuthStore so the existing dev loop keeps
 * working. Production with oidc + missing config throws at
 * the config layer (T2) before this factory is reached.
 */

import type { AppEnv } from '@dt/config';

import type { TenantUserDirectory } from '../admin/user-directory.js';
import { MockAuthStore } from './mock-store.js';
import { OidcAuthStore } from './oidc-store.js';
import type { AuthStore } from './store.js';

export type { AuthStore } from './store.js';
export { AuthError } from './store.js';
export { MockAuthStore } from './mock-store.js';
export { OidcAuthStore } from './oidc-store.js';

export interface CreateAuthStoreOptions {
  /** V4 T11: shared with admin users routes for demo seeding. */
  userDirectory?: TenantUserDirectory;
}

export function createAuthStore(
  env: AppEnv,
  opts: CreateAuthStoreOptions = {},
): AuthStore {
  if (env.authProvider === 'oidc') {
    if (!env.oidc) {
      // Production throws at config validation; dev may reach
      // this branch when the user set AUTH_PROVIDER=oidc but
      // forgot the OIDC_* vars. Fall back to mock with a clear
      // log so the dev loop still works.
      if (env.production) {
        throw new Error(
          '[bff] AUTH_PROVIDER=oidc requires OIDC_* env vars (see @dt/config)',
        );
      }
      return new MockAuthStore(opts.userDirectory);
    }
    return new OidcAuthStore(env.oidc);
  }
  return new MockAuthStore(opts.userDirectory);
}
