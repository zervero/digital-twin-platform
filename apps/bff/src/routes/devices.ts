/**
 * /api/devices — V3.0 gated on `device:read`, V3.3 tenant-scoped.
 *
 * V3.0 added the `requiresPermission` middleware so OIDC
 * deployments enforce what the SPA UI claims to enforce.
 * V3.3 T4 switched this route to `requiresTenantScope` --
 * every read is gated on the session having a registered
 * tenant, and `c.var.tenant` is set before `next()` returns.
 * V3.3 T6 (this commit) filters the device list through
 * `getDevicesForTenant(...)` so a caller only ever sees
 * their own tenant's devices. The middleware has already
 * rejected requests without a tenant id or with an unknown
 * tenant id; by the time the handler runs, `c.var.tenant`
 * is guaranteed non-null. The non-null assertion below is
 * the explicit acknowledgement of that contract.
 */

import { Hono } from 'hono';

import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';
import { getDevicesForTenant } from '../mock/demo-data.js';

export function devicesRoute(store: AuthStore): Hono {
  const app = new Hono();
  app.get('/devices', requiresTenantScope(store, 'device:read'), (c) => {
    // See file header: `requiresTenantScope` sets this before
    // calling `next()`, so the assertion is the contract, not
    // an unguarded deref.
    const tenantId = c.var.tenant!.tenant.id;
    return c.json(getDevicesForTenant(tenantId));
  });
  return app;
}
