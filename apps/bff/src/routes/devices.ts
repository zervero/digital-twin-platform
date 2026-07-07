/**
 * /api/devices — V3.0 gated on `device:read`.
 *
 * V3.0 added the `requiresPermission` middleware so OIDC
 * deployments enforce what the SPA UI claims to enforce.
 * V3.3 switches this route to `requiresTenantScope` -- every
 * read is gated on the session having a registered tenant,
 * so the route handler can read `c.var.tenant.tenant` (T6
 * will use that to filter the device list). The mock store
 * mints a default `tenantId: 'acme-corp'` so the existing
 * dev / smoke loops still pass without changes.
 */

import { Hono } from 'hono';

import type { Device } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';
import { DEMO_DEVICES } from '../mock/demo-data.js';

export function devicesRoute(store: AuthStore): Hono {
  const app = new Hono();
  app.get('/devices', requiresTenantScope(store, 'device:read'), (c) => {
    const devices: Device[] = DEMO_DEVICES;
    return c.json(devices);
  });
  return app;
}
