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
 *
 * V2.3 adds graceful shutdown: SIGTERM / SIGINT set the `isShuttingDown`
 * flag (which flips `/ready` to 503), stop the dev mock source, close
 * every active WebSocket with a 1001 frame, then close the HTTP server
 * and exit 0 within a 10s drain timeout. The Tauri / docker stop
 * paths depend on this contract.
 */

import { serve, upgradeWebSocket } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws';

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
import { createAuthStore } from './auth/index.js';
import { DevMockSource } from './realtime/dev-source.js';

const env = readAppEnv();
const logger: Logger = createLogger({ level: env.logLevel });
const broadcaster = new RealtimeBroadcaster();

const app = new Hono();

// Cross-cutting middleware: request id first, http logger second so
// the logger can read the id off the context for child bindings.
app.use('*', requestId());
app.use('*', httpLogger(logger));

// Mount the health route early so /health and /ready are reachable
// even if a later route module fails to load. The closure on
// `isShuttingDown` lets the route read the current shutdown state
// without subscribing to an event.
let isShuttingDown = false;
app.route('/', healthRoute({ isShuttingDown: () => isShuttingDown }));

app.route('/api', devicesRoute);
app.route('/api', sceneRoute);

// V3.0: pick the auth store from the env. createAuthStore
// returns MockAuthStore for AUTH_PROVIDER=mock and
// OidcAuthStore for AUTH_PROVIDER=oidc (when the OIDC env
// vars are complete; in dev, missing OIDC vars fall back to
// mock with a warning).
const authStore = createAuthStore(env);
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
const wssClients = new Set<WsWebSocket>();
wss.on('connection', (ws) => {
  wssClients.add(ws);
  ws.on('close', () => {
    wssClients.delete(ws);
  });
});

const server = serve(
  {
    fetch: app.fetch,
    port: env.port,
    websocket: { server: wss },
  },
  (info) => {
    logger.info('listening', {
      port: info.port,
      authProvider: env.authProvider ?? 'unset',
      oidcConfigured: env.oidc ? true : false,
    });
  },
);

// Start the dev mock source in non-production environments. Capture
// the handle so the shutdown path can stop it.
let dev: DevMockSource | null = null;
if (!env.production) {
  dev = new DevMockSource({ broadcaster });
  dev.start();
  logger.info('dev mock source started');
}

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info('shutdown started', { signal });

  // 1. Stop the dev mock source so it doesn't push events into a
  //    draining server.
  dev?.stop();
  dev = null;

  // 2. Send a close frame to every active WebSocket. We don't wait
  //    for the close ACKs; the server.close() below does the final
  //    cleanup after the drain timeout.
  for (const ws of wssClients) {
    try {
      ws.close(1001, 'going away');
    } catch {
      // ignore individual close failures
    }
  }
  wssClients.clear();

  // 3. Close the HTTP server. This stops accepting new connections
  //    and waits for in-flight responses, with a hard timeout.
  await new Promise<void>((resolve) => {
    server.close((err) => {
      if (err) logger.warn('http server close reported error', { error: err.message });
      resolve();
    });
    setTimeout(() => {
      logger.warn('shutdown timeout, forcing exit', { timeoutMs: SHUTDOWN_TIMEOUT_MS });
      resolve();
    }, SHUTDOWN_TIMEOUT_MS);
  });

  logger.info('shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
