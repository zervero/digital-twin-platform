/**
 * /api/scene — V3.0 gated on `scene:read` / `scene:write`,
 * V3.3 tenant-scoped.
 *
 * V3.0 added the `requiresPermission` middleware; V3.3 T4
 * switched to `requiresTenantScope`. V3.3 T6 (this commit)
 * pulls the scene from `getSceneForTenant(...)` so a caller
 * only ever sees their own tenant's factory graph. The
 * middleware already returned 401 `AUTH_NO_TENANT` for
 * sessions without a tenant id; the `null` branch below is
 * the defense-in-depth path for "registered tenant, but
 * the fixture has no scene" (no tenant currently lands in
 * this branch, but the type system permits it and the
 * route stays honest about the contract).
 *
 * A `POST /api/scene/updates` route would normally be
 * gated on `scene:write`; it is not added here because
 * V2.3 does not ship a scene update endpoint -- scene
 * edits flow through commands. The middleware contract
 * is in place for when the route lands.
 */

import { Hono } from 'hono';

import type { AuthStore } from '../auth/store.js';
import { requiresTenantScope } from '../middleware/requires-tenant.js';
import { getSceneForTenant } from '../mock/demo-data.js';

export function sceneRoute(store: AuthStore): Hono {
  const app = new Hono();
  app.get('/scene', requiresTenantScope(store, 'scene:read'), (c) => {
    // See `routes/devices.ts`: `requiresTenantScope` sets
    // `c.var.tenant` before calling `next()`, so the
    // assertion below is the explicit acknowledgement of
    // that contract.
    const tenantId = c.var.tenant!.tenant.id;
    const scene = getSceneForTenant(tenantId);
    if (!scene) {
      return c.json(
        { error: 'TENANT_FORBIDDEN', message: 'No scene for tenant' },
        403,
      );
    }
    return c.json(scene);
  });
  return app;
}
