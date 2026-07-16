/**
 * Facade: manifest lookup + ensure (download → cache → local URL).
 */

import { createFetchDownloader } from './downloader/index.js';
import {
  cacheKey,
  indexByUrl,
  normalizeManifest,
} from './manifest/index.js';
import type {
  AssetSystem,
  AssetSystemOptions,
  EngineAssetsBridge,
  NormalizedManifestEntry,
} from './types.js';

export function createAssetSystem(options: AssetSystemOptions): AssetSystem {
  const byId = normalizeManifest(options.manifest);
  const byUrl = indexByUrl(byId);
  const cache = options.cache;
  const downloader = options.downloader ?? createFetchDownloader();
  const mode = options.mode ?? 'cache-first';

  // Inflight dedupe for concurrent ensure of the same key.
  const inflight = new Map<string, Promise<string>>();

  function lookupSourceUrl(modelId: string): string | null {
    return byId.get(modelId)?.url ?? null;
  }

  function cacheKeyFor(modelId: string): string | null {
    const entry = byId.get(modelId);
    if (!entry) return null;
    return cacheKey(entry.modelId, entry.version);
  }

  async function ensureEntry(entry: NormalizedManifestEntry): Promise<string> {
    if (mode === 'passthrough') {
      return entry.url;
    }

    const key = cacheKey(entry.modelId, entry.version);
    const pending = inflight.get(key);
    if (pending) return pending;

    const work = (async () => {
      if (await cache.has(key)) {
        const hit = await cache.get(key);
        if (hit) return cache.toReadableUrl(key, hit);
      }
      const data = await downloader.download(entry.url);
      await cache.put(key, data);
      return cache.toReadableUrl(key, data);
    })().finally(() => {
      inflight.delete(key);
    });

    inflight.set(key, work);
    return work;
  }

  async function ensureCachedUrl(sourceUrl: string): Promise<string> {
    const entry = byUrl.get(sourceUrl);
    if (!entry) {
      // Not in manifest — leave URL as-is (engine may still try to load).
      return sourceUrl;
    }
    return ensureEntry(entry);
  }

  function createEngineAssets(): EngineAssetsBridge {
    return {
      resolveUrl: lookupSourceUrl,
      ensureLocalUrl: ensureCachedUrl,
    };
  }

  return {
    lookupSourceUrl,
    cacheKeyFor,
    ensureCachedUrl,
    createEngineAssets,
  };
}

export type { NormalizedManifestEntry };
