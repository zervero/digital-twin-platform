# Local Development

This document explains how to run, build, and test the V1 platform on a
fresh checkout.

## Prerequisites

- **Node.js >= 22.17.1** (pinned via `.nvmrc`; Node 20.x is known to fail
  during `pnpm install` — see [ADR 0004](../adr/0004-node-22-pin.md) and
  the Troubleshooting section)
- **pnpm 11.7.0** (`corepack enable` once after cloning to pin pnpm)
- (Optional) Rust toolchain for Tauri desktop builds

To pick up the right versions automatically:

```bash
nvm install   # reads .nvmrc
nvm use
corepack enable
```

## Install

```bash
pnpm install
```

## Run the dev stack

```bash
pnpm dev
```

This boots:

- BFF on http://localhost:3001
- Web app on http://localhost:5173

The Tauri desktop app does not auto-start. Launch it explicitly:

```bash
pnpm --filter @dt/desktop dev
```

## Scripts

```bash
pnpm build        # production build via Turbo
pnpm test         # run all package unit tests
pnpm typecheck    # strict TypeScript check across the workspace
pnpm lint         # eslint
pnpm clean        # remove build artifacts and node_modules
```

## Per-package checks

```bash
pnpm --filter @dt/contracts test
pnpm --filter @dt/device-domain test
pnpm --filter @dt/scene-domain test
pnpm --filter @dt/api-client test
pnpm --filter @dt/engine-sdk test
pnpm --filter @dt/bff dev
pnpm --filter @dt/web dev
pnpm --filter @dt/desktop dev
```

## Environment variables

Web app:

- `VITE_BFF_URL` - defaults to `http://localhost:3001`.

BFF:

- `PORT` - defaults to `3001`.
- `LOG_LEVEL` - one of `debug`, `info`, `warn`, `error`.

Desktop (Tauri):

- Standard Tauri env vars. See Tauri docs.

## Project layout

```
apps/            # Web, Desktop, BFF
packages/        # Shared libraries
tooling/         # tsconfig presets
docs/            # Architecture, ADRs, dev guides
```

## Adding a new package

1. Create `packages/<name>/package.json` and `tsconfig.json`.
2. Extend `../../tooling/tsconfig/base.json` (or `vue.json` for Vue).
3. Add the package to the workspace (`pnpm-workspace.yaml` already globs
   `packages/*`, so this is automatic).
4. Import it via the workspace alias: `"@dt/<name>": "workspace:*"`.

## Troubleshooting

- **Vite dev server won't start** - check that port 5173 is free.
- **BFF unreachable from web** - confirm the URL in `apps/web/.env` or
  `VITE_BFF_URL` matches the BFF's `PORT`.
- **Tests fail in `@dt/engine-sdk`** - the test suite uses `jsdom`; make
  sure the dev dependency installed correctly.
- **Tauri build complains about icons** - the V1 placeholder icons are
  1x1 transparent PNGs. Replace them with real assets before shipping.
- **`pnpm install` fails on Node 20.x** - upgrade to Node 22.17.1 or
  newer (`nvm use` from the repo root). The 20.x line is not supported
  in V1; see [ADR 0004](../adr/0004-node-22-pin.md).
