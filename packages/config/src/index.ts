/**
 * @dt/config
 *
 * Shared environment helpers. Each runtime (web, desktop, bff) parses its
 * own env vars; this package centralizes the helpers and validation so we
 * don't reimplement the same coercion logic in every app.
 */

export function readString(value: string | undefined, fallback: string): string {
  if (value === undefined || value === '') return fallback;
  return value;
}

export function readInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true';
}

export function readEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value === undefined) return fallback;
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export interface AppEnv {
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  port: number;
}

export function readAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return {
    nodeEnv: readEnum(env['NODE_ENV'], ['development', 'production', 'test'] as const, 'development'),
    logLevel: readEnum(env['LOG_LEVEL'], ['debug', 'info', 'warn', 'error'] as const, 'info'),
    port: readInt(env['PORT'], 3001),
  };
}
