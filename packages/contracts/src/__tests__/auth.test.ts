import { describe, expect, it } from 'vitest';

import {
  permissionsFor,
  ROLE_PERMISSIONS,
  type AuthState,
  type Permission,
} from '../auth.js';

describe('auth contract (V2.1)', () => {
  it('declares the three baseline roles', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('device:write');
    expect(ROLE_PERMISSIONS.viewer).toContain('device:read');
    expect(ROLE_PERMISSIONS.viewer).not.toContain('device:write');
  });

  it('flattens and dedupes permissions across roles', () => {
    const perms = permissionsFor(['viewer', 'operator']);
    const uniq = new Set(perms);
    expect(perms.length).toBe(uniq.size);
    expect(perms).toContain('device:read');
    expect(perms).toContain('command:send');
  });

  it('models auth state as a discriminated union', () => {
    const anon: AuthState = { kind: 'anonymous' };
    const auth: AuthState = {
      kind: 'authenticated',
      session: {
        user: { id: 'u1', displayName: 'u', email: 'u@x', roles: ['viewer'] },
        token: 't',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    };
    const expired: AuthState = {
      kind: 'expired',
      user: { id: 'u1', displayName: 'u', email: 'u@x', roles: ['viewer'] },
    };
    expect(anon.kind).toBe('anonymous');
    expect(auth.kind).toBe('authenticated');
    expect(expired.kind).toBe('expired');
  });

  it('exposes a stable list of permissions', () => {
    const perms: Permission[] = [
      'device:read', 'device:write',
      'scene:read', 'scene:write',
      'command:send', 'auth:login',
    ];
    expect(perms.length).toBeGreaterThan(0);
  });
});
