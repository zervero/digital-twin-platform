# V2 Overview

> Active. Records the scope and ordering for V2 work, with
> per-release ship status. V2.0 is shipped; V2.1 / V2.2 / V2.3
> are planned but not yet started.
>
> For the closed-out V2.0 detail (acceptance matrix, task
> matrix, known limitations), see
> [`docs/adr/0008-v2-closure.md`](../adr/0008-v2-closure.md).

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
V2.0 ✅  ──►  V2.1  ──►  V2.2  ──►  V2.3
    A,C          D          B          E
```

- **V2.0 (Tracks A + C) ✅ shipped as v2.0.0 (2026-07-06)**: realtime + observability. Smallest delta
  from V1 that makes the system *deployable* in the loose sense
  (live data + structured logs). See [ADR 0008](../adr/0008-v2-closure.md).
- **V2.1 (Track D)**: auth contracts. Needed before V3 multi-tenancy.
  Doing it now keeps the realtime and plugin work from baking in
  assumptions that the auth model has to undo later.
- **V2.2 (Track B)**: plugin runtime. The plugin model benefits from
  stable realtime + auth + observability underneath it; building it
  first would force us to redesign.
- **V2.3 (Track E)**: production deployment. Last because everything
  else needs to be stable before we can write a Dockerfile we
  actually want to keep.

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
- Production Docker (Track E, V2.3)
- CI matrix on Windows (deferred to V2.3)
- AI / plugins / marketplace (V3)

## Release status

| Release | Status | Date | ADR |
| --- | --- | --- | --- |
| V2.0 (A+C) | ✅ shipped as `digital-twin-platform@2.0.0` | 2026-07-06 | [0008](../adr/0008-v2-closure.md) |
| V2.1 (D) | ⏳ planned — auth contracts | — | — |
| V2.2 (B) | ⏳ planned — plugin runtime | — | — |
| V2.3 (E) | ⏳ planned — production deployment | — | — |

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

## Cross-references

- V1 dev spec §8 (V2 Roadmap):
  `/Users/zengxiangrong/Desktop/digital-twin-platform-codex-dev-doc.md`
- ADR 0003 (BFF layer): `docs/adr/0003-bff-layer.md`
- ADR 0006 (V1 closure): `docs/adr/0006-v1-closure.md`
- ADR 0007 (V2 roadmap): `docs/adr/0007-v2-roadmap.md`
- ADR 0008 (V2.0 closure): `docs/adr/0008-v2-closure.md`
- Workspace rules: `docs/architecture/workspace.md`
