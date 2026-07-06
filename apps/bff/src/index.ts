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
 *
 * Every HTTP request flows through `requestId()` then `httpLogger()`:
 * the first stamps a UUID on `c.var.requestId`, the second emits one
 * structured log line per response. WebSocket upgrades are not covered
 * by `httpLogger` (they never return an HTTP response), but the
 * `requestId` they receive via the upgrade headers still rides along
 * on any log line we add inside the route later.
 */

import { serve, upgradeWebSocket } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';

import { readAppEnv } from '@dt/config';
import { withTimestamp } from '@dt/contracts';
import { createLogger, type Logger } from '@dt/observability';

import { httpLogger } from './middleware/logger.js';
import { requestId } from './middleware/request-id.js';
import { authRoute } from './routes/auth.js';
import { commandsRoute } from './routes/commands.js';
import { devicesRoute } from './routes/devices.js';
import { healthRoute } from './routes/health.js';
import { sceneRoute } from './routes/scene.js';
import { RealtimeBroadcaster } from './realtime/broadcaster.js';
import { MockAuthStore } from './auth/mock-store.js';
import { DevMockSource } from './realtime/dev-source.js';

const env = readAppEnv();
const logger: Logger = createLogger({ level: env.logLevel });
const broadcaster = new RealtimeBroadcaster();

const app = new Hono();

// Cross-cutting middleware: request id first, http logger second so
// the logger can read the id off the context for child bindings.
app.use('*', requestId());
app.use('*', httpLogger(logger));

app.route('/', healthRoute);
app.route('/api', devicesRoute);
app.route('/api', sceneRoute);
const authStore = new MockAuthStore();
app.route('/api/auth', authRoute(authStore));
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
  logger.error('unhandled error', { error: err.message });
  return c.json({ error: 'InternalError', message: err.message }, 500);
});

const wss = new WebSocketServer({ noServer: true });
serve(
  {
    fetch: app.fetch,
    port: env.port,
    websocket: { server: wss },
  },
  (info) => {
    logger.info('listening', { port: info.port });
  },
);

// Start the dev mock source in non-production environments.
if (env.nodeEnv !== 'production') {
  const dev = new DevMockSource({ broadcaster });
  dev.start();
  logger.info('dev mock source started');
}
