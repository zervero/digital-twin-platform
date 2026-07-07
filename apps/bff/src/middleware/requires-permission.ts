/**
 * requiresPermission — V2.1 baseline, V3.0 update, V3.3 scope note.
 *
 * Reads the request headers via the AuthStore, computes the
 * session's effective permissions (direct from `session.permissions`
 * if present, else derived from `user.roles`), and either:
 *   - 401 when no session was found,
 *   - 403 when the user lacks the requested permission,
 *   - sets c.var.user / c.var.permissions and calls next().
 *
 * V3.0 changes:
 * - AuthStore is headers-based, so the middleware no longer
 *   extracts the bearer token itself; the OIDC store reads
 *   the session cookie, the mock store reads the bearer.
 * - `c.var.permissions` is the V3.0 source of truth for
 *   "what this request can do"; downstream handlers should
 *   read from it instead of recomputing.
 *
 * V3.3 scope note: V3.3 introduces `requiresTenantScope`
 * (see `requires-tenant.ts`). Routes that need tenant
 * isolation (`/api/devices`, `/api/scene`, `/api/commands`,
 * `/api/stream`) now use the tenant-scoped middleware.
 * `requiresPermission` is kept for routes that need
 * authentication but no tenant scope -- the dev `/health`
 * route, `/api/auth/*` (login / me / logout run before any
 * tenant is known), and `/api/auth/oidc/*` (the IdP
 * redirect flow happens pre-session).
 */

import type { MiddlewareHandler } from 'hono';

import {
  type Permission,
  permissionsFor,
  type User,
} from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';

declare module 'hono' {
  interface ContextVariableMap {
    user?: User;
    permissions?: Permission[];
  }
}

export function requiresPermission(store: AuthStore, required: Permission): MiddlewareHandler {
  return async (c, next) => {
    const me = await store.getMe(c.req.raw.headers);
    if (!me.session) {
      return c.json({ error: 'AUTH_SESSION_EXPIRED', message: 'Session not found' }, 401);
    }
    const permissions =
      me.session.permissions ?? permissionsFor(me.session.user.roles);
    if (!permissions.includes(required)) {
      return c.json({ error: 'AUTH_FORBIDDEN', message: `Missing permission: ${required}` }, 403);
    }
    c.set('user', me.session.user);
    c.set('permissions', [...permissions]);
    return next();
  };
}
