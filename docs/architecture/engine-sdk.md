# Engine SDK

`@dt/engine-sdk` is the only place that imports Three.js in the entire
codebase. The package exposes a tiny public API designed to be reusable
beyond this app.

## Public surface

```ts
import {
  createEngine,
  type EngineOptions,
  type DigitalTwinEngine,
  type AssetLoadEvent,
} from '@dt/engine-sdk';

const engine: DigitalTwinEngine = createEngine({
  antialias: true,
  assets: {
    // Host catalog — engine never hardcodes /assets/... paths (ADR 0021).
    // Prefer `@dt/asset-system`.createEngineAssets() for ensure/cache (ADR 0022).
    resolveUrl: (modelId) => catalog[modelId]?.url ?? null,
    ensureLocalUrl: async (url) => assetSystem.ensureCachedUrl(url),
  },
});
engine.mount(container);
engine.onAssetLoad((ev: AssetLoadEvent) => {
  /* progress | node-fallback | complete */
});
await engine.loadScene(sceneSnapshot);
engine.selectNode('machine-1');
engine.resetView();       // restore default 3/4 pose (`reset-view` command)
engine.fitAll();          // frame all loaded nodes
engine.focusNode('machine-1'); // orbit-focus a node (`focus` command)
engine.clearScene();      // tear down instances; keep the mounted renderer
engine.dispose();
```

## What it does today

- Renders a Three.js scene inside the provided container.
- Builds a floor with a subtle grid.
- Places **A-light** procedural placeholders per `SceneNode` (cabinet /
  sensor pole / quiet pads). Status and selection tint live on an
  engine-owned **status lamp**, not whole-body albedo.
- When `EngineOptions.assets` is set and `SceneNode.modelId` resolves,
  loads GLB via `GLTFLoader`, caches templates by URL for the tab
  session, and progressively replaces placeholders. Failures keep
  A-light and emit `node-fallback`.
- Auto-resizes when the container resizes.
- Camera helpers: `resetView`, `fitAll`, `focusNode` (pure framing math in
  `camera-framing.ts`; no orbit controls yet).
- `clearScene()` removes the loaded graph (and selection) without unmounting
  the renderer — used when auth drops the scene snapshot on logout.
  Catalog **templates** may be retained; **instances** are disposed.
- Disposes the renderer, scene, geometries, and materials on `dispose()`.

## What it does not do

- No picking. V1 selects nodes from the UI, not by clicking on the 3D scene.
- No environment maps / IBL yet (Scheme C phase C3 / deferred in ADR 0021).
- No continuous animation beyond the render loop.
- No post-processing.
- No interactive orbit / pan / zoom controls (tool strips call framing helpers).
- No hardcoded asset paths — the host injects `resolveUrl`.

## Asset catalog (host)

Use [`@dt/asset-system`](../../packages/asset-system) for manifest +
versioned byte cache + download. See
[`docs/development/viewport-assets.md`](../development/viewport-assets.md)
and [`apps/web/public/assets/viewport/ASSETS.md`](../../apps/web/public/assets/viewport/ASSETS.md).

## Why the SDK shape

The design stays a deliberate "boring and runnable" surface. By exposing a
small mount / load / select / frame / dispose API (plus optional assets),
the package:

- Stays easy to test (camera framing + asset upgrade are pure / mocked;
  the test suite never requires real WebGL for GLB decode).
- Can be replaced wholesale if we outgrow Three.js.
- Has a stable contract that Vue code can target without leaking the
  renderer implementation.
