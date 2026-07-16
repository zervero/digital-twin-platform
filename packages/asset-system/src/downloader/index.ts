/**
 * Default HTTP(S) / same-origin downloader.
 */

import type { Downloader } from '../types.js';

export function createFetchDownloader(
  fetchImpl: typeof fetch = fetch,
): Downloader {
  return {
    async download(url: string): Promise<ArrayBuffer> {
      const res = await fetchImpl(url);
      if (!res.ok) {
        throw new Error(`[asset-system] download failed ${res.status}: ${url}`);
      }
      return res.arrayBuffer();
    },
  };
}
