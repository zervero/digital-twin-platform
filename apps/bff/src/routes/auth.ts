/**
 * /api/auth/* — V2.1 mock auth endpoints, V3.0 headers-based.
 *
 * The route is provider-agnostic. MockAuthStore handles
 * `POST /api/auth/login` (email -> bearer). OidcAuthStore's
 * `login` throws; the OIDC provider mounts its own start /
 * callback routes in `routes/oidc.ts` instead.
 *
 * `GET /api/auth/me` and `POST /api/auth/logout` work for
 * both providers — they just hand the request headers to the
 * store and let each implementation read its own credential
 * shape.
 */

import { Hono } from 'hono';

import { type LoginRequest, type MeResponse } from '@dt/contracts';

import { AuthError, type AuthStore } from '../auth/store.js';
import { requiresPermission } from '../middleware/requires-permission.js';

export function authRoute(store: AuthStore): Hono {
  const app = new Hono();

  app.get('/me', async (c) => {
    const me: MeResponse = await store.getMe(c.req.raw.headers);
    return c.json(me);
  });

  app.post('/login', async (c) => {
    const body = (await c.req.json().catch(() => null)) as LoginRequest | null;
    if (!body || typeof body.email !== 'string') {
      return c.json({ error: 'AUTH_INVALID_CREDENTIALS', message: 'Missing email' }, 400);
    }
    try {
      const res = await store.login(body);
      return c.json(res);
    } catch (err) {
      if (err instanceof AuthError) {
        return c.json({ error: err.code, message: err.message }, 401);
      }
      // OIDC store throws here in V3.0 because it has no direct
      // login endpoint. Surface a 400 with a clear hint rather
      // than letting the framework render a 500.
      const message = err instanceof Error ? err.message : 'login failed';
      return c.json({ error: 'AUTH_INVALID_CREDENTIALS', message }, 400);
    }
  });

  app.post('/logout', async (c) => {
    await store.logout(c.req.raw.headers);
    return c.body(null, 204);
  });

  // Demo target: any user with `device:write` is allowed through.
  // Used by the V2.1 smoke to confirm the middleware plumbs roles
  // from the token into the request context.
  app.get('/_protected', requiresPermission(store, 'device:write'), (c) =>
    c.json({ ok: true, user: c.get('user')?.email ?? null }),
  );

  return app;
}
