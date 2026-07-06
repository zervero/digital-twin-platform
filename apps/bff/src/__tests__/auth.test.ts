import { beforeEach, describe, expect, it } from 'vitest';

import { AuthError, MockAuthStore } from '../auth/mock-store.js';

describe('MockAuthStore (V2.1)', () => {
  let store: MockAuthStore;
  beforeEach(() => {
    store = new MockAuthStore();
  });

  it('logs in any well-formed email', async () => {
    const res = await store.login({ email: 'alice@example.com' });
    expect(res.session.user.email).toBe('alice@example.com');
    expect(res.session.token.length).toBeGreaterThan(8);
    expect(res.session.user.roles).toContain('viewer');
  });

  it('rejects malformed email with AUTH_INVALID_CREDENTIALS', async () => {
    await expect(store.login({ email: 'not-an-email' }))
      .rejects.toBeInstanceOf(AuthError);
    try {
      await store.login({ email: 'not-an-email' });
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('getMe returns the session for a valid token', async () => {
    const { session } = await store.login({ email: 'bob@example.com' });
    const me = await store.getMe(session.token);
    expect(me.session?.user.email).toBe('bob@example.com');
  });

  it('getMe returns null for an unknown token', async () => {
    const me = await store.getMe('does-not-exist');
    expect(me.session).toBeNull();
  });

  it('logout invalidates the token', async () => {
    const { session } = await store.login({ email: 'carol@example.com' });
    await store.logout(session.token);
    const me = await store.getMe(session.token);
    expect(me.session).toBeNull();
  });
});
