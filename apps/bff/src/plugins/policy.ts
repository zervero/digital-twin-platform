/**
 * V3.4: marketplace policy gate.
 *
 * `requiresTenantScope` (V3.3) already enforces the
 * tenant boundary (the session's tenant claim must
 * resolve through the tenant registry). This module
 * adds the marketplace-specific rule that operators /
 * viewers cannot install / publish even though they
 * have `plugin:read`. The union extension in T3 grants
 * `plugin:read` to operators and viewers; this policy
 * is what keeps install / publish behind admin.
 *
 * Note: the V3.4 plan text says
 * `me.session.permissions ?? []`, but `MockAuthStore`
 * (and any other session source that does not stamp
 * the explicit `permissions` field) would fall through
 * to the empty array and even an admin role would be
 * denied. The helper below falls back to
 * `permissionsFor(roles)` -- the same derivation the
 * `requiresTenantScope` middleware uses -- so the
 * marketplace policy and the tenant gate stay
 * consistent. A session whose `permissions` field is
 * present is honored as-is.
 */

import { permissionsFor, type Permission } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
}

export async function canInstallForTenant(
  store: AuthStore,
  headers: Headers,
  tenantId: string,
): Promise<PolicyResult> {
  const me = await store.getMe(headers);
  if (!me.session) return { allowed: false, reason: 'no session' };
  if (me.session.tenantId !== tenantId) {
    return { allowed: false, reason: 'tenant mismatch' };
  }
  const permissions =
    me.session.permissions ?? permissionsFor(me.session.user.roles);
  if (!permissions.includes('plugin:install' as Permission)) {
    return { allowed: false, reason: 'missing plugin:install' };
  }
  return { allowed: true };
}

export async function canPublish(
  store: AuthStore,
  headers: Headers,
): Promise<PolicyResult> {
  const me = await store.getMe(headers);
  if (!me.session) return { allowed: false, reason: 'no session' };
  const permissions =
    me.session.permissions ?? permissionsFor(me.session.user.roles);
  if (!permissions.includes('plugin:publish' as Permission)) {
    return { allowed: false, reason: 'missing plugin:publish' };
  }
  return { allowed: true };
}
