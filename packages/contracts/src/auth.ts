/**
 * Auth contract for V2.1, extended in V3.3 (tenant identity
 * on `AuthSession`) and V3.4 (marketplace permissions).
 *
 * Discriminated `AuthState` keeps consumers honest about the three
 * real states the UI cares about (logged out, logged in, session
 * expired). `ROLE_PERMISSIONS` is the single source of truth for
 * what each role grants; plugins and the BFF both read it.
 *
 * V3.4 extension is additive: the union grew from 6 to 9
 * values, the `ALL_PERMISSIONS` tuple grew in step, and
 * `ROLE_PERMISSIONS` adds the three new permissions to the
 * roles that should grant them. Older auth contracts that
 * exhaustively switch on the V3.3 union need a compile-time
 * bump to add the new cases.
 */

export type Role = 'admin' | 'operator' | 'viewer';

export type Permission =
  | 'device:read'
  | 'device:write'
  | 'scene:read'
  | 'scene:write'
  | 'command:send'
  | 'auth:login'
  // V3.4: marketplace permissions, additive on the V3.3
  // union. `plugin:read` is granted to all roles so the
  // install UI can show "what is installed" without admin.
  // `plugin:install` and `plugin:publish` are admin-only;
  // the BFF's `canInstallForTenant` policy (V3.4 T6) is
  // what enforces the gate at the route layer.
  | 'plugin:read'
  | 'plugin:install'
  | 'plugin:publish';

/**
 * Canonical, ordered list of every Permission value.
 *
 * V3.0: needed by @dt/auth-oidc to filter JWT scope /
 * permissions claims down to known permissions without a
 * runtime cast. Adding a new permission means adding it to
 * both the union above and this tuple; the
 * "as const satisfies readonly Permission[]" annotation
 * makes the second step a compile error if the value is
 * misspelled.
 */
export const ALL_PERMISSIONS = [
  'device:read',
  'device:write',
  'scene:read',
  'scene:write',
  'command:send',
  'auth:login',
  'plugin:read',
  'plugin:install',
  'plugin:publish',
] as const satisfies readonly Permission[];

/**
 * What each role grants by default. The BFF and plugins both
 * consult this map; adding a new permission means adding it here
 * and to every role that should grant it.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  admin: [
    'device:read', 'device:write',
    'scene:read', 'scene:write',
    'command:send', 'auth:login',
    'plugin:read', 'plugin:install', 'plugin:publish',
  ],
  operator: [
    'device:read', 'device:write',
    'scene:read',
    'command:send',
    'plugin:read',
  ],
  viewer: [
    'device:read',
    'scene:read',
    'plugin:read',
  ],
};

export function permissionsFor(roles: readonly Role[]): Permission[] {
  const seen = new Set<Permission>();
  for (const role of roles) {
    for (const perm of ROLE_PERMISSIONS[role]) {
      seen.add(perm);
    }
  }
  return [...seen];
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  roles: Role[];
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
  /**
   * V3.0: permissions granted to the session, sourced from
   * the IdP directly when available. When present, consumers
   * SHOULD use this field instead of `permissionsFor(user.roles)`
   * so role changes in `ROLE_PERMISSIONS` don't silently widen
   * what an already-issued token can do. When absent, the
   * consumer falls back to role-based derivation.
   */
  permissions?: readonly Permission[];
  /**
   * V3.3: tenant ID carried on the session. Sourced from the
   * OIDC JWT's namespaced `tenant_id` claim (see `@dt/tenant`
   * for the default claim name and the `OIDC_TENANT_CLAIM`
   * env-var override). Optional on the type so dev mock
   * providers can mint sessions without a tenant, but the
   * BFF's `requiresTenantScope` middleware rejects sessions
   * with no `tenantId` as 401 `AUTH_NO_TENANT`.
   */
  tenantId?: string;
}

export type AuthState =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; session: AuthSession }
  | { kind: 'expired'; user: User };

export interface LoginRequest {
  email: string;
  /**
   * V3.0: optional roles to attach to the created session.
   * Mock provider honors this; real OIDC providers do not
   * (the IdP is the source of truth). Production never sets
   * this; the dev BFF does so that the smoke can verify
   * permission enforcement without spinning up an IdP.
   */
  roles?: readonly Role[];
}

export interface LoginResponse {
  session: AuthSession;
}

export type MeResponse =
  | { session: AuthSession }
  | { session: null };

export type AuthErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_FORBIDDEN'
  /**
   * V3.3: the session is authenticated but has no tenant
   * claim (or the claim is not a registered tenant). The
   * BFF returns 401 on every tenant-scoped route when this
   * fires. Distinct from `AUTH_FORBIDDEN` (which is the
   * "you have a session but lack the required permission"
   * case) so a dev / smoke script can tell the two apart.
   */
  | 'AUTH_NO_TENANT'
  /**
   * V3.3: the request targets a tenant the caller's session
   * is not part of. Returned by `/api/commands` when the
   * command's `tenantId` does not match the session tenant.
   * Distinct from `AUTH_FORBIDDEN` (permission) so the UI
   * can show a different error message for cross-tenant
   * attempts vs missing-permission attempts.
   */
  | 'TENANT_FORBIDDEN';
