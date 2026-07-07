/**
 * Server module — V3.1.
 *
 * Owns the Hono app, the WebSocket broadcaster, the dev mock
 * source, and the HTTP server. Returns a `ServerHandle` whose
 * `shutdown()` drains in-flight traffic. The bootstrap
 * module (`./bootstrap.ts`) wires OTel + signal handling on
 * top.
 *
 * Split out from `index.ts` in T2 so that the OTel SDK
 * (`@opentelemetry/sdk-node`) can register its auto-
 * instrumentation require-hook *before* the modules it
 * patches (`http`, `ws`, `hono`) are required. The bootstrap
 * dynamic-imports this file after `startOtel()`.
 */

import { serve, upgradeWebSocket } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws';

import type { AppEnv } from '@dt/config';
import type { Logger } from '@dt/observability';
import { withTimestamp } from '@dt/contracts';

import { httpLogger } from './middleware/logger.js';
import { requestId } from './middleware/request-id.js';
import { authRoute } from './routes/auth.js';
import { commandsRoute } from './routes/commands.js';
import { devicesRoute } from './routes/devices.js';
import { healthRoute } from './routes/health.js';
import { oidcRoute } from './routes/oidc.js';
import { sceneRoute } from './routes/scene.js';
import { RealtimeBroadcaster } from './realtime/broadcaster.js';
import { createAuthStore } from './auth/index.js';
import { DevMockSource } from './realtime/dev-source.js';

export interface ServerHandle {
  /** The underlying HTTP server; exposed for tests / introspection. */
  server: ServerType;
  /** True once shutdown has been initiated. */
  isShuttingDown: () => boolean;
  /**
   * Drain WebSockets, stop the dev mock, close the HTTP
   * server. Resolves on completion or after the 10s drain
   * timeout, whichever comes first.
   */
  shutdown(): Promise<void>;
}

export interface CreateServerOptions {
  env: AppEnv;
  logger: Logger;
  /** Override the broadcaster (tests use this to inject fixtures). */
  broadcaster?: RealtimeBroadcaster;
}

const SHUTDOWN_TIMEOUT_MS = 10_000;

export function createServer(opts: CreateServerOptions): ServerHandle {
  const { env, logger } = opts;
  const broadcaster = opts.broadcaster ?? new RealtimeBroadcaster();

  const app = new Hono();

  // Cross-cutting middleware: request id first, http logger
  // second so the logger can read the id off the context for
  // child bindings.
  app.use('*', requestId());
  app.use('*', httpLogger(logger));

  // Mount the health route early so /health and /ready are
  // reachable even if a later route module fails to load.
  let isShuttingDown = false;
  app.route('/', healthRoute({ isShuttingDown: () => isShuttingDown }));

  // Pick the auth store from the env (V3.0).
  const authStore = createAuthStore(env);

  // Every auth-gated route module is a factory that takes
  // the AuthStore; the requiresPermission middleware inside
  // reads it for every request, so the store has to exist
  // before any route is mounted.
  app.route('/api', devicesRoute(authStore));
  app.route('/api', sceneRoute(authStore));
  app.route('/api', commandsRoute(authStore));
  app.route('/api/auth', authRoute(authStore));

  if (env.authProvider === 'oidc' && env.oidc) {
    app.route('/api/auth/oidc', oidcRoute({ config: env.oidc }));
  }

  app.get(
    '/api/stream',
    upgradeWebSocket(() => {
      let cleanup: (() => void) | null = null;
      return {
        onOpen(_evt, ws) {
          const unsubscribe = broadcaster.subscribeClient((event) => {
            ws.send(JSON.stringify(event));
          });
          ws.send(JSON.stringify(
            withTimestamp({ type: 'ping', payload: { nonce: String(Date.now()) } }),
          ));
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

  // Start the dev mock source in non-production environments.
  let dev: DevMockSource | null = null;
  if (!env.production) {
    dev = new DevMockSource({ broadcaster });
    dev.start();
    logger.info('dev mock source started');
  }

  const shutdown = async (): Promise<void> => {
    // Flip the readiness flag first so /ready starts returning
    // 503 immediately; orchestrators (Kubernetes preStop,
    // docker stop) rely on this to stop sending new traffic
    // before the in-flight drain begins.
    isShuttingDown = true;

    // 1. Stop the dev mock source so it doesn't push events
    //    into a draining server.
    dev?.stop();
    dev = null;

    // 2. Send a close frame to every active WebSocket. We
    //    don't wait for close ACKs; the server.close() below
    //    does the final cleanup after the drain timeout.
    for (const ws of wssClients) {
      try {
        ws.close(1001, 'going away');
      } catch {
        // ignore individual close failures
      }
    }
    wssClients.clear();

    // 3. Close the HTTP server. Stops accepting new
    //    connections and waits for in-flight responses, with
    //    a hard timeout.
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
  };

  return {
    server,
    isShuttingDown: () => isShuttingDown,
    shutdown,
  };
}
