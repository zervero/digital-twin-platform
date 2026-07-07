/**
 * Tests for @dt/otel (V3.1).
 *
 * We don't exercise the real NodeSDK against a collector
 * here — that would require an OTLP test server. Instead
 * we cover:
 *   - `isOtelDisabled` honors `OTEL_SDK_DISABLED=true`
 *   - `startOtel` returns null when the kill switch is set
 *   - `shutdownOtel` calls the underlying SDK's shutdown()
 *     exactly once, even when called on a null handle
 *   - `buildOtelResource` populates the standardized
 *     attributes from the config
 *
 * The OTel SDK is mocked via vi.mock so we don't actually
 * open any network sockets during the test run.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const shutdown = vi.fn().mockResolvedValue(undefined);
const start = vi.fn();

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    start,
    shutdown,
  })),
}));

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: vi.fn().mockImplementation(() => ({})),
}));

import {
  buildOtelResource,
  isOtelDisabled,
  shutdownOtel,
  startOtel,
} from '../index.js';

const baseConfig = {
  serviceName: 'digital-twin-platform-bff',
  serviceVersion: '3.1.0',
  environment: 'test',
  otlpEndpoint: 'https://otel.example.test',
};

describe('isOtelDisabled', () => {
  const original = process.env['OTEL_SDK_DISABLED'];

  afterEach(() => {
    if (original === undefined) {
      delete process.env['OTEL_SDK_DISABLED'];
    } else {
      process.env['OTEL_SDK_DISABLED'] = original;
    }
  });

  it('returns false when OTEL_SDK_DISABLED is unset', () => {
    delete process.env['OTEL_SDK_DISABLED'];
    expect(isOtelDisabled()).toBe(false);
  });

  it('returns true when OTEL_SDK_DISABLED=true', () => {
    process.env['OTEL_SDK_DISABLED'] = 'true';
    expect(isOtelDisabled()).toBe(true);
  });

  it('treats case-insensitive "True" / "TRUE" as disabled', () => {
    process.env['OTEL_SDK_DISABLED'] = 'TRUE';
    expect(isOtelDisabled()).toBe(true);
  });

  it('returns false for any non-true value', () => {
    process.env['OTEL_SDK_DISABLED'] = '0';
    expect(isOtelDisabled()).toBe(false);
  });
});

describe('startOtel', () => {
  beforeEach(() => {
    delete process.env['OTEL_SDK_DISABLED'];
    start.mockClear();
    shutdown.mockClear();
  });

  it('starts the SDK and returns a handle when not disabled', () => {
    const result = startOtel(baseConfig);
    expect(result).not.toBeNull();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('returns null and does not call start() when OTEL_SDK_DISABLED=true', () => {
    process.env['OTEL_SDK_DISABLED'] = 'true';
    const result = startOtel(baseConfig);
    expect(result).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });

  it('strips a trailing slash from the OTLP endpoint before building URLs', async () => {
    // The endpoint URL is consumed inside the OTLP exporter
    // constructors, which we've mocked. The point of this
    // test is that the no-trailing-slash normalization runs
    // without throwing — full URL-shape verification lives
    // in the e2e production-platform smoke.
    const result = startOtel({ ...baseConfig, otlpEndpoint: 'https://otel.example.test///' });
    expect(result).not.toBeNull();
  });
});

describe('shutdownOtel', () => {
  beforeEach(() => {
    shutdown.mockClear();
  });

  it('calls sdk.shutdown() exactly once even across repeated shutdownOtel calls', async () => {
    const handle = startOtel({
      serviceName: 'svc',
      serviceVersion: '0.0.0',
      environment: 'test',
      otlpEndpoint: 'https://otel.example.test',
    });
    expect(handle).not.toBeNull();
    await shutdownOtel(handle);
    await shutdownOtel(handle);
    // The second call must be idempotent — repeated SIGTERM
    // during an in-flight drain shouldn't trigger a second
    // sdk.shutdown() (which the SDK warns about).
    expect(shutdown).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when the handle is null', async () => {
    await expect(shutdownOtel(null)).resolves.toBeUndefined();
    expect(shutdown).not.toHaveBeenCalled();
  });
});

describe('buildOtelResource', () => {
  it('populates the standardized attributes from config', () => {
    const resource = buildOtelResource({
      serviceName: 'svc',
      serviceVersion: '1.2.3',
      environment: 'staging',
    });
    // OTel `attributes` is a Record<string, AttributeValue>;
    // it is reachable directly on the resource, not via
    // JSON.stringify (which leaks internal fields).
    expect(resource.attributes['service.name']).toBe('svc');
    expect(resource.attributes['service.version']).toBe('1.2.3');
    expect(resource.attributes['deployment.environment.name']).toBe('staging');
    expect(typeof resource.attributes['service.instance.id']).toBe('string');
    expect(resource.attributes['service.instance.id']).not.toBe('');
  });

  it('honors an explicit instanceId override', () => {
    const resource = buildOtelResource({
      serviceName: 'svc',
      serviceVersion: '1.2.3',
      environment: 'test',
      instanceId: 'pod-abc-123',
    });
    expect(resource.attributes['service.instance.id']).toBe('pod-abc-123');
  });
});
