/**
 * requiresPermission — V2.1.
 *
 * Read the bearer token, look up the session via the auth store,
 * compute permissions from roles, and either:
 *   - 401 when no token was supplied,
 *   - 403 when the user lacks the requested permission,
 *   - sets c.var.user / c.var.permissions and calls next() otherwise.
 *
 * The middleware is mounted in front of any route that needs a
 * permission. V2.1 ships it as-is; existing V1/V2 routes keep
 * their open access until a later ADR decides otherwise.
 */

import type { MiddlewareHandler } from 'hono';

import {
  type Permission,
  permissionsFor,
  type User,
} from '@dt/contracts';

import type { AuthStore } from '../auth/mock-store.js';

declare module 'hono' {
  interface ContextVariableMap {
    user?: User;
    permissions?: Permission[];
  }
}

function extractBearer(header: string | undefined): string {
  if (!header) return '';
  const trimmed = header.trim();
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice('Bearer '.length) : '';
}

export function requiresPermission(store: AuthStore, required: Permission): MiddlewareHandler {
  return async (c, next) => {
    const token = extractBearer(c.req.header('authorization'));
    if (!token) {
      return c.json({ error: 'AUTH_SESSION_EXPIRED', message: 'Missing bearer token' }, 401);
    }
    const me = await store.getMe(token);
    if (!me.session) {
      return c.json({ error: 'AUTH_SESSION_EXPIRED', message: 'Session not found' }, 401);
    }
    const permissions = permissionsFor(me.session.user.roles);
    if (!permissions.includes(required)) {
      return c.json({ error: 'AUTH_FORBIDDEN', message: `Missing permission: ${required}` }, 403);
    }
    c.set('user', me.session.user);
    c.set('permissions', permissions);
    return next();
  };
}
