/**
 * Disk / Tauri adapter contract — host injects I/O; package stays free of Tauri.
 */

import type { ByteCache } from '../types.js';

export interface DiskCacheIo {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<ArrayBuffer>;
  write(path: string, data: ArrayBuffer): Promise<void>;
  /** Absolute or app-protocol URL for a cache file path. */
  toUrl(path: string): string;
  /** Join cache root + key → filesystem path. */
  pathForKey(key: string): string;
}

/**
 * Desktop prod: inject Tauri fs (or Node fs in tests) via `DiskCacheIo`.
 */
export function createDiskByteCache(io: DiskCacheIo): ByteCache {
  return {
    async has(key) {
      return io.exists(io.pathForKey(key));
    },
    async get(key) {
      const path = io.pathForKey(key);
      if (!(await io.exists(path))) return null;
      return io.read(path);
    },
    async put(key, data) {
      await io.write(io.pathForKey(key), data);
    },
    async toReadableUrl(key, _data) {
      return io.toUrl(io.pathForKey(key));
    },
  };
}
