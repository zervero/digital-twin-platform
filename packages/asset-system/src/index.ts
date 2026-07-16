/**
 * @dt/asset-system
 *
 * Host-owned viewport byte catalog: manifest, versioned cache keys,
 * download, and local readable URLs. Does not import Three.js or Vue.
 */

export { createAssetSystem } from './create-asset-system.js';
export { createFetchDownloader } from './downloader/index.js';
export { createMemoryByteCache } from './cache/memory.js';
export { createCacheStorageByteCache } from './cache/index.js';
export { createDiskByteCache } from './cache/disk.js';
export type { DiskCacheIo } from './cache/disk.js';
export { cacheKey, normalizeManifest, indexByUrl } from './manifest/index.js';

export type {
  AssetManifest,
  AssetManifestEntry,
  AssetSystem,
  AssetSystemMode,
  AssetSystemOptions,
  ByteCache,
  Downloader,
  EngineAssetsBridge,
  NormalizedManifestEntry,
} from './types.js';
