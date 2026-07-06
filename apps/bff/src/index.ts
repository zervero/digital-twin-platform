/**
 * BFF entry point.
 *
 * Wires the Hono app, mounts routes, starts a Node server, upgrades the
 * `/api/stream` path to a WebSocket, and (in dev) starts a mock device
 * updater that pushes realtime events.
 *
 * WebSocket support uses @hono/node-server v2's built-in
 * `upgradeWebSocket` plus a `ws.WebSocketServer` with `noServer: true`
 * so the same HTTP server handles both HTTP and WS.
 */

import { serve, upgradeWebSocket } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';

import { withTimestamp } from '@dt/contracts';

import { commandsRoute } from './routes/commands.js';
import { devicesRoute } from './routes/devices.js';
import { healthRoute } from './routes/health.js';
import { sceneRoute } from './routes/scene.js';
import { RealtimeBroadcaster } from './realtime/broadcaster.js';
import { DevMockSource } from './realtime/dev-source.js';

const PORT = Number(process.env['PORT'] ?? 3001);
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

const app = new Hono();
const broadcaster = new RealtimeBroadcaster();

app.route('/', healthRoute);
app.route('/api', devicesRoute);
app.route('/api', sceneRoute);
app.route('/api', commandsRoute);

app.get(
  '/api/stream',
  upgradeWebSocket(() => {
    // Captured by onOpen, fired by onClose. Storing on a closure keeps
    // the cleanup reachable without leaking the WSContext object itself.
    let cleanup: (() => void) | null = null;
    return {
      onOpen(_evt, ws) {
        const unsubscribe = broadcaster.subscribeClient((event) => {
          ws.send(JSON.stringify(event));
        });
        // Send a hello ping immediately so clients can detect the connection.
        ws.send(JSON.stringify(
          withTimestamp({ type: 'ping', payload: { nonce: String(Date.now()) } }),
        ));
        // Keepalive ping every 25s so dead connections are detected fast.
        const ping = setInterval(() => {
          ws.send(JSON.stringify(
            withTimestamp({ type: 'ping', payload: { nonce: String(Date.now()) } }),
          ));
        }, 25_000);
        cleanup = () => {
          unsubscribe();
          clearInterval(ping);
        };
      },
      onClose() {
        cleanup?.();
        cleanup = null;
      },
    };
  }),
);

app.notFound((c) =>
  c.json({ error: 'NotFound', message: `No route for ${c.req.method} ${c.req.path}` }, 404),
);

app.onError((err, c) => {
  console.error('[bff] unhandled error', err);
  return c.json({ error: 'InternalError', message: err.message }, 500);
});

const wss = new WebSocketServer({ noServer: true });
serve(
  {
    fetch: app.fetch,
    port: PORT,
    websocket: { server: wss },
  },
  (info) => {
    console.log(`[bff] listening on http://localhost:${info.port}`);
  },
);

// Start the dev mock source in non-production environments.
if (NODE_ENV !== 'production') {
  const dev = new DevMockSource({ broadcaster });
  dev.start();
  console.log('[bff] dev mock source started');
}
