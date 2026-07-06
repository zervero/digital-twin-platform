# V2 Overview

> Active. Records the scope and ordering for V2 work, with
> per-release ship status. V2.0, V2.1, V2.2, and V2.3 are
> shipped; V3 is the next planned track.
>
> For the closed-out V2.0 detail (acceptance matrix, task
> matrix, known limitations), see
> [`docs/adr/0008-v2-closure.md`](../adr/0008-v2-closure.md);
> for V2.1, see
> [`docs/adr/0009-v2.1-closure.md`](../adr/0009-v2.1-closure.md);
> for V2.2, see
> [`docs/adr/0010-v2.2-closure.md`](../adr/0010-v2.2-closure.md);
> for V2.3, see
> [`docs/adr/0011-v2.3-closure.md`](../adr/0011-v2.3-closure.md).

## Context

V1 shipped a runnable starter: 3 apps, 12 packages, 13 acceptance
items, all verified on the host. V1 explicitly deferred the
"enterprise base" work to V2 per the V1 dev spec §8 (V2 Roadmap).
The boundary packages (`@dt/realtime`, `@dt/plugin-runtime`,
`@dt/ai-agent`, `@dt/observability`) exist in V1 as interfaces and
mock implementations.

This plan translates the 10-item V2 roadmap into 5 tracks, picks a
first V2 release (V2.0), and lists the open questions that need an
answer before implementation starts.

## The 5 V2 tracks

The 10 roadmap items cluster naturally into 5 tracks. Each track is
self-contained: it has a clear package owner, a single acceptance
shape, and a natural order relative to the other tracks.

| Track | Spec items | Package(s) | Why it matters |
| --- | --- | --- | --- |
| **A. Realtime data flow** | #1, #2, #3, #4 | `@dt/contracts`, `@dt/realtime`, `@dt/bff`, `@dt/app-shell` | Makes the system live (replace polling with push) |
| **B. Plugin runtime** | #5, #6 | `@dt/plugin-runtime`, `@dt/app-shell` | Lets partners extend the platform without forking |
| **C. Observability** | #7 | `@dt/observability`, `@dt/bff` | Required for any non-toy deployment |
| **D. Auth contracts** | #8 | `@dt/contracts`, `@dt/bff`, `@dt/app-shell` | Prereq for V3 multi-tenancy; contract-only in V2 |
| **E. Production deployment** | #9 | `apps/web`, `apps/bff`, `.github/workflows` | Lets someone other than the author run the system |

(CI checks for lint / typecheck / test / build, spec #10, are
already in place since V1.0.0 — see `.github/workflows/ci.yml`.)

## Track ordering

```
V2.0 ✅  ──►  V2.1 ✅  ──►  V2.2 ✅  ──►  V2.3 ✅
    A,C          D           B            E
```

- **V2.0 (Tracks A + C) ✅ shipped as v2.0.0 (2026-07-06)**: realtime + observability. Smallest delta
  from V1 that makes the system *deployable* in the loose sense
  (live data + structured logs). See [ADR 0008](../adr/0008-v2-closure.md).
- **V2.1 (Track D) ✅ shipped as v2.1.0 (2026-07-06)**: auth contracts. Stable auth + permission
  model in `@dt/contracts`, plumbed through `@dt/api-client`
  and the BFF, consumed from `@dt/app-shell` via composables.
  See [ADR 0009](../adr/0009-v2.1-closure.md).
- **V2.2 (Track B) ✅ shipped as v2.2.0 (2026-07-06)**: plugin runtime. Host-agnostic
  `@dt/plugin-runtime` (manifest validator, registry, extension
  types) plus a Pinia store, composables, and a working sample
  plugin in `@dt/app-shell`. Permission gate reuses the V2.1
  `Permission` union. See [ADR 0010](../adr/0010-v2.2-closure.md).
- **V2.3 (Track E) ✅ shipped as v2.3.0 (2026-07-06)**: production deployment.
  Production env gate (`AUTH_PROVIDER` enforced in `@dt/config`),
  graceful BFF shutdown with `/ready` flip, two Dockerfiles (BFF
  + nginx SPA + `/api/` reverse proxy), `docker-compose.yml` +
  `.env.example`, a Windows CI job, `docs/development/deployment.md`
  with the pre-release pre-flight, and `scripts/smoke-prod.sh` as
  the gating check. Last because everything else needed to be
  stable before we wrote Dockerfiles we wanted to keep. See
  [ADR 0011](../adr/0011-v2.3-closure.md).

This order also keeps each track shippable as a single
release-please version bump, so the V2 release cadence mirrors V1.

## V2.0 in detail

### V2.0 scope

7 implementation tasks + a verification matrix, roughly mirroring V1.

| # | Task | Package(s) | Acceptance item |
| --- | --- | --- | --- |
| 1 | Add `Command` and `Event` discriminated unions to contracts | `@dt/contracts` | New types compile; existing tests still pass |
| 2 | Add a real `WebSocketStream` to realtime, keep `InMemoryRealtimeStream` for tests | `@dt/realtime` | WebSocketStream has subscribe/publish/close, reconnect with backoff, unit tests |
| 3 | Add `/api/stream` WebSocket endpoint that pushes `DigitalTwinEvent`s | `@dt/bff` | `wscat` connects, sees periodic device updates |
| 4 | Add `useDeviceStream` composable that subscribes the app to realtime | `@dt/app-shell` | Device list updates without polling; a new device appears within 2s |
| 5 | Replace console logger with structured JSON logger (level, time, msg, context) | `@dt/observability` | Logger output is JSON, level filter works, child loggers inherit bindings |
| 6 | BFF emits tracing context (request id, duration, status) for every request | `@dt/bff`, `@dt/observability` | `curl /health` response includes a `X-Request-Id`; log line includes the same id |
| 7 | Add an end-to-end smoke test: dev stack + WebSocket + log assertion | `apps/bff`, `apps/web` | New `scripts/smoke-v2.sh` exits 0 |

### V2.0 acceptance (proposed)

| # | Item | How to verify |
| --- | --- | --- |
| 1 | `pnpm typecheck` green | CI |
| 2 | `pnpm test` green, including realtime WS unit tests | CI |
| 3 | `pnpm lint` clean | CI |
| 4 | `pnpm dev:all` brings up BFF, Vite, and a `wscat` connection | local |
| 5 | BFF log lines are valid JSON with `time`, `level`, `msg`, `requestId` | local |
| 6 | Selecting a device in the UI reflects on a second browser within 2s (realtime) | local |
| 7 | All V1 acceptance items still hold | smoke test |

### V2.0 non-goals

These are explicitly **not** in V2.0. They live in later V2.x:

- Authentication (Track D, V2.1)
- Plugin loading (Track B, V2.2)
- Production Docker (Track E, ✅ shipped as part of V2.3)
- CI matrix on Windows (✅ shipped as part of V2.3)
- AI / plugins / marketplace (V3)

## Release status

| Release | Status | Date | ADR |
| --- | --- | --- | --- |
| V2.0 (A+C) | ✅ shipped as `digital-twin-platform@2.0.0` | 2026-07-06 | [0008](../adr/0008-v2-closure.md) |
| V2.1 (D) | ✅ shipped as `digital-twin-platform@2.1.0` | 2026-07-06 | [0009](../adr/0009-v2.1-closure.md) |
| V2.2 (B) | ✅ shipped as `digital-twin-platform@2.2.0` | 2026-07-06 | [0010](../adr/0010-v2.2-closure.md) |
| V2.3 (E) | ✅ shipped as `digital-twin-platform@2.3.0` | 2026-07-06 | [0011](../adr/0011-v2.3-closure.md) |

## Open questions

These need an answer before the V2.0 implementation plan can be
written. Each one has a recommended default; speak up if you disagree.

1. **Realtime transport**: WebSocket only, or also SSE? **Default:
   WebSocket only.** Matches the spec. SSE can be added later
   without breaking the WS path.
2. **WebSocket library**: native `ws`, `@hono/node-ws`, or
   `socket.io`? **Default: `@hono/node-ws`.** Already adapts the
   Hono app the BFF already uses; no new runtime concepts.
3. **Reconnect strategy**: exponential backoff, max 5 attempts?
   **Default: yes.** A simple `100ms * 2^attempt` capped at 30s, 10
   attempts, then surface as an error in the UI.
4. **Logger output format**: JSON only, or human-readable for
   development? **Default: JSON in production (`NODE_ENV=production`),
   pretty-printed in dev.** Switch on the existing `@dt/config`
   env helper.
5. **Tracing scope**: just request id, or full distributed tracing
   (OpenTelemetry)? **Default: request id only.** OpenTelemetry is
   a significant dep; V2.0 can grow into it later.
6. **BFF mock data source**: keep the V1 in-memory mock as the
   source of "live" updates, or add a real timer-based source?
   **Default: timer-based source in V1 mock data, emitting updates
   every 2-5s.** No new upstream service in V2.0.

## V2.1 in detail

### V2.1 scope

6 implementation tasks + a verification matrix, mirroring the
V1 and V2.0 plans. The full source-of-truth is
[`docs/plans/v2.1-implementation-plan.md`](./v2.1-implementation-plan.md);
the closed-out record is
[ADR 0009](../adr/0009-v2.1-closure.md).

| # | Task | Package(s) | Acceptance item |
| --- | --- | --- | --- |
| 1 | Add auth and role types to contracts | `@dt/contracts` | `Role` / `Permission` / `User` / `AuthSession` / `AuthState` (discriminated union) / `LoginRequest` / `LoginResponse` / `MeResponse` / `AuthErrorCode` + `ROLE_PERMISSIONS` + `permissionsFor` |
| 2 | Add `getMe` / `login` / `logout` / `setAuthToken` to api-client, with bearer token held in a closure | `@dt/api-client` | New methods work; `Authorization: Bearer <token>` sent when a token is set; `request` handles 204 / empty body |
| 3 | `MockAuthStore` + `/api/auth/{me,login,logout}` route module | `@dt/bff` | Round-trip: anonymous `/me` returns `{session:null}`; `/login` returns the session; `/me` with the token returns the session; `/logout` returns 204; `/me` after logout returns `{session:null}` |
| 4 | `requiresPermission(store, perm)` middleware + `/api/auth/_protected` demo route | `@dt/bff` | 401 on no / bad token, 403 on missing permission, otherwise sets `c.var.user` / `c.var.permissions` and calls `next()` |
| 5 | `useAuthStore` (Pinia) + `useCurrentUser` + `usePermission` composables; hydrate in `bootstrapAppShell` | `@dt/app-shell` | `usePermission('device:write')` is reactive; `login` / `logout` / `refresh()` drive the state machine; token persisted to `sessionStorage` under `dt:auth:token` |
| 6 | Extend `scripts/smoke-v2.sh` to walk login → me → logout | `scripts/` | New `[smoke] logged in`, `[smoke] /me echoed`, `[smoke] logout invalidated` lines print before the existing `[smoke] OK` |

### V2.1 acceptance (proposed)

| # | Item | How to verify |
| --- | --- | --- |
| 1 | `pnpm typecheck` green | CI |
| 2 | `pnpm test` green, including 5 mock-store + 3 middleware + 3 app-shell auth tests | CI |
| 3 | `pnpm lint` clean | CI |
| 4 | `pnpm build` green | CI |
| 5 | `pnpm smoke:v2` green (now includes auth flow) | CI |
| 6 | `/api/auth/me` returns 200 + `{session:null}` anonymous, 200 with session after login | smoke |
| 7 | `usePermission('device:write')` reactive, respects auth store | unit |

### V2.1 non-goals

These are explicitly **not** in V2.1. They live in later V2.x or
V3:

- Real auth provider (OAuth, SAML, JWT signing / verification).
  The BFF ships a `MockAuthStore` behind an `AuthStore`
  interface; V3 swaps in a real provider.
- Permission enforcement on existing routes (`/api/devices`,
  `/api/scene`, `/api/commands`, `/api/stream`). The middleware
  ships and is exercised by `/api/auth/*` + `/api/auth/_protected`,
  but pre-existing surfaces keep their open access.
- Multi-tenant workspace model (V3, spec #7).
- Audit log events (V3, spec #8).
- Session persistence beyond `sessionStorage`. The token is
  returned; storage is local to the tab. Cross-tab sharing,
  cookies, and refresh tokens are V3.
- Login form UX, password handling, MFA, account recovery.
  The mock store accepts any well-formed email and assigns the
  `viewer` role so the demo "just works".


## V2.2 in detail

### V2.2 scope

6 implementation tasks across `@dt/plugin-runtime`,
`@dt/app-shell`, and `apps/web`, mirroring the V2.0 and V2.1
plans. The full source-of-truth is
[`docs/plans/v2.2-implementation-plan.md`](./v2.2-implementation-plan.md);
the closed-out record is
[ADR 0010](../adr/0010-v2.2-closure.md).

| # | Task | Package(s) | Acceptance item |
| --- | --- | --- | --- |
| 1 | Plugin manifest validator + registry/extension stubs | `@dt/plugin-runtime` | `validatePluginManifest(input): {ok, manifest/errors}` with `PluginManifestError.code` ∈ `INVALID_ID`, `INVALID_VERSION`, `UNKNOWN_PERMISSION`, `MISSING_FIELD` |
| 2 | Plugin registry + extension shapes (full impl) | `@dt/plugin-runtime` | `createPluginRegistry()` with sequential activation, LIFO deactivation, `PERMISSION_DENIED` on missing grants, `state: 'errored'` not blocking the next plugin |
| 3 | Plugin store + panel/menu composables | `@dt/app-shell` | `usePluginStore` (Pinia) with `entries`, `panels`, `menuItems` computeds; `usePluginPanels` / `usePluginMenu` flatten active plugins' extensions |
| 4 | Bootstrap signature + AppShell slot + event hook | `@dt/app-shell` | `bootstrapAppShell({apiClient, host, plugins?, realtime?})` hydrates auth, then activates plugins after permission gating, then mounts `AppShell` |
| 5 | Sample plugin + bootstrap integration test | `apps/web`, `@dt/app-shell` | `helloPlugin` wires into `apps/web`; integration test drives `bootstrapAppShell({plugins:[reg]})` and asserts the panel surfaces via `usePluginPanels()` |
| 6 | Extend `scripts/smoke-v2.sh` with manifest validation | `scripts/` | New `[smoke] hello-plugin manifest validated` line prints before the existing `[smoke] OK` |

### V2.2 acceptance (proposed)

| # | Item | How to verify |
| --- | --- | --- |
| 1 | `pnpm typecheck` green | CI |
| 2 | `pnpm test` green, including 5 manifest + 6 registry + 3 plugin-store + 1 bootstrap tests | CI |
| 3 | `pnpm lint` clean | CI |
| 4 | `pnpm build` green | CI |
| 5 | `pnpm smoke:v2` green (now also validates the hello plugin's manifest) | CI |
| 6 | `validatePluginManifest` rejects a malformed id, version, and unknown permission | unit |
| 7 | `PluginRegistry.activateAll` blocks a plugin whose required permission is missing, with `state: 'errored'` and `error.code: 'PERMISSION_DENIED'` | unit |
| 8 | `bootstrapAppShell({ plugins: [helloPlugin] })` activates the plugin and `usePluginPanels()` returns its panel | integration |
| 9 | The hello plugin's panel renders inside the `AppShell` sidebar in `pnpm dev:web` | manual |

### V2.2 non-goals

These are explicitly **not** in V2.2. They live in V2.3 or V3:

- Real plugin sandboxing (`iframe` / `Worker` / signed manifests).
  The trust model is "operator reviewed" in V2.2.
- URL-based dynamic plugin loading. The host passes a static
  `readonly PluginRegistration[]`; no remote fetch, no `eval`.
- `provide:commands` extension. Reserved in the type union but
  not surfaced in V2.2.
- Permission enforcement on existing BFF routes. Carried over
  from V2.1 — `/api/devices`, `/api/scene`, `/api/commands`,
  `/api/stream` keep their open access.
- Multi-tenant workspace model (V3, spec #7).
- Audit log events for plugin lifecycle (V3, spec #8).
- Plugin configuration / settings UI. The host decides which
  registrations to pass; that is the entire config surface.
- Plugin-side data fetching through `PluginContext`. The
  context is intentionally narrow (`grantedPermissions`,
  `subscribe`); a plugin that wants the `ApiClient` imports
  it directly.

## Cross-references

- V1 dev spec §8 (V2 Roadmap):
  `/Users/zengxiangrong/Desktop/digital-twin-platform-codex-dev-doc.md`
- ADR 0003 (BFF layer): `docs/adr/0003-bff-layer.md`
- ADR 0006 (V1 closure): `docs/adr/0006-v1-closure.md`
- ADR 0007 (V2 roadmap): `docs/adr/0007-v2-roadmap.md`
- ADR 0008 (V2.0 closure): `docs/adr/0008-v2-closure.md`
- ADR 0009 (V2.1 closure): `docs/adr/0009-v2.1-closure.md`
- ADR 0010 (V2.2 closure): `docs/adr/0010-v2.2-closure.md`
- V2.1 plan: `docs/plans/v2.1-implementation-plan.md`
- V2.2 plan: `docs/plans/v2.2-implementation-plan.md`
- Workspace rules: `docs/architecture/workspace.md`
