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

  it('passes in production with AUTH_PROVIDER=oidc (reserved for V3)', () => {
    const env = readAppEnv({
      NODE_ENV: 'production',
      AUTH_PROVIDER: 'oidc',
    });
    expect(env.authProvider).toBe('oidc');
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
