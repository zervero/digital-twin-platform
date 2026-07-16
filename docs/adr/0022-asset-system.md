# ADR 0022 - `@dt/asset-system` (host byte catalog & cache)

## Status

Accepted (2026-07-16) on branch `feat/viewport-gltf`.

## Context

ADR 0021 put GLB **decode** in `@dt/engine-sdk` and URL resolution in the
host. Product wants: check local cache → download if missing → read local
thereafter, and **not** ship large GLBs inside the desktop installer.

That byte pipeline must not live in `engine-sdk` (no Vue/app I/O policy
creep) and must not import Three.js (workspace rule).

## Decision

1. Add **`@dt/asset-system`**: manifest + versioned cache keys, downloader,
   byte cache adapters, `ensureCachedUrl`.
2. Engine gains optional **`EngineOptions.assets.ensureLocalUrl(url)`**
   called before `GLTFLoader`, so download/cache stays host-owned.
3. **V1 adapters:** in-memory + browser Cache Storage. Desktop disk cache
   is the same `ByteCache` interface, injected by the desktop host later.
4. **Non-goals for this ADR:** texture/HDR loaders, GPU/Object3D cache,
   tenant upload, marketplace.

## Consequences

- `apps/web` depends on `@dt/asset-system` and stops owning catalog logic
  inline (thin boot wiring only).
- `workspace.md` documents the new edge: `apps/web → asset-system`;
  `asset-system →` (no local packages required; optional contracts later).
- Installer size policy: production desktop should use remote manifest
  URLs + disk cache, not `public/*.glb` in the bundle (dev fixtures may
  remain same-origin).
