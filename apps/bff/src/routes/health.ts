/**
 * Health and readiness routes.
 *
 * `/health` is the liveness probe: 200 as long as the process is
 * alive. An orchestrator restarts the container when this fails.
 *
 * `/ready` is the readiness probe: 200 when accepting traffic,
 * 503 during graceful shutdown. An orchestrator stops sending
 * new traffic to the container when this flips to 503, and
 * waits for it to drain before issuing SIGKILL.
 *
 * The shutdown state is read lazily via a closure so a
 * module-level `isShuttingDown = true` (set in the SIGTERM
 * handler) takes effect on the next probe without the route
 * needing to know about the shutdown machinery.
 */

import { Hono } from 'hono';

import type { ApiHealth } from '@dt/contracts';

export interface HealthRouteOpts {
  isShuttingDown: () => boolean;
}

const health: ApiHealth = {
  ok: true,
  service: 'digital-twin-bff',
  version: '0.1.0',
};

export function healthRoute(opts: HealthRouteOpts): Hono {
  const route = new Hono();

  route.get('/health', (c) => c.json(health));

  route.get('/ready', (c) => {
    if (opts.isShuttingDown()) {
      return c.json({ ok: false, reason: 'shutting down' }, 503);
    }
    return c.json({ ok: true });
  });

  return route;
}
