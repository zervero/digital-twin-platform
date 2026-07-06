/**
 * Auth contract for V2.1.
 *
 * Discriminated `AuthState` keeps consumers honest about the three
 * real states the UI cares about (logged out, logged in, session
 * expired). `RolePermissionMap` is the single source of truth for
 * what each role grants; plugins and the BFF both read it.
 */

export type Role = 'admin' | 'operator' | 'viewer';

export type Permission =
  | 'device:read'
  | 'device:write'
  | 'scene:read'
  | 'scene:write'
  | 'command:send'
  | 'auth:login';

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
  ],
  operator: [
    'device:read', 'device:write',
    'scene:read',
    'command:send',
  ],
  viewer: [
    'device:read',
    'scene:read',
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
}

export type AuthState =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; session: AuthSession }
  | { kind: 'expired'; user: User };

export interface LoginRequest {
  email: string;
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
  | 'AUTH_FORBIDDEN';
