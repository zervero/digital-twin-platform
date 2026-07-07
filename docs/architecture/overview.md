# Architecture Overview

The Digital Twin Platform is a pnpm + Turborepo monorepo. Three apps, eleven
shared packages, and a small `tooling/` workspace compose into a single
product that can run in the browser, on macOS, and on Windows.

## The layers

```
            +---------------------- Web (Vue 3) ----------------------+
            |  +------------------ Desktop (Tauri) ----------------+ |
            |  |                  BFF (Node/Hono)                  |  |
            |  |                                                    |  |
            |  |  +-- app-shell ---+-- ui-kit --+                   |  |
            |  |  |   (Pinia,      |  (presentational components)  |  |
            |  |  |    layout)     +-------------+                  |  |
            |  |  |                                                |  |
            |  |  +-- engine-sdk -- three.js (Three.js renderer)   |  |
            |  |  +-- desktop updater -- @tauri-apps/plugin-updater |  |
            |  |  +-- api-client -- fetch wrapper                |  |
            |  |  +-- contracts -- shared DTOs & events           |  |
            |  |  +-- device-domain, scene-domain (pure)          |  |
            |  |  +-- realtime, plugin-runtime, ai-agent,        |  |
            |  |     observability, config, otel, tenant          |  |
            |  |     (boundaries; @dt/tenant ships types + claim   |  |
            |  |      extractor only, no I/O -- see V3.3 docs)     |  |
            |  |     otel = BFF-only; web consumes VITE_OTEL_*    |  |
            |  |     env vars once V3.x browser RUM ships         |  |
            |  +------------------------------------------------+  |
            +-------------------------------------------------------+
```

The apps are the only place that depends on a runtime (browser, Tauri, Node).
Everything below the apps is plain TypeScript and stays runnable in
isolation.

## V1 boundaries

V1 is intentionally small. The boundaries that already exist are:

- **Engine SDK** - Three.js is hidden behind `createEngine()`. Vue code only
  calls `mount`, `loadScene`, `selectNode`, and `dispose`.
- **API client** - The web app and the BFF share types via `@dt/contracts`.
  No raw `fetch` calls reach into BFF endpoints from components.
- **Domain** - Device and scene logic lives in pure packages with no Vue or
  Three.js dependencies.
- **V2/V3 placeholders** - `realtime`, `plugin-runtime`, `ai-agent`, and
  `observability` ship as typed interfaces plus a minimal in-memory
  implementation. They are designed for V2/V3 to grow into without
  restructuring the apps.

## What V1 does not do

- No auth. The BFF serves everyone.
- No realtime. Device list is fetched once on startup.
- No plugin loading. Plugin runtime exports the manifest and registration
  contract only.
- No AI. The `ai-agent` package exports types only.
- No marketplace, no tenancy beyond the V3.3 dev mock registry,
  no audit log. See `docs/development/multi-tenant.md` for the
  V3.3 model and the production follow-ups it implies.
