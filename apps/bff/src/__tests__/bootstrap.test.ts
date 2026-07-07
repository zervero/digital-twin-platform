/**
 * Tests for the BFF bootstrap (V3.1 T2).
 *
 * The bootstrap is the load-bearing seam between env
 * parsing, OTel SDK startup, the dynamic-imported server,
 * and the SIGTERM/SIGINT drain. We mock `@dt/otel` and
 * `@dt/config` so the test runs offline and verifies:
 *
 *   - startOtel is called with the config derived from env
 *     (serviceName, environment derived from production
 *     flag, otlpEndpoint from OTEL_EXPORTER_OTLP_ENDPOINT)
 *   - shutdownOtel is awaited on shutdown, after server.shutdown
 *   - Repeated shutdown calls are idempotent (the
 *     shutdownOtel contract, not the BFF's own guard)
 *   - The OTel SDK is started before createServer is called
 *     (the import-order requirement that the dynamic import
 *     of ./server.js exists to satisfy)
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest';

// vi.mock factories are hoisted to the top of the file,
// so any state they reference must be hoisted with them.
// vi.hoisted creates the mock fns at the same scope the
// factories will run in.
const {
  shutdownOtel,
  startOtel,
  readAppEnv,
  createServerMock,
  shutdown,
  fakeServerHandle,
} = vi.hoisted(() => {
  const shutdownOtel = vi.fn().mockResolvedValue(undefined);
  const startOtel = vi.fn().mockReturnValue({ sdk: { shutdown: shutdownOtel } });
  const readAppEnv = vi.fn().mockReturnValue({
    port: 0,
    logLevel: 'info',
    production: false,
    authProvider: 'mock',
  });
  const shutdown = vi.fn().mockResolvedValue(undefined);
  const fakeServerHandle = {
    server: { close: vi.fn() },
    isShuttingDown: vi.fn().mockReturnValue(false),
    shutdown,
  };
  const createServerMock = vi.fn().mockReturnValue(fakeServerHandle);
  return { shutdownOtel, startOtel, readAppEnv, createServerMock, shutdown, fakeServerHandle };
});

vi.mock('@dt/otel', () => ({
  startOtel,
  shutdownOtel,
  isOtelDisabled: vi.fn().mockReturnValue(false),
}));

vi.mock('@dt/config', () => ({
  readAppEnv,
}));

import type * as import_server from '../server.js';

import { bootstrap } from '../bootstrap.js';

describe('bootstrap (V3.1 T2)', () => {
  beforeEach(() => {
    startOtel.mockClear();
    shutdownOtel.mockClear();
    shutdown.mockClear();
    createServerMock.mockClear();
    delete process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
    delete process.env['OTEL_METRIC_EXPORT_INTERVAL'];
    delete process.env['SERVICE_VERSION'];
  });

  afterEach(() => {
    // Strip any signal listeners the bootstrap registered so
    // they don't bleed into other tests.
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('calls startOtel before createServer (import-order requirement)', async () => {
    const order: string[] = [];
    startOtel.mockImplementation(() => {
      order.push('startOtel');
      return { sdk: { shutdown: shutdownOtel } };
    });
    createServerMock.mockImplementation(() => {
      order.push('createServer');
      return fakeServerHandle;
    });

    await bootstrap({
      startOtelImpl: startOtel as unknown as Mock,
      createServerImpl: createServerMock as unknown as typeof import_server.createServer,
    });

    expect(order).toEqual(['startOtel', 'createServer']);
  });

  it('passes service name + environment + endpoint derived from env', async () => {
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'https://otel.example.test';
    process.env['SERVICE_VERSION'] = '3.1.0-test';

    await bootstrap({
      startOtelImpl: startOtel as unknown as Mock,
      createServerImpl: createServerMock as unknown as typeof import_server.createServer,
    });

    expect(startOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'digital-twin-platform-bff',
        serviceVersion: '3.1.0-test',
        environment: 'development',
        otlpEndpoint: 'https://otel.example.test',
      }),
    );
  });

  it('reports environment=production when env.production is true', async () => {
    // Override the readAppEnv mock for this test only.
    const configMod = await import('@dt/config');
    (configMod.readAppEnv as Mock).mockReturnValueOnce({
      port: 0,
      logLevel: 'info',
      production: true,
      authProvider: 'mock',
    });

    await bootstrap({
      startOtelImpl: startOtel as unknown as Mock,
      createServerImpl: createServerMock as unknown as typeof import_server.createServer,
    });

    expect(startOtel).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'production' }),
    );
  });

  it('falls back to the default OTLP endpoint when env var is unset', async () => {
    await bootstrap({
      startOtelImpl: startOtel as unknown as Mock,
      createServerImpl: createServerMock as unknown as typeof import_server.createServer,
    });

    expect(startOtel).toHaveBeenCalledWith(
      expect.objectContaining({
        otlpEndpoint: 'http://localhost:4318',
      }),
    );
  });

  it('shutdown() drains the server first, then flushes OTel', async () => {
    const order: string[] = [];
    shutdown.mockImplementation(async () => {
      order.push('server.shutdown');
    });
    shutdownOtel.mockImplementation(async () => {
      order.push('shutdownOtel');
    });

    const handle = await bootstrap({
      startOtelImpl: startOtel as unknown as Mock,
      createServerImpl: createServerMock as unknown as typeof import_server.createServer,
    });

    // Stub process.exit so the test doesn't actually exit.
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    await handle.shutdown('SIGTERM');

    expect(order).toEqual(['server.shutdown', 'shutdownOtel']);
    expect(exit).toHaveBeenCalledWith(0);
    exit.mockRestore();
  });

  it('repeated shutdown() calls are idempotent', async () => {
    const handle = await bootstrap({
      startOtelImpl: startOtel as unknown as Mock,
      createServerImpl: createServerMock as unknown as typeof import_server.createServer,
    });

    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await handle.shutdown('SIGTERM');
    await handle.shutdown('SIGTERM');
    await handle.shutdown('SIGINT');

    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
    exit.mockRestore();
  });

  it('registers SIGTERM and SIGINT handlers that call shutdown', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await bootstrap({
      startOtelImpl: startOtel as unknown as Mock,
      createServerImpl: createServerMock as unknown as typeof import_server.createServer,
    });

    // Emit SIGTERM and let the bootstrap's void-handler run.
    process.emit('SIGTERM');
    // First call sets isShuttingDown=true and exits (mocked),
    // so the second call is idempotent — but the LISTENER
    // still fires (we don't gate at the signal-handler level).
    process.emit('SIGINT');

    // The bootstrap's shutdown closure awaits both the
    // server shutdown and the OTel flush. Let the microtask
    // queue settle before asserting.
    await new Promise((resolve) => setImmediate(resolve));

    // The server's shutdown was called exactly once (the
    // guard inside the shutdown closure short-circuits the
    // second invocation).
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(shutdownOtel).toHaveBeenCalledTimes(1);
    exit.mockRestore();
  });
});
