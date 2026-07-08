/**
 * Bootstrap — V3.1.
 *
 * Owns the BFF startup sequence. Read in order:
 *
 *   1. readAppEnv()           — env parsing + validation
 *   2. createLogger()         — @dt/observability
 *   3. startOtel()            — @dt/otel (NEW in V3.1)
 *   4. dynamic import of the  — Hono / ws / node-server are
 *      server module, then    patched by the OTel auto-
 *      createServer()         instrumentation require-hook
 *   5. SIGTERM / SIGINT       — drain server, then
 *      handlers               shutdownOtel, then exit
 *
 * The dynamic import in step 4 is the load-bearing detail.
 * If `createServer()` were a static import, the modules it
 * transitively requires (`hono`, `ws`, ...) would be loaded
 * BEFORE `startOtel()` runs, which means the OTel auto-
 * instrumentation would not see them. Dynamic `import()`
 * defers module resolution until after the SDK is started.
 */

import { createLogger, type Logger } from '@dt/observability';
import {
  isOtelDisabled,
  shutdownOtel,
  startOtel,
  type StartOtelResult,
} from '@dt/otel';

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { createServer, type ServerHandle } from './server.js';
import {
  generateDevSigningSecret,
  loadSigningSecret,
} from './plugins/signing.js';

export interface BootstrapHandle {
  otel: StartOtelResult | null;
  server: ServerHandle;
  /**
   * Idempotent graceful shutdown. Drains WebSockets, closes
   * the HTTP server, flushes the OTel SDK, then exits.
   * Exposed for tests; the production path is the SIGTERM
   * handler below.
   */
  shutdown(signal: NodeJS.Signals): Promise<void>;
}

/** Default OTLP endpoint used when OTEL_EXPORTER_OTLP_ENDPOINT is unset. */
const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318';

/**
 * Read the service version for OTel's `service.version`
 * resource attribute. We don't import the BFF's package.json
 * statically because `workspace:*` packages are type-only in
 * V3.1 and the JSON resolution is finicky under tsx + ESM.
 * The release pipeline sets `SERVICE_VERSION` via the
 * release-please bumped manifest, and a default fallback
 * keeps local dev working.
 */
function readServiceVersion(): string {
  const v = process.env['SERVICE_VERSION'];
  return v && v.length > 0 ? v : '0.0.0-dev';
}

export interface BootstrapOptions {
  /**
   * Override the createServer factory. Tests inject a stub
   * that doesn't actually open a port.
   */
  createServerImpl?: typeof createServer;
  /**
   * Override the startOtel call. Tests inject a mock that
   * returns a fake handle.
   */
  startOtelImpl?: (config: {
    serviceName: string;
    serviceVersion: string;
    environment: string;
    otlpEndpoint: string;
  }) => StartOtelResult | null;
}

const DEV_SIGNING_SECRET_PATH = path.resolve(
  // apps/bff/src/bootstrap.ts -> apps/bff/.data/dev-signing-secret
  new URL('.', import.meta.url).pathname,
  '../.data/dev-signing-secret',
);

/**
 * Make sure `PLUGIN_SIGNING_SECRET` is set in `process.env`
 * before the BFF tries to read it. In production a missing
 * or short secret is a hard error. In dev a missing secret
 * is auto-generated and written to a per-checkout file so
 * the value survives across restarts but never leaves the
 * machine.
 */
async function ensureSigningSecret(production: boolean): Promise<void> {
  const existing = process.env['PLUGIN_SIGNING_SECRET'];
  if (existing && existing.length >= 32) return;
  if (production) {
    throw new Error(
      'PLUGIN_SIGNING_SECRET must be set to a 32-byte (or longer) string',
    );
  }
  const secret = generateDevSigningSecret();
  await fs.mkdir(path.dirname(DEV_SIGNING_SECRET_PATH), { recursive: true });
  await fs.writeFile(DEV_SIGNING_SECRET_PATH, secret, 'utf8');
  process.env['PLUGIN_SIGNING_SECRET'] = secret;
  // Surface the path so an operator can find the file
  // (e.g. when copying the dev value into a real
  // environment).
  console.log(
    `[bff] generated dev signing secret at ${DEV_SIGNING_SECRET_PATH}`,
  );
}

export async function bootstrap(opts: BootstrapOptions = {}): Promise<BootstrapHandle> {
  const { readAppEnv } = await import('@dt/config');
  const env = readAppEnv();
  const logger: Logger = createLogger({ level: env.logLevel });

  // V3.4 T5: require a signing secret before the BFF
  // starts. In dev a missing secret is filled in by
  // writing a per-checkout random value to
  // apps/bff/.data/dev-signing-secret (gitignored) so
  // `pnpm dev` keeps working without manual setup. In
  // production a missing or short secret throws and
  // the BFF refuses to start -- the marketplace path
  // is unreachable without a real secret.
  await ensureSigningSecret(env.production);
  loadSigningSecret();
  logger.info('plugin signing secret loaded');

  const startOtelFn = opts.startOtelImpl ?? startOtel;
  const otel = startOtelFn({
    serviceName: 'digital-twin-platform-bff',
    serviceVersion: readServiceVersion(),
    environment: env.production ? 'production' : 'development',
    otlpEndpoint:
      process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? DEFAULT_OTLP_ENDPOINT,
    ...(process.env['OTEL_METRIC_EXPORT_INTERVAL']
      ? { metricsIntervalMs: Number(process.env['OTEL_METRIC_EXPORT_INTERVAL']) }
      : {}),
  });

  if (otel) {
    logger.info('otel started', {
      disabled: isOtelDisabled(),
      endpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? DEFAULT_OTLP_ENDPOINT,
    });
  } else {
    logger.info('otel disabled');
  }

  // Dynamic import so the OTel SDK's require-hook runs before
  // hono / ws / http are loaded. Tests inject a stub
  // createServerImpl that doesn't trigger the module graph.
  const createServerFn = opts.createServerImpl ?? createServer;
  const serverHandle = createServerFn({ env, logger });

  let isShuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info('shutdown started', { signal });
    await serverHandle.shutdown();
    await shutdownOtel(otel);
    logger.info('shutdown complete');
    // Exit synchronously after the OTel SDK flushes its
    // pending spans / metrics. We don't use setImmediate
    // because test spies on process.exit need the call to
    // happen inside the awaited body, not after it.
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return {
    otel,
    server: serverHandle,
    shutdown,
  };
}
