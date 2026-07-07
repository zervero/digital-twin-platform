/**
 * requiresTenantScope — V3.3 T4.
 *
 * Like `requiresPermission` (V3.0) but additionally:
 *   1. reads `session.tenantId` (sourced from the OIDC
 *      JWT's tenant claim via `@dt/auth-oidc`, or from
 *      the mock store's default `acme-corp`);
 *   2. resolves the tenant through `resolveTenant` so a
 *      stale or unknown tenant id surfaces as 401
 *      `AUTH_NO_TENANT` rather than letting the request
 *      reach a route handler;
 *   3. sets `c.var.tenant` (the `TenantContext` shape from
 *      `@dt/tenant`) so downstream handlers can read the
 *      resolved tenant without recomputing.
 *
 * Scope per V3.3 plan:
 *   - T4 wires the gate (this file). Routes are now
 *     tenant-scoped at the security boundary, but the
 *     data they return is still global. T6 will filter
 *     `/api/devices`, `/api/scene`, `/api/commands` to
 *     the caller's tenant; T7 will filter the realtime
 *     broadcaster.
 *   - `/health`, `/api/auth/*`, and `/api/auth/oidc/*`
 *     stay on `requiresPermission` (or no middleware)
 *     because they run before any tenant is known.
 */

import type { MiddlewareHandler } from 'hono';

import {
  permissionsFor,
  type Permission,
  type User,
} from '@dt/contracts';
import type { TenantContext } from '@dt/tenant';

import type { AuthStore } from '../auth/store.js';
import { resolveTenant } from '../tenants/resolve.js';

declare module 'hono' {
  interface ContextVariableMap {
    user?: User;
    permissions?: Permission[];
    /**
     * V3.3: the resolved tenant for this request. Set by
     * `requiresTenantScope` after the tenant id is read
     * from the session and looked up in the registry.
     * Undefined for routes that don't need tenant scope.
     */
    tenant?: TenantContext;
  }
}

export function requiresTenantScope(
  store: AuthStore,
  required: Permission,
): MiddlewareHandler {
  return async (c, next) => {
    const me = await store.getMe(c.req.raw.headers);
    if (!me.session) {
      return c.json(
        { error: 'AUTH_SESSION_EXPIRED', message: 'Session not found' },
        401,
      );
    }

    // V3.3: tenant is required for every scoped route.
    // The OIDC store copies `VerifiedSession.tenantId` here;
    // the mock store mints a default dev `tenantId` (see
    // `mock-store.ts`). Both surface `AuthSession.tenantId`
    // as `string | undefined`, never `null`.
    const tenantId = me.session.tenantId;
    if (!tenantId) {
      return c.json(
        { error: 'AUTH_NO_TENANT', message: 'Session has no tenant' },
        401,
      );
    }
    const tenant = resolveTenant(tenantId);
    if (!tenant) {
      return c.json(
        { error: 'AUTH_NO_TENANT', message: `Unknown tenant: ${tenantId}` },
        401,
      );
    }

    const permissions =
      me.session.permissions ?? permissionsFor(me.session.user.roles);
    if (!permissions.includes(required)) {
      return c.json(
        { error: 'AUTH_FORBIDDEN', message: `Missing permission: ${required}` },
        403,
      );
    }

    c.set('user', me.session.user);
    c.set('permissions', [...permissions]);
    c.set('tenant', { tenant } satisfies TenantContext);
    return next();
  };
}
