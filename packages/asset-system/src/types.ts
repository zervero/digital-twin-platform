/**
 * Shared types for `@dt/asset-system` (host byte catalog — no Three.js).
 */

export interface AssetManifestEntry {
  /** Catalog id; matches `SceneNode.modelId`. */
  modelId: string;
  /** Remote or same-origin source URL for the bytes. */
  url: string;
  /** Version string used in the cache key (`modelId@version`). */
  version: string;
  kind?: string;
  defaultScale?: number;
  yOffset?: number;
}

/** modelId → entry */
export type AssetManifest = Readonly<Record<string, Omit<AssetManifestEntry, 'modelId'> & { modelId?: string }>>;

export interface NormalizedManifestEntry {
  modelId: string;
  url: string;
  version: string;
  kind?: string;
  defaultScale?: number;
  yOffset?: number;
}

export interface ByteCache {
  has(key: string): Promise<boolean>;
  get(key: string): Promise<ArrayBuffer | null>;
  put(key: string, data: ArrayBuffer): Promise<void>;
  /**
   * Produce a URL `GLTFLoader` (or fetch) can read.
   * Memory/Cache Storage adapters return `blob:`; disk adapters return file URLs.
   */
  toReadableUrl(key: string, data: ArrayBuffer): Promise<string>;
}

export interface Downloader {
  download(url: string): Promise<ArrayBuffer>;
}

export type AssetSystemMode = 'cache-first' | 'passthrough';

export interface AssetSystemOptions {
  manifest: AssetManifest;
  cache: ByteCache;
  downloader?: Downloader;
  mode?: AssetSystemMode;
}

export interface EngineAssetsBridge {
  resolveUrl(modelId: string): string | null;
  ensureLocalUrl(url: string): Promise<string>;
}

export interface AssetSystem {
  /** Sync lookup of the catalog source URL (not necessarily local yet). */
  lookupSourceUrl(modelId: string): string | null;
  /** Cache key for a model id, or null if unknown. */
  cacheKeyFor(modelId: string): string | null;
  /**
   * Ensure bytes for this source URL are local; return a loader-readable URL.
   * Unknown URLs (not in manifest) are returned unchanged.
   */
  ensureCachedUrl(sourceUrl: string): Promise<string>;
  /** Wire into `EngineOptions.assets`. */
  createEngineAssets(): EngineAssetsBridge;
}
