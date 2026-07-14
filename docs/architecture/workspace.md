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
app-shell      -> ui-kit, engine-sdk, api-client, contracts, device-domain, scene-domain, realtime, plugin-runtime
# Notes:
#   - realtime: V2.0 useDeviceStream added the consumer edge
#     (commit e00bf0f). The runtime depends on contracts only;
#     the consumer wiring is internal to app-shell.
#   - plugin-runtime: V2.2 plugin runtime ships in T4. The
#     runtime depends on contracts only; the activation
#     context passes a structural PluginContext that the host
#     satisfies with the concrete api-client / realtime.
#   - vue-router: V4 Task 4 owns `/ops` and `/admin/*` routes
    #     inside app-shell (`createAppRouter`). apps/web installs
    #     the router; AppShell is toolbar + RouterView only.
    #   - V4 Task 9: admin marketplace / installed / publish are
    #     real pages (DtAppCard grid).
    #   - V4 Task 10: `/settings/appearance` is personal accent
    #     settings for all roles; `/admin/appearance` redirects there.
    #   - V4 Task 12: admin users + audit pages call api-client
    #     `listUsers` / `setUserRoles` / `listAuditEvents`.
    #   - V4 Task 13: `/admin/tenant` shows AuthSession context only;
    #     overview/org/assets/models/alarms stay out of the side nav
    #     until honest BFF exists (no “建设中” stubs in release).
engine-sdk     -> contracts, three
api-client     -> contracts
device-domain  -> contracts
scene-domain   -> contracts
ui-kit         -> contracts
realtime       -> contracts
plugin-runtime -> contracts
@dt/plugin-registry -> contracts, plugin-runtime
ai-agent       -> contracts
observability  -> contracts
config         -> contracts
@dt/tenant     -> contracts
```

Forbidden edges:

- `contracts` must not depend on any local package.
- `ui-kit` must not depend on `api-client` or `engine-sdk`.
- Domain packages must not depend on Vue or Three.js.
- `engine-sdk` must not depend on Vue, the BFF, or any app code.
- `@dt/tenant` must not depend on `@dt/auth-oidc` (or any
  other package that does I/O); the BFF composes the two
  at the route layer. This keeps the package a pure
  types-and-helper module that can be imported from a
  worker / Edge runtime without dragging `jose` along.
- `@dt/plugin-registry` must not import `vue`, `three`,
  `pinia`, `api-client`, `engine-sdk`, or any BFF /
  app-side package. It is a pure-types + in-memory
  factory module that depends on `@dt/plugin-runtime`'s
  V2.2 contract and `@dt/contracts`'s `Permission`
  union. The BFF wires a file-based `RegistryIndex`
  implementation in V3.4 T4; the runtime stays
  storage-agnostic.

## Package-by-package ownership

| Package | Owner | Depends on | Notes |
| --- | --- | --- | --- |
| `@dt/contracts` | Platform | nothing local | Type-only. V4 T11 adds admin user / audit DTOs (`ListUsersResponse`, `AuditEvent`, …) and `admin:users` / `admin:audit` permissions. |
| `@dt/api-client` | Platform | contracts | Typed BFF client. V4 T11: `listUsers` / `setUserRoles` / `listAuditEvents`. |
| `@dt/device-domain` | Platform | contracts | Status labels, sorting, filtering, ops device-tree grouping (`buildDeviceTree`). |
| `@dt/scene-domain` | Platform | contracts | Scene normalization & queries. |
| `@dt/engine-sdk` | Engine | contracts, three | Three.js renderer behind SDK API. |
| `@dt/ui-kit` | UI | contracts | Presentational Vue components. |
| `@dt/app-shell` | UI | ui-kit, engine-sdk, api-client, domain, contracts | Layout, stores, vue-router workspaces (`/ops`, `/admin/*`), panel/viewport wiring. |
| `@dt/realtime` | V2 | contracts | Stream interfaces + in-memory mock. |
| `@dt/plugin-runtime` | V2 | contracts | Plugin manifest, registration, registry. |
| `@dt/ai-agent` | V3 | contracts | Intent types. |
| `@dt/observability` | V2 | contracts | Console logger. |
| `@dt/config` | Platform | contracts | Env parsing helpers. |
| `@dt/tenant` | Platform | contracts | V3.3 tenant types + `getTenantIdFromClaims` claim extractor. |
| `@dt/plugin-registry` | V3.4 | runtime, contracts | Plugin data model, in-memory `createInMemoryPluginIndex` factory for tests. |

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
