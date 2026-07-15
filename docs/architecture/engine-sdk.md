# Engine SDK

`@dt/engine-sdk` is the only place that imports Three.js in the entire
codebase. The package exposes a tiny public API designed to be reusable
beyond this app.

## Public surface

```ts
import { createEngine, type EngineOptions, type DigitalTwinEngine } from '@dt/engine-sdk';

const engine: DigitalTwinEngine = createEngine({ antialias: true });
engine.mount(container);
await engine.loadScene(sceneSnapshot);
engine.selectNode('machine-1');
engine.resetView();       // restore default 3/4 pose (`reset-view` command)
engine.fitAll();          // frame all loaded nodes
engine.focusNode('machine-1'); // orbit-focus a node (`focus` command)
engine.clearScene();      // tear down meshes; keep the mounted renderer
engine.dispose();
```

## What it does today (V1 + V4 camera helpers)

- Renders a Three.js scene inside the provided container.
- Builds a floor with a subtle grid.
- Creates one mesh per `SceneNode` (factory/area/machine/sensor).
- Tints meshes by `DeviceStatus` (`online`, `offline`, `warning`, `alarm`).
- Highlights the currently selected node with a brighter color.
- Auto-resizes when the container resizes.
- Camera helpers: `resetView`, `fitAll`, `focusNode` (pure framing math in
  `camera-framing.ts`; no orbit controls yet).
- `clearScene()` removes the loaded graph (and selection) without unmounting
  the renderer — used when auth drops the scene snapshot on logout.
- Disposes the renderer, scene, geometries, and materials on `dispose()`.

## What it does not do

- No picking. V1 selects nodes from the UI, not by clicking on the 3D scene.
- No asset loading. No glTF, no textures, no environment maps.
- No continuous animation beyond the render loop.
- No post-processing.
- No interactive orbit / pan / zoom controls (tool strips call framing helpers).

## V2 plans

- `pickNode(x, y): string | null` for click-to-select.
- Orbit controls behind an `interactivity` option.
- Asset loader with progress events.
- A second render path for the command bus: nodes can subscribe to realtime
  updates and animate status changes.

## Why the SDK shape

The V1 design is a deliberate "boring and runnable" starting point. By
exposing a small mount / load / select / frame / dispose surface, the
package:

- Stays easy to test (camera framing is pure; the test suite never spins up WebGL).
- Can be replaced wholesale if we outgrow Three.js.
- Has a stable contract that Vue code can target without leaking the
  renderer implementation.
