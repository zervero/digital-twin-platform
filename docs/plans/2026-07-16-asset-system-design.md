# Asset System V1 — Design

> Status: **approved to implement** (2026-07-16).  
> Package: **`@dt/asset-system`**.  
> Complements: ADR 0021 (engine loads GLB via host URL), Scheme C viewport.

## Goal

Host-side **byte** pipeline:

```
manifest lookup → cache hit? → yes: local URL
                           → no: download → put cache → local URL
```

Engine still **decodes** GLB (Three / GLTFLoader). This package never
imports `three` / `vue`.

## V1 scope

| In | Out |
| --- | --- |
| `manifest` + `version` (cache key = `modelId@version`) | texture / HDR loaders |
| `downloader` (fetch → ArrayBuffer) | upload / admin UI |
| `cache` adapters (memory + Cache Storage; disk adapter interface for desktop) | Object3D / GPU cache (engine-sdk) |
| `ensureCachedUrl` / engine `ensureLocalUrl` hook | bundling large GLBs into Tauri installer |

## Public surface (sketch)

```ts
createAssetSystem({
  manifest: AssetManifest,
  cache: ByteCache,
  downloader?: Downloader, // default fetch
  mode?: 'cache-first' | 'passthrough',
}): AssetSystem

system.lookupSourceUrl(modelId): string | null
system.ensureCachedUrl(sourceUrl): Promise<string> // blob: or passthrough
system.createEngineAssets(): { resolveUrl, ensureLocalUrl }
```

## Platforms

| Host | Cache | Source URL |
| --- | --- | --- |
| Web / desktop dev | Memory and/or Cache Storage | same-origin `/assets/viewport/...` |
| Desktop prod (follow-up) | Disk under app data (inject `ByteCache`) | CDN base + versioned path |

## Docs / graph

- New package in `docs/architecture/workspace.md`
- ADR 0022 for the package boundary
- `docs/development/viewport-assets.md` points at ensure/cache flow
