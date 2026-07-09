/**
 * Server module — V3.1 / V3.5.
 *
 * Owns the Hono app, the WebSocket broadcaster, the dev mock
 * source, and the HTTP server. Returns a `ServerHandle` whose
 * `shutdown()` drains in-flight traffic. The bootstrap
 * module (`./bootstrap.ts`) wires OTel + signal handling on
 * top.
 *
 * Split out from `index.ts` in V3.1 T2 so that the OTel SDK
 * (`@opentelemetry/sdk-node`) can register its auto-
 * instrumentation require-hook *before* the modules it
 * patches (`http`, `ws`, `hono`) are required. The bootstrap
 * dynamic-imports this file after `startOtel()`.
 *
 * V3.5 added the CORS middleware (Track K) and a `buildApp`
 * helper that returns the assembled Hono app without
 * listening on a port. Tests use `buildApp` + `app.request`
 * for in-process HTTP assertions (preflight, CORS headers,
 * etc.) without the cost of binding a real socket.
 */

import { serve, upgradeWebSocket } from '@hono/node-server';
import type { ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WebSocketServer, type WebSocket as WsWebSocket } from 'ws';

import type { AppEnv } from '@dt/config';
import type { Logger } from '@dt/observability';
import { withTimestamp } from '@dt/contracts';

import { httpLogger } from './middleware/logger.js';
import { requestId } from './middleware/request-id.js';
import { requiresTenantScope } from './middleware/requires-tenant.js';
import { authRoute } from './routes/auth.js';
import { commandsRoute } from './routes/commands.js';
import { devicesRoute } from './routes/devices.js';
import { healthRoute } from './routes/health.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { oidcRoute } from './routes/oidc.js';
import { sceneRoute } from './routes/scene.js';
import { RealtimeBroadcaster } from './realtime/broadcaster.js';
import { createAuthStore } from './auth/index.js';
import { DevMockSource } from './realtime/dev-source.js';
// V3.4 T4: file-based plugin storage. The on-disk shape
// is documented in `./plugins/storage.ts`; `writePluginArtifact`
// is a T5 stub. `MemoryPluginStore` still exists because
// `marketplace.test.ts` uses it for fast feedback (no
// filesystem state in the route unit tests).
import { FilePluginStore } from './plugins/storage.js';
import { createInMemoryPluginIndex } from '@dt/plugin-registry';

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

/**
 * CORS defaults for local development.
 *
 * `http://localhost:5173` is the Vite dev server that the
 * web app boots on. `http://localhost:1420` is Tauri's
 * default dev port (the desktop shell's WebView loads from
 * there in dev mode). Production deployments MUST set
 * `CORS_ALLOWED_ORIGINS` explicitly -- an empty list is the
 * safe fallback (cross-origin requests get a 204 preflight
 * with no `Access-Control-Allow-Origin` header, so the
 * browser refuses to send the real request).
 */
export const DEFAULT_DEV_CORS_ORIGINS: readonly string[] = [
  'http://localhost:5173',
  'http://localhost:1420',
];

/**
 * Resolve the CORS origin allowlist at startup.
 *
 *   1. `CORS_ALLOWED_ORIGINS` (comma-separated) wins if set.
 *   2. Otherwise dev gets the Vite + Tauri defaults;
 *      production gets an empty list (deny by default).
 *
 * Exported so the cors test can assert the resolution rules
 * without spinning up a Hono app.
 */
export function resolveCorsOrigins(production: boolean): string[] {
  const raw = process.env['CORS_ALLOWED_ORIGINS'];
  if (raw !== undefined && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return production ? [] : [...DEFAULT_DEV_CORS_ORIGINS];
}

/**
 * Assemble the Hono app for the BFF.
 *
 * Returns a fully-wired `Hono` instance with all middleware
 * (request id, http logger, CORS) and routes mounted, but
 * without binding to a port or starting the dev mock source.
 * The production path (`createServer`) calls this and then
 * hands the app to `serve()`. Tests can call it directly and
 * exercise the stack via `app.request` -- no socket, no
 * shutdown dance.
 */
export function buildApp(opts: CreateServerOptions): {
  app: Hono;
  broadcaster: RealtimeBroadcaster;
  isShuttingDownRef: { value: boolean };
} {
  const { env, logger } = opts;
  const broadcaster = opts.broadcaster ?? new RealtimeBroadcaster();

  const app = new Hono();

  // Cross-cutting middleware: request id first, http logger
  // second so the logger can read the id off the context for
  // child bindings.
  app.use('*', requestId());
  app.use('*', httpLogger(logger));

  // CORS preflight + simple-response headers. The BFF is a
  // cross-origin API for the Vite web app (localhost:5173)
  // and the Tauri desktop shell (localhost:1420 in dev).
  // Without this, every fetch from the browser fails the
  // preflight with 'No Access-Control-Allow-Origin header'
  // -- which is why smoke scripts that hit localhost:3001
  // directly never caught this. Configured to send
  // `credentials: true` so the OIDC session cookie is
  // included on cross-origin XHRs.
  //
  // OPTIONS preflight requests are short-circuited here
  // (the cors middleware returns 204 directly), so the
  // rest of the stack never sees them -- in particular
  // the 404 notFound handler below is unreachable for
  // OPTIONS.
  const corsOrigins = resolveCorsOrigins(env.production);
  app.use(
    '*',
    cors({
      origin: corsOrigins,
      credentials: true,
      allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    }),
  );

  // Mount the health route early so /health and /ready are
  // reachable even if a later route module fails to load.
  const isShuttingDownRef = { value: false };
  app.route(
    '/',
    healthRoute({ isShuttingDown: () => isShuttingDownRef.value }),
  );

  // Pick the auth store from the env (V3.0).
  const authStore = createAuthStore(env);

  // Every auth-gated route module is a factory that takes
  // the AuthStore; the requiresTenantScope middleware inside
  // reads it for every request, so the store has to exist
  // before any route is mounted. V3.3: devices / scene /
  // commands / stream all use the tenant-scoped middleware
  // so a request without a registered tenant is rejected
  // at the gate (401 AUTH_NO_TENANT) instead of leaking
  // global data. /api/auth/* stays on its existing surface
  // because those routes run before any tenant is known.
  app.route('/api', devicesRoute(authStore));
  app.route('/api', sceneRoute(authStore));
  app.route('/api', commandsRoute(authStore));
  app.route('/api/auth', authRoute(authStore));

  // V3.4 T4: marketplace routes wired with the
  // file-based `PluginStore`. The on-disk root defaults to
  // `.data/plugins/` (override via `PLUGIN_STORAGE_ROOT`).
  // The registry index stays in-memory here; a follow-up
  // T4.x swaps it for a file-backed implementation. The
  // route handlers do not change.
  const pluginStore = new FilePluginStore();
  const registryIndex = createInMemoryPluginIndex();
  app.route(
    '/api',
    marketplaceRoutes({ authStore, pluginStore, registryIndex }),
  );

  if (env.authProvider === 'oidc' && env.oidc) {
    app.route('/api/auth/oidc', oidcRoute({ config: env.oidc }));
  }

  app.get(
    '/api/stream',
    // V3.3: the WebSocket upgrade is gated on a tenant scope.
    // T4 put the gate here; T7 reads the resolved tenant id
    // off `c.var.tenant` and passes it to `subscribeClient`
    // so the broadcaster filters events at the stream
    // boundary (see `realtime/broadcaster.ts`). The
    // permission is `scene:read` (viewer has it) so the
    // existing dev loop keeps working.
    requiresTenantScope(authStore, 'scene:read'),
    upgradeWebSocket((c) => {
      // `requiresTenantScope` sets `c.var.tenant` before
      // calling `next()`; the assertion is the explicit
      // acknowledgement of that contract. If the gate ever
      // regresses, the upgrade handler would receive a
      // context with no tenant and the broadcaster would
      // throw at the non-null assertion -- a loud failure
      // is the right shape.
      const tenantId = c.var.tenant!.tenant.id;
      // Keepalive payloads also need a `tenantId` so the
      // broadcaster's per-tenant filter doesn't drop them.
      // The `withTimestamp` helper doesn't enforce
      // `tenantId` (it's a generic stamping helper), so we
      // stamp it explicitly here.
      const buildPing = () =>
        withTimestamp({
          tenantId,
          type: 'ping',
          payload: { nonce: String(Date.now()) },
        });
      let cleanup: (() => void) | null = null;
      return {
        onOpen(_evt, ws) {
          const unsubscribe = broadcaster.subscribeClient(tenantId, (event) => {
            ws.send(JSON.stringify(event));
          });
          ws.send(JSON.stringify(buildPing()));
          const ping = setInterval(() => {
            ws.send(JSON.stringify(buildPing()));
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
    c.json(
      { error: 'NotFound', message: `No route for ${c.req.method} ${c.req.path}` },
      404,
    ),
  );

  app.onError((err, c) => {
    logger.error('unhandled error', { error: err.message });
    return c.json({ error: 'InternalError', message: err.message }, 500);
  });

  return { app, broadcaster, isShuttingDownRef };
}

export function createServer(opts: CreateServerOptions): ServerHandle {
  const { env, logger } = opts;
  const { app, broadcaster, isShuttingDownRef } = buildApp(opts);

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
    // Flip the readiness flag first so /ready starts
    // returning 503 immediately; orchestrators (Kubernetes
    // preStop, docker stop) rely on this to stop sending
    // new traffic before the in-flight drain begins.
    isShuttingDownRef.value = true;

    // 1. Stop the dev mock source so it doesn't push
    //    events into a draining server.
    dev?.stop();
    dev = null;

    // 2. Send a close frame to every active WebSocket. We
    //    don't wait for close ACKs; the server.close()
    //    below does the final cleanup after the drain
    //    timeout.
    for (const ws of wssClients) {
      try {
        ws.close(1001, 'going away');
      } catch {
        // ignore individual close failures
      }
    }
    wssClients.clear();

    // 3. Close the HTTP server. Stops accepting new
    //    connections and waits for in-flight responses,
    //    with a hard timeout.
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
    isShuttingDown: () => isShuttingDownRef.value,
    shutdown,
  };
}

