# Workspace & Dependency Rules

The monorepo is a pnpm workspace. Three top-level groups:

- `apps/*` - runnable applications.
- `packages/*` - reusable libraries consumed by apps and other packages.
- `tooling/*` - shared developer-tooling (TypeScript presets, ESLint, etc.).

## Dependency rules

The contract is enforced socially in V1 (no automated boundary check) and
will be enforced by a tooling check in V2. The allowed graph is:

```
apps/web       -> app-shell, api-client, contracts, config
apps/desktop   -> apps/web (built), contracts
apps/bff       -> contracts
app-shell      -> ui-kit, engine-sdk, api-client, contracts, device-domain, scene-domain
engine-sdk     -> contracts, three
api-client     -> contracts
device-domain  -> contracts
scene-domain   -> contracts
ui-kit         -> contracts
realtime       -> contracts
plugin-runtime -> contracts
ai-agent       -> contracts
observability  -> contracts
config         -> contracts
```

Forbidden edges:

- `contracts` must not depend on any local package.
- `ui-kit` must not depend on `api-client` or `engine-sdk`.
- Domain packages must not depend on Vue or Three.js.
- `engine-sdk` must not depend on Vue, the BFF, or any app code.

## Package-by-package ownership

| Package | Owner | Depends on | Notes |
| --- | --- | --- | --- |
| `@dt/contracts` | Platform | nothing local | Type-only. |
| `@dt/api-client` | Platform | contracts | Typed BFF client. |
| `@dt/device-domain` | Platform | contracts | Status labels, sorting, filtering. |
| `@dt/scene-domain` | Platform | contracts | Scene normalization & queries. |
| `@dt/engine-sdk` | Engine | contracts, three | Three.js renderer behind SDK API. |
| `@dt/ui-kit` | UI | contracts | Presentational Vue components. |
| `@dt/app-shell` | UI | ui-kit, engine-sdk, api-client, domain, contracts | Layout, stores, panel/viewport wiring. |
| `@dt/realtime` | V2 | contracts | Stream interfaces + in-memory mock. |
| `@dt/plugin-runtime` | V2 | contracts | Plugin manifest, registration, registry. |
| `@dt/ai-agent` | V3 | contracts | Intent types. |
| `@dt/observability` | V2 | contracts | Console logger. |
| `@dt/config` | Platform | contracts | Env parsing helpers. |

## Turbo pipelines

```
build        depends on ^build
test         depends on ^build
typecheck    depends on ^build
lint         no upstream
dev          persistent, no cache
```

`^build` means "build dependencies first." This lets us add real `tsc`
builds in V2 without changing the pipeline shape.
