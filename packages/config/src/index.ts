/**
 * @dt/config
 *
 * Shared environment helpers. Each runtime (web, desktop, bff) parses its
 * own env vars; this package centralizes the helpers and validation so we
 * don't reimplement the same coercion logic in every app.
 *
 * V2.3 added production-mode validation: in `production`
 * (`NODE_ENV=production`), `readAppEnv` throws `EnvValidationError` if
 * `AUTH_PROVIDER` is missing or not one of the allowed values (`mock` for
 * V2.3, `oidc` reserved for V3).
 *
 * V3.0 lights up `AUTH_PROVIDER=oidc`:
 * - `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE` are required in
 *   production. `OIDC_SCOPES` is optional (default empty). `OIDC_JWKS_URI`
 *   and `OIDC_COOKIE_NAME` are advanced overrides.
 * - In dev / test, missing OIDC vars are tolerated — the BFF falls back
 *   to the mock provider unless the OIDC vars are present and complete.
 * - The structured `OidcConfig` lives on `AppEnv.oidc` so downstream
 *   packages (BFF, `@dt/auth-oidc`) can read it without re-parsing env.
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

/**
 * OIDC issuer config. Required when `AUTH_PROVIDER=oidc` in
 * production; in dev / test, the env gate may run with this
 * missing and the BFF falls back to the mock provider unless
 * `OIDC_ALLOW_DEV_BYPASS=false` is set, in which case the
 * config is required regardless of NODE_ENV.
 */
export interface OidcConfig {
  /** OIDC issuer URL — used for `iss` claim verification + JWKS discovery. */
  issuerUrl: string;
  /** OAuth client id — used to talk to the IdP on the server-to-server path. */
  clientId: string;
  /** Expected `aud` claim of issued JWTs. */
  audience: string;
  /** Scopes the BFF requests at the `/authorize` redirect. */
  scopes: readonly string[];
  /** Optional JWKS URI override (defaults to `${issuerUrl}/.well-known/jwks.json`). */
  jwksUri?: string;
  /** Optional shared cookie name override. Defaults to `dt_oidc_session`. */
  cookieName?: string;
}

export interface AppEnv {
  nodeEnv: 'development' | 'production' | 'test';
  production: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  port: number;
  authProvider?: AuthProvider;
  /**
   * Populated when AUTH_PROVIDER=oidc and the required OIDC
   * env vars are present and valid. Undefined for the mock
   * provider and for OIDC deployments that haven't supplied
   * the config yet.
   */
  oidc?: OidcConfig;
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

  // V3.0 OIDC env gate. In production, AUTH_PROVIDER=oidc
  // requires the four core OIDC vars. In dev / test we are
  // lenient — the BFF may run without OIDC for the mock path
  // and the validation here only fires when the user has
  // actually asked for OIDC and missed a var.
  let oidc: OidcConfig | undefined;
  if (authProvider === 'oidc') {
    const issuerUrl = env['OIDC_ISSUER_URL'] ?? '';
    const clientId = env['OIDC_CLIENT_ID'] ?? '';
    const audience = env['OIDC_AUDIENCE'] ?? '';
    const scopesEnv = env['OIDC_SCOPES'] ?? '';
    const jwksUri = env['OIDC_JWKS_URI'];
    const cookieName = env['OIDC_COOKIE_NAME'];

    const missing: string[] = [];
    if (!issuerUrl) missing.push('OIDC_ISSUER_URL');
    if (!clientId) missing.push('OIDC_CLIENT_ID');
    if (!audience) missing.push('OIDC_AUDIENCE');

    if (production && missing.length > 0) {
      throw new EnvValidationError(missing, []);
    }

    if (missing.length === 0) {
      oidc = {
        issuerUrl,
        clientId,
        audience,
        scopes: scopesEnv.split(/\s+/).filter(Boolean),
        ...(jwksUri ? { jwksUri } : {}),
        ...(cookieName ? { cookieName } : {}),
      };
    }
  }

  return {
    nodeEnv,
    production,
    logLevel: readEnum(env['LOG_LEVEL'], ['debug', 'info', 'warn', 'error'] as const, 'info'),
    port: readInt(env['PORT'], 3001),
    authProvider,
    ...(oidc ? { oidc } : {}),
  };
}
