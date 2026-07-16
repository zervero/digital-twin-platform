import { describe, expect, it, vi } from 'vitest';

import { createDiskByteCache } from '../cache/disk.js';
import { createMemoryByteCache } from '../cache/memory.js';
import { createAssetSystem } from '../create-asset-system.js';
import { cacheKey } from '../manifest/index.js';

const manifest = {
  'dt.machine.cnc-v1': {
    url: 'https://cdn.example/c.glb',
    version: '1',
    kind: 'machine',
  },
  'dt.sensor.probe-v1': {
    url: 'https://cdn.example/s.glb',
    version: '2',
    kind: 'sensor',
  },
} as const;

describe('cacheKey', () => {
  it('joins modelId and version', () => {
    expect(cacheKey('dt.machine.cnc-v1', '1')).toBe('dt.machine.cnc-v1@1');
  });
});

describe('createAssetSystem cache-first', () => {
  it('downloads once, then reads from cache', async () => {
    const download = vi.fn(async () => {
      const buf = new ArrayBuffer(4);
      new Uint8Array(buf).set([1, 2, 3, 4]);
      return buf;
    });
    const cache = createMemoryByteCache();
    const system = createAssetSystem({
      manifest,
      cache,
      downloader: { download },
      mode: 'cache-first',
    });

    expect(system.lookupSourceUrl('dt.machine.cnc-v1')).toBe(
      'https://cdn.example/c.glb',
    );
    expect(system.cacheKeyFor('dt.machine.cnc-v1')).toBe('dt.machine.cnc-v1@1');

    const first = await system.ensureCachedUrl('https://cdn.example/c.glb');
    const second = await system.ensureCachedUrl('https://cdn.example/c.glb');

    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith('https://cdn.example/c.glb');
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(await cache.has('dt.machine.cnc-v1@1')).toBe(true);
  });

  it('dedupes concurrent ensures for the same key', async () => {
    let resolveDownload!: (v: ArrayBuffer) => void;
    const download = vi.fn(
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          resolveDownload = resolve;
        }),
    );
    const system = createAssetSystem({
      manifest,
      cache: createMemoryByteCache(),
      downloader: { download },
      mode: 'cache-first',
    });

    const p1 = system.ensureCachedUrl('https://cdn.example/c.glb');
    const p2 = system.ensureCachedUrl('https://cdn.example/c.glb');
    // Allow the first ensure's async body to schedule download.
    await Promise.resolve();
    expect(download).toHaveBeenCalledTimes(1);

    resolveDownload(new ArrayBuffer(2));
    await Promise.all([p1, p2]);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('passthrough skips download', async () => {
    const download = vi.fn(async () => new ArrayBuffer(1));
    const system = createAssetSystem({
      manifest,
      cache: createMemoryByteCache(),
      downloader: { download },
      mode: 'passthrough',
    });
    const url = await system.ensureCachedUrl('https://cdn.example/c.glb');
    expect(url).toBe('https://cdn.example/c.glb');
    expect(download).not.toHaveBeenCalled();
  });

  it('createEngineAssets wires resolveUrl + ensureLocalUrl', async () => {
    const download = vi.fn(async () => new ArrayBuffer(1));
    const system = createAssetSystem({
      manifest,
      cache: createMemoryByteCache(),
      downloader: { download },
    });
    const assets = system.createEngineAssets();
    expect(assets.resolveUrl('missing')).toBeNull();
    expect(assets.resolveUrl('dt.sensor.probe-v1')).toBe(
      'https://cdn.example/s.glb',
    );
    await assets.ensureLocalUrl('https://cdn.example/s.glb');
    expect(download).toHaveBeenCalledWith('https://cdn.example/s.glb');
  });
});

describe('createDiskByteCache', () => {
  it('reads and writes via injected IO', async () => {
    const files = new Map<string, ArrayBuffer>();
    const cache = createDiskByteCache({
      pathForKey: (key) => `/cache/${key}.glb`,
      exists: async (path) => files.has(path),
      read: async (path) => files.get(path)!,
      write: async (path, data) => {
        files.set(path, data);
      },
      toUrl: (path) => `asset://localhost${path}`,
    });

    const key = 'dt.machine.cnc-v1@1';
    expect(await cache.has(key)).toBe(false);
    const data = new ArrayBuffer(3);
    await cache.put(key, data);
    expect(await cache.has(key)).toBe(true);
    expect(await cache.toReadableUrl(key, data)).toBe(
      'asset://localhost/cache/dt.machine.cnc-v1@1.glb',
    );
  });
});
