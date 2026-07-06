import { describe, expect, it } from 'vitest';

import { EnvValidationError, readAppEnv } from '../index.js';

describe('readAppEnv production validation', () => {
  it('passes in development without AUTH_PROVIDER', () => {
    const env = readAppEnv({ NODE_ENV: 'development' });
    expect(env.production).toBe(false);
  });

  it('passes in production with AUTH_PROVIDER=mock', () => {
    const env = readAppEnv({
      NODE_ENV: 'production',
      AUTH_PROVIDER: 'mock',
    });
    expect(env.production).toBe(true);
    expect(env.authProvider).toBe('mock');
  });

  it('passes in production with AUTH_PROVIDER=oidc when OIDC vars are complete', () => {
    const env = readAppEnv({
      NODE_ENV: 'production',
      AUTH_PROVIDER: 'oidc',
      OIDC_ISSUER_URL: 'https://idp.example.test/',
      OIDC_CLIENT_ID: 'digital-twin',
      OIDC_AUDIENCE: 'digital-twin-platform',
      OIDC_SCOPES: 'openid profile device:read',
    });
    expect(env.authProvider).toBe('oidc');
    expect(env.oidc).toEqual({
      issuerUrl: 'https://idp.example.test/',
      clientId: 'digital-twin',
      audience: 'digital-twin-platform',
      scopes: ['openid', 'profile', 'device:read'],
    });
  });

  it('throws in production when AUTH_PROVIDER=oidc and OIDC vars are missing', () => {
    expect(() =>
      readAppEnv({
        NODE_ENV: 'production',
        AUTH_PROVIDER: 'oidc',
        OIDC_ISSUER_URL: 'https://idp.example.test/',
      }),
    ).toThrow(/OIDC_CLIENT_ID|OIDC_AUDIENCE/);
  });

  it('exposes OIDC env as undefined in production+oidc without OIDC vars but lets BFF decide', () => {
    // Dev / test permissive path: the OIDC config is undefined
    // and the BFF picks the mock provider instead. Production
    // throws in the test above.
    const env = readAppEnv({
      NODE_ENV: 'development',
      AUTH_PROVIDER: 'oidc',
    });
    expect(env.authProvider).toBe('oidc');
    expect(env.oidc).toBeUndefined();
  });

  it('passes OIDC_JWKS_URI override through', () => {
    const env = readAppEnv({
      NODE_ENV: 'development',
      AUTH_PROVIDER: 'oidc',
      OIDC_ISSUER_URL: 'https://idp.example.test/',
      OIDC_CLIENT_ID: 'digital-twin',
      OIDC_AUDIENCE: 'digital-twin-platform',
      OIDC_JWKS_URI: 'https://idp.example.test/jwks.json',
    });
    expect(env.oidc?.jwksUri).toBe('https://idp.example.test/jwks.json');
  });

  it('throws EnvValidationError in production when AUTH_PROVIDER is missing', () => {
    expect(() => readAppEnv({ NODE_ENV: 'production' })).toThrow(EnvValidationError);
  });

  it('throws EnvValidationError in production when AUTH_PROVIDER is unknown', () => {
    expect(() =>
      readAppEnv({ NODE_ENV: 'production', AUTH_PROVIDER: 'bogus' }),
    ).toThrow(/AUTH_PROVIDER/);
  });

  it('exposes a structured `missing` field on the error', () => {
    try {
      readAppEnv({ NODE_ENV: 'production' });
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      expect((e as EnvValidationError).missing).toContain('AUTH_PROVIDER');
      return;
    }
    throw new Error('expected EnvValidationError');
  });
});
