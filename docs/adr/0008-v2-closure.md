# ADR 0008 - V2.0 Closure

## Status

Accepted (V2.0). Records the moment V2.0 (realtime + observability)
is shipped, so V2.1 (auth contracts) has a single auditable artifact
to point to when asking "what was V2.0?".

## Context

ADR 0007 defined the V2 roadmap: 5 tracks (realtime, plugin
runtime, observability, auth, production deploy) split across 4
releases (V2.0 - V2.3). `docs/plans/v2-overview.md` picked the
first cut: V2.0 = Tracks A (realtime) + C (observability), the
smallest delta from V1 that makes the system *deployable* in the
loose sense (live data + structured logs).

`docs/plans/v2.0-implementation-plan.md` then decomposed V2.0
into 7 bite-sized tasks with exact files, exact code, exact tests,
and exact verification commands.

This ADR records that those 7 tasks shipped and that the 7
acceptance items are verified.

## Decision

V2.0 is **shipped** as `digital-twin-platform@2.0.0`. All 7
acceptance items below are verified on the host and on CI as of
the release commit (`024abb9`).

### Acceptance matrix (7 items, per `v2.0-implementation-plan.md`)

| # | Item | Status | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm typecheck` green | verified | CI run [28770808124](https://github.com/zervero/digital-twin-platform/actions/runs/28770808124) (Lint / Typecheck / Test / Build) passes in 57s; 25/25 packages typecheck clean |
| 2 | `pnpm test` green, including realtime WS unit tests | verified | Same CI run: 25/25 packages, ~39 tests including the 4-test `WebSocketRealtimeStream` suite in `@dt/realtime` and the 3-test `useDeviceStream` suite in `@dt/app-shell` |
| 3 | `pnpm lint` clean | verified | Same CI run: `eslint .` exits 0 |
| 4 | `pnpm build` green (includes BFF using the structured logger) | verified | Same CI run: 15/15 packages build; the BFF build now exercises the `@dt/observability` path it consumes at runtime |
| 5 | `pnpm smoke:v2` green | verified | New `scripts/smoke-v2.sh` exercises `/health`, `/api/stream` (ping/pong + `device:list-updated`), and the request-id → log-line assertion; CI runs the same script after `pnpm build` |
| 6 | `pnpm dev:all` brings up BFF, Vite, and WS on `/api/stream` | verified | Local: BFF on :3001 with structured logs (now `[info] listening {"port":3001}` instead of `console.log`), Vite on :5173 via desktop's `beforeDevCommand`, Tauri shell up via cargo |
| 7 | All V1 acceptance items still hold | verified | `pnpm build` and `pnpm smoke:v2` both green; the V1 web app and V2 realtime layers coexist because the V1 routes (`/api/devices`, `/api/scene`) are unchanged |

### Implementation task matrix (7 tasks)

| # | Task | Status | Commit(s) |
| --- | --- | --- | --- |
| 1 | Extend `@dt/contracts` with timestamp envelope + ping/pong | done | `bc8be50 feat(contracts): timestamp envelope and ping/pong on DigitalTwinEvent` |
| 2 | Structured JSON logger with pretty dev mode in `@dt/observability` | done (+ `dfce0b0` vitest config + lockfile) | `f85103b feat(observability): structured JSON logger with pretty mode for dev` |
| 3 | `WebSocketRealtimeStream` with exponential reconnect backoff | done (+ `b1417a2` DOM-lib fix, `684ccf5` lint fix) | `b7d1dae feat(realtime): websocket stream with exponential reconnect backoff` |
| 4 | `/api/stream` WebSocket endpoint + `DevMockSource` in `@dt/bff` | done | `c753f46 feat(bff): add /api/stream websocket endpoint and dev mock source` |
| 5 | BFF request-id middleware + structured logger integration | done | `35ebacd feat(bff): request-id middleware and structured http logger` |
| 6 | `useDeviceStream` composable wiring WS to the device store | done | `e00bf0f feat(app-shell): useDeviceStream composable wires websocket to store` |
| 7 | `scripts/smoke-v2.sh` end-to-end smoke + CI step | done (+ `4fba4fb` port-collision / mode-robustness hardening) | `aa83c67 test: add V2 smoke script that exercises websocket and request-id` |

## What V2.0 actually contains

- **Contracts** (`@dt/contracts`): every `DigitalTwinEvent` variant
  carries a top-level `timestamp: string` (ISO 8601). Two new
  keepalive variants: `ping` and `pong`. `withTimestamp()` helper
  exported alongside the type union.

- **Realtime** (`@dt/realtime`): two stream implementations on a
  single `RealtimeStream` interface:
    - `InMemoryRealtimeStream` for tests and dev-only flows
    - `WebSocketRealtimeStream` with exponential reconnect
      (`100ms * 2^n` capped at `30s`, `10` attempts by default,
      all overridable via `ReconnectOptions`)
  The package no longer depends on DOM `lib`, so Node-only
  consumers (the BFF) typecheck cleanly.

- **BFF** (`@dt/bff`):
    - New `/api/stream` WebSocket endpoint via
      `@hono/node-server@^2`'s `upgradeWebSocket`, with a
      `ws.WebSocketServer({ noServer: true })` glued to the same
      HTTP server.
    - `RealtimeBroadcaster` owns the in-process `RealtimeStream`
      and exposes `publish` / `subscribeClient` so future
      transports (SSE, MQTT) plug in without rewriting the route.
    - `DevMockSource` mutates `DEMO_DEVICES` every 3s and emits
      `device:list-updated` events; gated on `NODE_ENV !==
      production`.
    - `requestId` middleware: honors incoming `X-Request-Id` or
      generates a UUID; stamps `c.var.requestId`; echoes the header
      on the response.
    - `httpLogger` middleware: emits one structured log line per
      response with `{ method, path, status, durationMs }` plus
      the request id; 5xx → `error`, 4xx → `warn`, else → `info`.
    - `console.log` / `console.error` replaced with the
      `Logger` everywhere they were used for runtime output.

- **App shell** (`@dt/app-shell`):
    - `useDeviceStream({ url, reconnect? })` composable: opens a
      `createWebSocketStream`, subscribes, dispatches
      `device:list-updated` → `store.setDevices` and
      `device:updated` → `store.upsertDevice` on the Pinia device
      store; flips status `connecting → open → closed`; tears
      down on `onScopeDispose`.
    - `device-store`: gains `setDevices` and `upsertDevice`;
      existing `load` and `selectDevice` behavior unchanged.
    - vitest config (`happy-dom` env, `@vitejs/plugin-vue`),
      `vitest run` replaces the V1 echo placeholder as the
      `test` script.

- **Smoke** (`scripts/smoke-v2.sh`): one binary signal that the
  realtime path is healthy. Asserts `/health`, `X-Request-Id`
  echo, WS hello `ping`, `pong` round-trip, `device:list-updated`
  delivery, and a log-line correlation. Hardened against port
  collisions and `NODE_ENV` overrides (forces `development`).

- **CI** (`.github/workflows/ci.yml`): new `Run V2 smoke` step
  after `Build`, gated by `PORT: 3001`. The full pipeline is
  `lint → typecheck → test → build → smoke:v2`.

## What V2.0 explicitly does not contain

- Authentication / tenancy (Track D, V2.1).
- Plugin loading and the plugin marketplace contract (Track B, V2.2).
- Production Docker / k8s deployment (Track E, V2.3).
- Windows CI matrix and Windows desktop smoke (deferred to V2.3).
- OpenTelemetry / distributed tracing; V2.0 only does request id.
- AI command planning and `@dt/ai-agent` runtime (V3).

## Known limitations at V2.0 closure

- **No two-browser realtime UI test.** Item 6 in
  `docs/plans/v2-overview.md` ("selecting a device reflects on a
  second browser within 2s") was not exercised end-to-end. The
  WS plumbing (T4), the request-id propagation (T5), and the
  composable wiring (T6) are all covered individually, but a
  full multi-client UI smoke is not yet scripted. Acceptable for
  V2.0 because the contract is small and the components are
  unit-tested; a follow-up smoke belongs to V2.1 or later.

- **OPTIONS preflight on BFF routes returns 404.** Desktop's
  webview issues CORS preflight (OPTIONS) calls to `/api/devices`
  and `/api/scene`, which are not declared `OPTIONS`-able. The
  actual GETs still succeed and the UI works, but the preflight
  noise shows up in the logs. Tracked as a V2.1 follow-up.

- **Smoke assumes `NODE_ENV=development`.** Hardcoded so the
  `DevMockSource` runs. Production behavior is exercised by
  `pnpm build`, not the smoke.

## Consequences

- V1's "interface only" boundary packages (`@dt/realtime`,
  `@dt/observability`, `@dt/plugin-runtime`, `@dt/ai-agent`) now
  have working implementations behind the same interfaces, with
  tests. Adopting V2 in a consumer means bumping
  `digital-twin-platform` from `1.x` to `2.0.0`.
- `DigitalTwinEvent` consumers must handle the new top-level
  `timestamp` field on every variant. In strict TS this is a
  breaking change (excess-property checks); runtime-only
  consumers that did `event.payload.x` keep working.
- `@hono/node-server` is now pinned at `^2.0.0`; any downstream
  consumer that pinned v1 needs to update. (The v1 → v2
  `upgradeWebSocket` signatures are incompatible.)
- The release-please pipeline now produces a v2.x stream that
  will increment to v2.1.0 the next time a `feat:` lands on
  `main`.

## Revisit when

- V2.1 begins. At that point, this ADR is no longer the
  "current" boundary; the V2.1 plan becomes the source of truth,
  and this one moves to "history" alongside ADR 0006.
- The verification table becomes inaccurate (e.g. a follow-up
  change regresses one of the 7 items). Promote items to
  `verified` and reference this ADR in the commit.

## Cross-references

- V2 overview: `docs/plans/v2-overview.md`
- V2.0 plan: `docs/plans/v2.0-implementation-plan.md`
- V1 closure: `docs/adr/0006-v1-closure.md`
- V2 roadmap ADR: `docs/adr/0007-v2-roadmap.md`
- Workspace rules: `docs/architecture/workspace.md`
- Release playbook: `docs/development/release-playbook.md`
- Process: `AGENTS.md` §1 (documentation discipline) and §5
  (pre-flight checklist for new GitHub Actions)

## Update history

- 2026-07-06: Initial. V2.0 closed. Release `digital-twin-platform@2.0.0`
  cut via release-please, tag + GitHub release published. PR #6
  merged as `024abb9 chore(main): release digital-twin-platform 2.0.0 (#6)`.
