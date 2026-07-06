/**
 * /api/auth/* — V2.1 mock auth endpoints.
 *
 * Wires `MockAuthStore` to Hono. The real provider drops in here
 * behind the same `AuthStore` interface in V3.
 */

import { Hono } from 'hono';

import {
  type LoginRequest,
  type MeResponse,
} from '@dt/contracts';

import { AuthError, type AuthStore } from '../auth/mock-store.js';

function extractBearer(header: string | undefined): string {
  if (!header) return '';
  const trimmed = header.trim();
  return trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice('Bearer '.length) : '';
}

export function authRoute(store: AuthStore): Hono {
  const app = new Hono();

  app.get('/me', async (c) => {
    const token = extractBearer(c.req.header('authorization'));
    const me: MeResponse = await store.getMe(token);
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
      throw err;
    }
  });

  app.post('/logout', async (c) => {
    const token = extractBearer(c.req.header('authorization'));
    await store.logout(token);
    return c.body(null, 204);
  });

  return app;
}
