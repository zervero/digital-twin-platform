/**
 * createFetchMarketplaceApi tests -- V3.5 follow-up.
 *
 * The factory used to fall back to `globalThis.fetch` without injecting
 * the auth bearer token, which meant every call to `/api/plugins`
 * (and friends) hit the BFF with no `Authorization` header and was
 * bounced by `requiresTenantScope` with 401 AUTH_SESSION_EXPIRED.
 * The V3.5 fix adds an optional `getAuthToken` callback; these
 * tests pin the wiring so a future regression that drops the
 * header (or stops reading the token lazily) is caught here.
 */

import { describe, expect, it, vi } from 'vitest';

import { createFetchMarketplaceApi } from '../useMarketplaceInstall.js';

type CapturedRequest = {
  url: string;
  init: RequestInit;
};

function makeFetch(capture: CapturedRequest[], status = 200): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    capture.push({
      url: typeof input === 'string' ? input : input.toString(),
      init,
    });
    return new Response('[]', { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
}

describe('createFetchMarketplaceApi (V3.5 follow-up)', () => {
  it('omits the Authorization header when getAuthToken is not provided (V3.4 behavior)', async () => {
    const capture: CapturedRequest[] = [];
    const api = createFetchMarketplaceApi({
      baseUrl: 'http://localhost:3001',
      fetchImpl: makeFetch(capture),
    });

    await api.listInstalled('acme-corp');

    expect(capture).toHaveLength(1);
    const headers = capture[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
    expect(headers['content-type']).toBeUndefined();
  });

  it('omits the Authorization header when getAuthToken returns null', async () => {
    const capture: CapturedRequest[] = [];
    const api = createFetchMarketplaceApi({
      baseUrl: 'http://localhost:3001',
      fetchImpl: makeFetch(capture),
      getAuthToken: () => null,
    });

    await api.listInstalled('acme-corp');

    const headers = capture[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it('injects `Authorization: Bearer <token>` when getAuthToken returns a string', async () => {
    const capture: CapturedRequest[] = [];
    const api = createFetchMarketplaceApi({
      baseUrl: 'http://localhost:3001',
      fetchImpl: makeFetch(capture),
      getAuthToken: () => 'mock-abc-123',
    });

    await api.listInstalled('acme-corp');

    const headers = capture[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer mock-abc-123');
  });

  it('reads the token lazily on every request so a post-mount login picks up automatically', async () => {
    const capture: CapturedRequest[] = [];
    let currentToken: string | null = null;
    const api = createFetchMarketplaceApi({
      baseUrl: 'http://localhost:3001',
      fetchImpl: makeFetch(capture),
      getAuthToken: () => currentToken,
    });

    // First call before login: no header.
    await api.listInstalled('acme-corp');
    expect((capture[0]!.init.headers as Record<string, string>).authorization).toBeUndefined();

    // Simulate the user logging in.
    currentToken = 'mock-after-login';

    // Next call: the fresh token must show up.
    await api.listInstalled('acme-corp');
    expect((capture[1]!.init.headers as Record<string, string>).authorization).toBe(
      'Bearer mock-after-login',
    );

    // And logout: subsequent calls stop sending the header.
    currentToken = null;
    await api.listInstalled('acme-corp');
    expect((capture[2]!.init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('keeps `content-type: application/json` on body-bearing requests and still sends the bearer token', async () => {
    const capture: CapturedRequest[] = [];
    const api = createFetchMarketplaceApi({
      baseUrl: 'http://localhost:3001',
      fetchImpl: makeFetch(capture),
      getAuthToken: () => 'mock-xyz',
    });

    await api.install('acme-corp', 'hello-plugin', '1.0.0');

    expect(capture).toHaveLength(1);
    expect(capture[0]!.url).toContain('/api/plugins/hello-plugin/install');
    const headers = capture[0]!.init.headers as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers.authorization).toBe('Bearer mock-xyz');
  });

  it('strips the trailing slash from baseUrl before calling fetch', async () => {
    const capture: CapturedRequest[] = [];
    const api = createFetchMarketplaceApi({
      baseUrl: 'http://localhost:3001/',
      fetchImpl: makeFetch(capture),
    });

    await api.listInstalled('acme-corp');

    expect(capture[0]!.url).toBe('http://localhost:3001/api/plugins');
  });
});
