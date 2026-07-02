# ADR 0002 - Engine as an SDK

## Status

Accepted (V1).

## Context

The 3D runtime is the most likely piece of the platform to be reused
elsewhere (training viewers, customer-facing demos, embedded previews). If
we treat it as a UI component, we will eventually have to peel it back out
of the shell and rewrite the seams.

## Decision

Build `@dt/engine-sdk` as a standalone package from day one. Public
surface:

- `createEngine(options): DigitalTwinEngine`
- `mount(container)`, `loadScene(snapshot)`, `selectNode(id)`,
  `resize()`, `dispose()`, `getSelectedNodeId()`.

Vue code is forbidden from importing internal files. The package's
`src/index.ts` is the only allowed import entry point.

## Consequences

- The engine is testable in isolation. We test the state machine in jsdom
  without a WebGL context.
- We can swap Three.js for a different renderer later without rewriting
  the shell.
- Vue components stay declarative: they pass a snapshot in, observe a
  selected node id, and never touch scenes, cameras, or materials.
- We commit to a small, stable API. Adding `pickNode`, animation, or
  asset loading in V2 is straightforward; redesigning the surface would
  be expensive.
