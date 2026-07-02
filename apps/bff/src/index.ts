/**
 * BFF entry point.
 *
 * Wires the Hono app, mounts routes, and starts a Node server. The base path
 * is `/api` so the BFF can host health and metrics at the root in V2 without
 * breaking the public API surface.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { commandsRoute } from './routes/commands.js';
import { devicesRoute } from './routes/devices.js';
import { healthRoute } from './routes/health.js';
import { sceneRoute } from './routes/scene.js';

const PORT = Number(process.env['PORT'] ?? 3001);

const app = new Hono();

app.route('/', healthRoute);
app.route('/api', devicesRoute);
app.route('/api', sceneRoute);
app.route('/api', commandsRoute);

app.notFound((c) =>
  c.json({ error: 'NotFound', message: `No route for ${c.req.method} ${c.req.path}` }, 404),
);

app.onError((err, c) => {
  console.error('[bff] unhandled error', err);
  return c.json({ error: 'InternalError', message: err.message }, 500);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[bff] listening on http://localhost:${info.port}`);
});
