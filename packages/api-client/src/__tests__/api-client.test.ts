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
