/**
 * Browser Cache Storage byte cache (survives tab refresh).
 * No-ops gracefully when `caches` is unavailable (SSR / Node).
 */

import type { ByteCache } from '../types.js';
import { createMemoryByteCache } from './memory.js';

const META_PREFIX = 'meta:';

export function createCacheStorageByteCache(
  cacheName = 'dt-asset-system-v1',
): ByteCache {
  if (typeof caches === 'undefined') {
    return createMemoryByteCache();
  }

  async function open(): Promise<Cache> {
    return caches.open(cacheName);
  }

  return {
    async has(key) {
      const cache = await open();
      const res = await cache.match(META_PREFIX + key);
      return res !== undefined;
    },
    async get(key) {
      const cache = await open();
      const res = await cache.match(META_PREFIX + key);
      if (!res) return null;
      return res.arrayBuffer();
    },
    async put(key, data) {
      const cache = await open();
      const body = new Response(data, {
        headers: { 'Content-Type': 'model/gltf-binary' },
      });
      await cache.put(META_PREFIX + key, body);
    },
    async toReadableUrl(_key, data) {
      // Blob URLs are simpler for GLTFLoader than custom cache schemes.
      const blob = new Blob([data], { type: 'model/gltf-binary' });
      return URL.createObjectURL(blob);
    },
  };
}
