/**
 * @dt/otel — V3.1.
 *
 * Thin facade over the OpenTelemetry Node SDK. Owns the
 * SDK lifecycle (start, shutdown) and the resource attributes
 * the rest of the platform cares about. Consumers
 * (`apps/bff`) call `startOtel()` once at boot and
 * `shutdownOtel()` from their SIGTERM handler.
 *
 * The package is **types-only** like the rest of the workspace
 * (the `dist/` is a placeholder). The BFF's runtime loads the
 * SDK directly via the `pnpm deploy` artifact, the same way
 * it loads `tsx` for source.
 *
 * V3.1 boundary. Pure logic, no Vue, no Three, no BFF runtime.
 * The package depends on `@opentelemetry/*` and nothing else
 * from the workspace; the BFF consumes it via the workspace
 * alias.
 *
 * Logs are NOT routed through OTel in V3.1. The V2.3
 * `@dt/observability` JSON-to-stdout story stays as-is; a
 * future track can adopt OTel-native log shipping via a
 * sidecar pattern without changes here.
 *
 * For environment conventions see:
 *   https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

/**
 * OTel resource attributes the platform standardizes on.
 * `service.namespace` is reserved for V3.3 (multi-tenant).
 * `service.instance.id` is generated per process so each pod
 * gets its own trace stream.
 */
const DEFAULT_INSTANCE_ID = `${process.pid}-${Date.now().toString(36)}`;

export interface OtelConfig {
  /** Service name (e.g. `digital-twin-platform-bff`). */
  serviceName: string;
  /** Service version. The BFF reads this from `package.json`. */
  serviceVersion: string;
  /** Deployment environment (e.g. `production`, `staging`, `dev`). */
  environment: string;
  /** Base OTLP endpoint. The SDK appends `/v1/traces` and `/v1/metrics`. */
  otlpEndpoint: string;
  /** Metric export interval in ms. Default 30s. */
  metricsIntervalMs?: number;
  /** Optional instance id override; defaults to a per-process stable id. */
  instanceId?: string;
  /** Optional header bag for the OTLP exporter (auth tokens, etc.). */
  headers?: Record<string, string>;
}

/**
 * Build the OTel resource. Pulled out so the test can verify
 * the attribute shape without starting a real SDK.
 */
export function buildOtelResource(
  config: Pick<OtelConfig, 'serviceName' | 'serviceVersion' | 'environment' | 'instanceId'>,
): ReturnType<typeof resourceFromAttributes> {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    'deployment.environment.name': config.environment,
    'service.instance.id': config.instanceId ?? DEFAULT_INSTANCE_ID,
  });
}

/**
 * Check the OTel SDK kill switch. The standard env var
 * (`OTEL_SDK_DISABLED=true`) is honored before any work is
 * done so a misconfigured consumer pays zero cost.
 */
export function isOtelDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return String(env['OTEL_SDK_DISABLED'] ?? '').toLowerCase() === 'true';
}

/**
 * Start the OTel NodeSDK with OTLP exporters and Node
 * auto-instrumentations.
 *
 * Returns the SDK instance. Callers must call `shutdownOtel`
 * during graceful shutdown so in-flight spans and metrics are
 * flushed before the process exits.
 *
 * If `OTEL_SDK_DISABLED=true` (or `config.disabled` is true),
 * returns `null` so callers can branch without try/catch.
 */
export interface StartOtelResult {
  sdk: NodeSDK;
}

export function startOtel(config: OtelConfig): StartOtelResult | null {
  if (isOtelDisabled()) return null;

  const endpoint = config.otlpEndpoint.replace(/\/+$/, '');
  const traceExporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    ...(config.headers ? { headers: config.headers } : {}),
  });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
      ...(config.headers ? { headers: config.headers } : {}),
    }),
    exportIntervalMillis: config.metricsIntervalMs ?? 30_000,
  });

  const instrumentations = getNodeAutoInstrumentations({
    // fs is noisy and almost never useful; disable by default
    // and let consumers opt back in if they need it.
    '@opentelemetry/instrumentation-fs': { enabled: false },
  });

  const sdk = new NodeSDK({
    resource: buildOtelResource(config),
    traceExporter,
    metricReader,
    instrumentations,
  });

  sdk.start();

  return { sdk };
}

/**
 * Track whether the underlying SDK has already been shut
 * down, so repeated calls (e.g. SIGTERM during an in-flight
 * drain) don't trigger a second `sdk.shutdown()` — which
 * the SDK logs a warning for and which can hang in edge
 * cases. The flag is keyed by the SDK instance so multiple
 * independent handles don't interfere.
 */
const shutdownState = new WeakMap<NodeSDK, Promise<void>>();

/**
 * Shutdown the OTel SDK. Drains in-flight spans and metrics,
 * then closes the exporters. Safe to call on a `null` value
 * (returns immediately) so consumers don't need a branch.
 * Repeated calls on the same handle are idempotent.
 */
export async function shutdownOtel(handle: StartOtelResult | null): Promise<void> {
  if (!handle) return;
  const existing = shutdownState.get(handle.sdk);
  if (existing) return existing;
  const pending = handle.sdk.shutdown();
  shutdownState.set(handle.sdk, pending);
  await pending;
}
