# Digital Twin Platform

Industrial digital twin platform starter. Web + Desktop, Vue 3 + Three.js, BFF service, monorepo.

> 其他语言 / Other languages: [简体中文](README.zh-CN.md)

## Versions

- **V1** - Runnable starter (this version): monorepo, BFF with mock data, Engine SDK, Web app, Tauri desktop scaffold, V2/V3 boundary placeholders.
- **V2** - Enterprise platform base (command bus, realtime, plugins, observability, auth).
- **V3** - Industrial product layer (AI agents, collaboration, marketplace, tenancy, audit).
  - **V3.0** - Shipped: real auth (OIDC), Helm chart, OTel wiring.
  - **V3.1** - Shipped: production-platform guide, chart lint CI.
  - **V3.2** - Shipped: signed desktop installers + auto-update channel. Closure: [ADR 0015](docs/adr/0015-v3.2-closure.md). Operator guide: [docs/development/desktop-releases.md](docs/development/desktop-releases.md).
  - **V3.3** - Shipped: multi-tenant data model + dev IdP `--tenant` flag + isolation smoke. Closure: [ADR 0016](docs/adr/0016-v3.3-closure.md). Operator guide: [docs/development/multi-tenant.md](docs/development/multi-tenant.md).
  - **V3.4** - Shipped: plugin marketplace + persistence (signed artifacts, file-based `PluginStore`, install / upgrade / uninstall). Closure: [ADR 0017](docs/adr/0017-v3.4-closure.md). Operator guide: [docs/development/marketplace.md](docs/development/marketplace.md).
- **V3.5** - Shipped: localization layer `@dt/i18n` (English + Simplified Chinese, dictionary-completeness test, language switcher). Closure: [ADR 0018](docs/adr/0018-v3.5-i18n.md). Operator guide: [docs/development/i18n.md](docs/development/i18n.md).

See [docs/architecture/overview.md](docs/architecture/overview.md) for the high-level design and [docs/development/local-dev.md](docs/development/local-dev.md) for the local development guide.

## Requirements

- **Node.js >= 22.17.1** (Node 20.x is not supported; see [ADR 0004](docs/adr/0004-node-22-pin.md))
- **pnpm 11.7.0** (enabled via `corepack enable` after cloning)

## Stack

- pnpm workspace + Turborepo
- TypeScript (strict)
- Vue 3 + Vite + Pinia
- Three.js
- Tauri (desktop)
- Node.js BFF
- Vitest

## Quick Start

```bash
nvm use            # picks up .nvmrc -> Node 22.17.1
corepack enable    # pins pnpm to 11.7.0
pnpm install
pnpm dev
```

Web: http://localhost:5173
BFF: http://localhost:3001

## Tasks

```bash
pnpm typecheck    # strict typecheck across the workspace
pnpm test         # vitest unit tests
pnpm lint         # eslint
pnpm build        # production builds
```

## Layout

```
apps/
  web/        # Browser app (Vue 3 + Vite); serves viewport kit under public/assets/
  desktop/    # Tauri desktop shell
  bff/        # Node.js BFF service
packages/
  contracts/        # Shared DTOs and event names
  engine-sdk/       # Three.js engine SDK (GLB decode + A-light fallback)
  asset-system/     # Host byte catalog: manifest, versioned download/cache
  scene-domain/     # Scene business model
  device-domain/    # Device business model
  api-client/       # Typed BFF client
  ui-kit/           # Presentational Vue components
  app-shell/        # Shared composition: layout, stores, panels
  i18n/             # Localization dictionaries (en + zh-CN)
  realtime/         # Stream interfaces
  plugin-runtime/   # Plugin manifest and registration
  plugin-registry/  # Marketplace plugin index model
  auth-oidc/        # OIDC verify helpers
  tenant/           # Multi-tenant claim helpers
  ai-agent/         # Command intent types
  observability/    # Logger
  otel/             # OpenTelemetry wiring
  config/           # Shared config helpers
tooling/
  tsconfig/   # Shared tsconfig presets
docs/
  architecture/  # Overview, workspace, engine SDK
  adr/           # Architecture decision records
  development/   # Local dev + viewport assets guides
```

See [docs/architecture/workspace.md](docs/architecture/workspace.md) for package boundaries and dependency rules. Viewport GLB catalog / cache flow: [docs/development/viewport-assets.md](docs/development/viewport-assets.md) (ADR 0021 / 0022).

## License

[MIT](LICENSE) - Copyright (c) 2026 zengxiangrong
