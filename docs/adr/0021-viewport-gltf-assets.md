# ADR 0021 - Viewport GLB assets (Scheme C)

## Status

Accepted (2026-07-15) on branch `feat/viewport-gltf`.

## Context

ADR 0002 established `@dt/engine-sdk` as a small mount / load / select /
dispose surface and deliberately deferred asset loading. The V4 ops stage
still renders status-tinted primitives; product feedback requires
closer-to-real equipment silhouettes.

Scheme C (approved design:
[`docs/plans/2026-07-15-gltf-viewport-design.md`](../plans/2026-07-15-gltf-viewport-design.md))
introduces curated GLB models. That expands the engine beyond “no glTF,”
so the decision must be explicit.

## Decision

1. **Host-owned catalog.** `apps/web` (or desktop web build) serves GLB
   files and injects `EngineOptions.assets.resolveUrl(modelId)`.
   `@dt/engine-sdk` never hardcodes `/assets/...` paths.

2. **Optional `SceneNode.modelId`.** Additive field on `@dt/contracts`
   `SceneNode`. Missing / unknown / failed loads use **A-light**
   procedural placeholders (engine-owned), not a blank stage.

3. **Loader + cache live in engine-sdk.** Use Three.js `GLTFLoader`
   (addons). Cache parsed templates by URL for the tab session; dispose
   **instances** on `clearScene` / `dispose`. Attach an engine-owned
   status/selection lamp so artists need not encode status in albedo.

4. **Progress events** for the shell overlay (`onAssetLoad` /
   `getAssetLoadProgress`). Failures emit per-node fallback; one
   misconfigured asset must not crash the stage.

5. **Out of this ADR’s first delivery:** environment maps / IBL (C3),
   Scheme B layout props, tenant CAD upload, model marketplace.

## Alternatives considered

| Option | Why not |
| --- | --- |
| Scheme A-only (procedural cabinets) | Rejected after product review of fidelity |
| Bake meshes into BFF responses | Wrong layer; binary bloat; couples auth to assets |
| Load glTF from Vue / app-shell | Violates “Three.js only in engine-sdk” |

## Consequences

- `docs/architecture/engine-sdk.md` must document the assets option and
  drop the absolute “no asset loading” claim for load paths that opt in.
- Default kit size and **license** must be tracked (`ASSETS.md` beside
  the catalog). Prefer CC0 / redistributable commercial SKUs.
- CI continues to mock `loadGlb`; real WebGL/GLTFLoader smoke is not a
  default CI gate.
- ADR 0002’s spirit (stable public API, Vue never imports Three) remains;
  the public surface **grows** carefully (`assets`, progress), it is not
  redesigned.
