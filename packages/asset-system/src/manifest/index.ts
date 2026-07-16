/**
 * Manifest normalize + versioned cache keys.
 */

import type {
  AssetManifest,
  NormalizedManifestEntry,
} from '../types.js';

export function cacheKey(modelId: string, version: string): string {
  return `${modelId}@${version}`;
}

export function normalizeManifest(manifest: AssetManifest): Map<string, NormalizedManifestEntry> {
  const byId = new Map<string, NormalizedManifestEntry>();
  for (const [modelId, raw] of Object.entries(manifest)) {
    const version = raw.version ?? '0';
    const url = raw.url;
    if (!url) continue;
    byId.set(modelId, {
      modelId,
      url,
      version,
      kind: raw.kind,
      defaultScale: raw.defaultScale,
      yOffset: raw.yOffset,
    });
  }
  return byId;
}

/** Reverse index: source URL → entry (first wins if duplicates). */
export function indexByUrl(
  byId: Map<string, NormalizedManifestEntry>,
): Map<string, NormalizedManifestEntry> {
  const byUrl = new Map<string, NormalizedManifestEntry>();
  for (const entry of byId.values()) {
    if (!byUrl.has(entry.url)) byUrl.set(entry.url, entry);
  }
  return byUrl;
}
