/**
 * /api/scene — V3.0 gated on `scene:read` / `scene:write`.
 *
 * V2.1 carries these as read-only routes; V3.0 adds the
 * permission middleware. A `POST /api/scene/updates` route
 * would normally be gated on `scene:write`; it is not added
 * here because V2.3 does not ship a scene update endpoint —
 * scene edits flow through commands. The middleware contract
 * is in place for when the route lands.
 */

import { Hono } from 'hono';

import type { SceneSnapshot } from '@dt/contracts';

import type { AuthStore } from '../auth/store.js';
import { requiresPermission } from '../middleware/requires-permission.js';
import { DEMO_SCENE } from '../mock/demo-data.js';

export function sceneRoute(store: AuthStore): Hono {
  const app = new Hono();
  app.get('/scene', requiresPermission(store, 'scene:read'), (c) => {
    const scene: SceneSnapshot = DEMO_SCENE;
    return c.json(scene);
  });
  return app;
}
