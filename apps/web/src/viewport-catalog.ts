/**
 * Boot helper: load viewport catalog.json into `@dt/asset-system`.
 */

import {
  createAssetSystem,
  createCacheStorageByteCache,
  type AssetManifest,
  type AssetSystem,
  type EngineAssetsBridge,
} from '@dt/asset-system';

let cachedSystem: AssetSystem | null = null;

export async function createViewportAssetSystem(
  fetchImpl: typeof fetch = fetch,
): Promise<AssetSystem> {
  if (cachedSystem) return cachedSystem;
  const res = await fetchImpl('/assets/viewport/catalog.json');
  if (!res.ok) {
    throw new Error(`[web] viewport catalog HTTP ${res.status}`);
  }
  const manifest = (await res.json()) as AssetManifest;
  cachedSystem = createAssetSystem({
    manifest,
    cache: createCacheStorageByteCache('dt-viewport-assets-v1'),
    mode: 'cache-first',
  });
  return cachedSystem;
}

export function viewportEngineAssets(system: AssetSystem): EngineAssetsBridge {
  return system.createEngineAssets();
}
