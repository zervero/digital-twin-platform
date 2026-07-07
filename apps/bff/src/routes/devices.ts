/**
 * /api/devices — V3.0 gated on `device:read`.
 *
 * The V2.1 routes are open; V3.0 adds the `requiresPermission`
 * middleware so AUTH_PROVIDER=oidc deployments actually
 * enforce what the SPA UI says it enforces. The mock provider
 * grants `viewer` (which has device:read) so the existing
 * dev / smoke loops still pass without code changes.
 */

import { Hono } from 'hono';

import type { Device } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { requiresPermission } from '../middleware/requires-permission.js';
import { DEMO_DEVICES } from '../mock/demo-data.js';

export function devicesRoute(store: AuthStore): Hono {
  const app = new Hono();
  app.get('/devices', requiresPermission(store, 'device:read'), (c) => {
    const devices: Device[] = DEMO_DEVICES;
    return c.json(devices);
  });
  return app;
}
