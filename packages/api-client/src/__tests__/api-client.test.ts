import { describe, expect, it, vi } from 'vitest';

import type {
  CommandAcceptedResponse,
  Device,
  DigitalTwinCommand,
  SceneSnapshot,
} from '@dt/contracts';

import { ApiClientError } from '../index.js';
import { createApiClient } from '../create-api-client.js';

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const sampleDevices: Device[] = [
  {
    id: 'd-1',
    name: 'CNC-01',
    status: 'online',
    sceneNodeId: 'machine-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const sampleScene: SceneSnapshot = {
  id: 'scene-1',
  name: 'Factory A',
  nodes: [
    { id: 'factory-a', name: 'Factory A', type: 'factory', position: [0, 0, 0] },
  ],
};

describe('@dt/api-client', () => {
  it('trims trailing slash on baseUrl', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(makeJsonResponse({ ok: true }));
    const client = createApiClient({ baseUrl: 'http://example.test/', fetchImpl });
    await client.getHealth();
    expect(fetchImpl).toHaveBeenCalledWith('http://example.test/health', expect.any(Object));
  });

  it('GET /api/devices returns devices', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(makeJsonResponse(sampleDevices));
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    const devices = await client.getDevices();
    expect(devices).toEqual(sampleDevices);
    expect(fetchImpl).toHaveBeenCalledWith('http://example.test/api/devices', expect.any(Object));
  });

  it('GET /api/scene returns a SceneSnapshot', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(makeJsonResponse(sampleScene));
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    const scene = await client.getScene();
    expect(scene.nodes).toHaveLength(1);
  });

  it('POST /api/commands sends a JSON body', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      makeJsonResponse({ accepted: true, commandId: 'c-1' } satisfies CommandAcceptedResponse),
    );
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    const cmd: DigitalTwinCommand = { id: 'c-1', type: 'select', nodeId: 'machine-1' };
    const res = await client.sendCommand(cmd);
    expect(res).toEqual({ accepted: true, commandId: 'c-1' });
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify(cmd));
  });

  it('throws ApiClientError on non-2xx with a parsed body', async () => {
    // Fresh Response per call so the second invocation can re-read the body.
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(makeJsonResponse({ error: 'InvalidCommand', message: 'bad' }, 400)),
      );
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });

    const error = await client.getDevices().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 400,
      body: { error: 'InvalidCommand', message: 'bad' },
    });
  });

  it('throws ApiClientError on non-2xx with no body', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(new Response('not json', { status: 500 })));
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    await expect(client.getDevices()).rejects.toThrow(/status 500/);
  });
});

describe('api-client auth methods (V2.1)', () => {
  it('getMe returns null session when anonymous', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      makeJsonResponse({ session: null }),
    );
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    const me = await client.getMe();
    expect(me.session).toBeNull();
    const [calledUrl, calledInit] = fetchImpl.mock.calls[0]!;
    expect(calledUrl).toBe('http://example.test/api/auth/me');
    // No token set => no Authorization header.
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it('login posts the email, stashes the token, and sends it on subsequent calls', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (_url: string | URL | Request, init?: RequestInit) => {
      const url = typeof _url === 'string' ? _url : _url.toString();
      if (url.endsWith('/api/auth/login')) {
        return makeJsonResponse({
          session: {
            user: { id: 'u1', displayName: 'u', email: 'a@b', roles: ['viewer'] },
            token: 'tok-123',
            expiresAt: '2026-12-31T00:00:00.000Z',
          },
        });
      }
      // getMe after login should be authenticated.
      return makeJsonResponse({
        session: {
          user: { id: 'u1', displayName: 'u', email: 'a@b', roles: ['viewer'] },
          token: 'tok-123',
          expiresAt: '2026-12-31T00:00:00.000Z',
        },
      });
    });
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    const res = await client.login({ email: 'a@b' });
    expect(res.session.token).toBe('tok-123');

    // Login body should have been POSTed with the email.
    const [loginUrl, loginInit] = fetchImpl.mock.calls[0]!;
    expect(loginUrl).toBe('http://example.test/api/auth/login');
    expect(loginInit?.method).toBe('POST');
    expect(JSON.parse(loginInit?.body as string)).toEqual({ email: 'a@b' });

    // Subsequent getMe must include the bearer header.
    const me = await client.getMe();
    expect(me.session?.user.email).toBe('a@b');
    const [, meInit] = fetchImpl.mock.calls[1]!;
    const meHeaders = meInit?.headers as Record<string, string>;
    expect(meHeaders.authorization).toBe('Bearer tok-123');
  });

  it('logout clears the token so Authorization is no longer sent', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async (url: string | URL | Request) => {
      const s = typeof url === 'string' ? url : url.toString();
      if (s.endsWith('/api/auth/login')) {
        return makeJsonResponse({
          session: {
            user: { id: 'u1', displayName: 'u', email: 'a@b', roles: ['viewer'] },
            token: 'tok-xyz',
            expiresAt: '2026-12-31T00:00:00.000Z',
          },
        });
      }
      if (s.endsWith('/api/auth/logout')) {
        return new Response(null, { status: 204 });
      }
      return makeJsonResponse({ session: null });
    });
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    await client.login({ email: 'a@b' });
    await client.logout();
    await client.getMe();
    const lastCall = fetchImpl.mock.calls.at(-1)!;
    const headers = lastCall[1]?.headers as Record<string, string>;
    expect(headers.authorization).toBeUndefined();
  });

  it('setAuthToken(null) is a manual way to clear the token', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () =>
      makeJsonResponse({ session: null }),
    );
    const client = createApiClient({ baseUrl: 'http://example.test', fetchImpl });
    client.setAuthToken('manual-token');
    await client.getMe();
    const [, withToken] = fetchImpl.mock.calls[0]!;
    const withTokenHeaders = withToken?.headers as Record<string, string>;
    expect(withTokenHeaders.authorization).toBe('Bearer manual-token');

    client.setAuthToken(null);
    await client.getMe();
    const [, noToken] = fetchImpl.mock.calls[1]!;
    const noTokenHeaders = noToken?.headers as Record<string, string>;
    expect(noTokenHeaders.authorization).toBeUndefined();
  });
});
