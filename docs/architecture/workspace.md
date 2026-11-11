# Workspace & Dependency Rules

The monorepo is a pnpm workspace. Three top-level groups:

- `apps/*` - runnable applications.
- `packages/*` - reusable libraries consumed by apps and other packages.
- `tooling/*` - shared developer-tooling (TypeScript presets, ESLint, etc.).

## Dependency rules

The contract is enforced socially in V1 (no automated boundary check) and
will be enforced by a tooling check in V2. The allowed graph is:

```
apps/web       -> app-shell, api-client, contracts, config, asset-system
#   Viewport kit bytes: apps/web/public/assets/viewport/ (dev fixtures).
#   Catalog + ensure/cache live in @dt/asset-system; engine-sdk only gets
#   resolveUrl + ensureLocalUrl (ADR 0021 / 0022). Production desktop should
#   inject a disk ByteCache + CDN URLs (do not ship large GLBs in the installer).
apps/desktop   -> apps/web (built), contracts
apps/bff       -> contracts
app-shell      -> ui-kit, engine-sdk, api-client, contracts, device-domain, scene-domain, realtime, plugin-runtime, document-shell, document-schema, document-modules
#   Document workbench (SPEC 0001 / ADR 0024): `/documents/:typeId` island
#   (requiresAdmin). Boot: installDocumentShell + registerAllDocumentModules.
#   Admin nav for单据 is registry-driven (no per-type hardcoding).
#   vxe-table stays inside document-shell only.
document-modules -> document-schema, document-shell
#   One folder per单据 (definition + seed + register). Catalog append-only.
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
    #   - V4 Task 10 (+ follow-up): appearance is a shared DtDialog
    #     (`AppearanceSettingsDialog` on AppShell). Entries: admin
    #     left nav + toolbar appearance (anonymous + authenticated).
    #     Sign-in uses DtDialog + pill trigger (no inline expand).
    #     Deep links `/settings/appearance` → open dialog + `/ops`;
    #     `/admin/appearance` → open dialog + marketplace.
    #   - V4 Task 12: admin users + audit pages call api-client
    #     `listUsers` / `setUserRoles` / `listAuditEvents`.
    #   - V4 Task 13: `/admin/tenant` shows AuthSession context only;
    #     overview/org/assets/models/alarms stay out of the side nav
    #     until honest BFF exists (no “建设中” stubs in release).
engine-sdk     -> contracts, three
asset-system   -> (none local; host byte catalog / cache — ADR 0022)
api-client     -> contracts
device-domain  -> contracts
scene-domain   -> contracts
ui-kit         -> contracts, element-plus
#   Presentational Dt* + Element-backed wrappers (ADR 0025 / SPEC 0003).
#   Theme bridge maps Element vars to --dt-*. Locale via DtConfigProvider
#   + Day.js (not global app.use). Still no vxe / engine-sdk.
document-schema -> (none local; pure TS document definition types + helpers — ADR 0024)
document-shell  -> document-schema, ui-kit, i18n, vxe-table, vxe-pc-ui
#   Framework only: registry, ports, list/detail runtime. No product单据.
#   Grids = vxe; form controls may use Dt* (Element) from ui-kit.
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
- `ui-kit` must not depend on `api-client`, `engine-sdk`, `document-shell`, or `vxe-table`.
  It **may** depend on `element-plus` (ADR 0025); prefer `Dt*` wrappers over raw `el-*`.
- `document-schema` must not depend on Vue, vxe-table, or `api-client`.
- `document-shell` must not depend on `engine-sdk` or Three.js.
- Domain packages must not depend on Vue or Three.js.
- `engine-sdk` must not depend on Vue, the BFF, or any app code.
- `asset-system` must not depend on Vue, Three.js, `engine-sdk`, or app code
  (byte catalog only; disk I/O is injected via `ByteCache` / `DiskCacheIo`).
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
| `@dt/engine-sdk` | Engine | contracts, three | Three.js renderer behind SDK API; optional host-resolved GLB load (ADR 0021). |
| `@dt/asset-system` | Platform | — | Host byte catalog: manifest, versioned cache, download, ensureLocalUrl (ADR 0022). No Three/Vue. |
| `@dt/ui-kit` | UI | contracts, element-plus | Presentational `Dt*` + Element-backed controls (theme bridge → `--dt-*`). No vxe. |
| `@dt/document-schema` | Platform | — | Schema-driven单据 types + validation/dirty helpers (SPEC 0001). No Vue/vxe; no product modules. |
| `@dt/document-shell` | UI | document-schema, ui-kit, i18n, vxe-table | List + unified detail/edit runtime + registry/nav helpers. No product modules. |
| `@dt/document-modules` | Product demos | document-schema, document-shell | One folder per单据 (`definition` + `seed` + `register`); `catalog.ts` is the only shared append point. |
| `@dt/app-shell` | UI | ui-kit, engine-sdk, api-client, domain, contracts, document-shell, document-modules | Layout, stores, vue-router workspaces (`/ops`, `/admin/*`, `/documents/*`), panel/viewport wiring. |
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
