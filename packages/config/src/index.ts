/**
 * @dt/config
 *
 * Shared environment helpers. Each runtime (web, desktop, bff) parses its
 * own env vars; this package centralizes the helpers and validation so we
 * don't reimplement the same coercion logic in every app.
 *
 * V2.3 adds production-mode validation: in `production` (`NODE_ENV=production`),
 * `readAppEnv` throws `EnvValidationError` if `AUTH_PROVIDER` is missing or
 * not one of the allowed values (`mock` for V2.3, `oidc` reserved for V3).
 * The error exposes a structured `missing` / `invalid` field so callers can
 * log a clear message and exit non-zero. In `development` / `test`,
 * `AUTH_PROVIDER` is optional; the BFF defaults to the mock store in those
 * modes via a separate code path.
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

export interface EnvInvalidEntry {
  key: string;
  got: string;
  allowed: readonly string[];
}

export class EnvValidationError extends Error {
  readonly missing: readonly string[];
  readonly invalid: readonly EnvInvalidEntry[];

  constructor(
    missing: readonly string[],
    invalid: readonly EnvInvalidEntry[],
  ) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing: ${missing.join(', ')}`);
    if (invalid.length > 0) {
      parts.push(
        `invalid: ${invalid
          .map((i) => `${i.key}=${i.got} (allowed: ${i.allowed.join('|')})`)
          .join(', ')}`,
      );
    }
    super(parts.length > 0 ? parts.join('; ') : 'environment validation failed');
    this.name = 'EnvValidationError';
    this.missing = missing;
    this.invalid = invalid;
  }
}

export type AuthProvider = 'mock' | 'oidc';

export const ALLOWED_AUTH_PROVIDERS = ['mock', 'oidc'] as const;

export interface AppEnv {
  nodeEnv: 'development' | 'production' | 'test';
  production: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  port: number;
  authProvider?: AuthProvider;
}

export function readAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnv = readEnum(
    env['NODE_ENV'],
    ['development', 'production', 'test'] as const,
    'development',
  );
  const production = nodeEnv === 'production';

  const authProviderRaw = env['AUTH_PROVIDER'];
  let authProvider: AuthProvider | undefined;
  if (authProviderRaw !== undefined && authProviderRaw !== '') {
    if ((ALLOWED_AUTH_PROVIDERS as readonly string[]).includes(authProviderRaw)) {
      authProvider = authProviderRaw as AuthProvider;
    } else if (production) {
      throw new EnvValidationError(
        [],
        [
          {
            key: 'AUTH_PROVIDER',
            got: authProviderRaw,
            allowed: ALLOWED_AUTH_PROVIDERS,
          },
        ],
      );
    }
  }

  if (production && !authProvider) {
    throw new EnvValidationError(['AUTH_PROVIDER'], []);
  }

  return {
    nodeEnv,
    production,
    logLevel: readEnum(env['LOG_LEVEL'], ['debug', 'info', 'warn', 'error'] as const, 'info'),
    port: readInt(env['PORT'], 3001),
    authProvider,
  };
}
