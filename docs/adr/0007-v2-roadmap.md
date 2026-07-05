# ADR 0007 - V2 Roadmap

## Status

Proposed. The V2 scope and ordering proposed here depends on the
plan in `docs/plans/v2-overview.md`; both move from Proposed to
Accepted together when the user signs off.

## Context

V1 closed cleanly (ADR 0006). V1 explicitly deferred the
"enterprise base" work to V2 per the V1 dev spec §8 (V2 Roadmap).
The V2 boundary packages (`@dt/realtime`, `@dt/plugin-runtime`,
`@dt/observability`, `@dt/ai-agent`) shipped in V1 as interfaces
and mock implementations, with the real behavior to land in V2
and V3.

The V2 roadmap from the spec is a 10-item flat list, which is
unwieldy to plan or release against. We need to cluster the items
into tracks, choose an ordering, and pick what goes in V2.0.

## Decision

### The 5 V2 tracks

The 10 spec items cluster into 5 tracks. Full details in
[`docs/plans/v2-overview.md`](../plans/v2-overview.md).

| Track | Package(s) | Spec items |
| --- | --- | --- |
| A. Realtime data flow | `@dt/contracts`, `@dt/realtime`, `@dt/bff`, `@dt/app-shell` | #1, #2, #3, #4 |
| B. Plugin runtime | `@dt/plugin-runtime`, `@dt/app-shell` | #5, #6 |
| C. Observability | `@dt/observability`, `@dt/bff` | #7 |
| D. Auth contracts | `@dt/contracts`, `@dt/bff`, `@dt/app-shell` | #8 |
| E. Production deployment | `apps/web`, `apps/bff`, `.github/workflows` | #9 |

Spec item #10 (CI checks) is already in place since V1.0.0.

### V2.0 ships Tracks A + C only

V2.0 = realtime (A) + observability (C). These are the smallest
delta from V1 that makes the system *deployable* in the loose
sense. Tracks B, D, E are deferred to V2.1, V2.2, V2.3
respectively.

### Track ordering rationale

- Track A unlocks live data, which is the headline V2 feature.
- Track C is needed before any non-laptop deployment, so it has
  to ship with A or shortly after.
- Track D (auth contracts) is the prereq for V3 multi-tenancy;
  shipping it in V2.1 keeps later tracks from baking in
  assumptions that auth has to undo.
- Track B (plugin runtime) needs A and D stable underneath it.
- Track E (production deployment) is the last step before V3 and
  is intentionally last so we don't have to redesign Dockerfiles
  every time the runtime shape changes.

### Per-release shape

Each V2.x release cuts a single release-please version bump,
mirroring the V1 release cadence. V2.0 starts at version 2.0.0
(not 1.1.0) — the V1 spec's "V2 boundary" framing warrants a
fresh semver major, and 2.0.0 is the natural way to mark the
"starter → enterprise base" transition.

## Consequences

- V2.0 work is bounded: 7 implementation tasks + 7 acceptance
  items, focused on realtime and observability.
- Tracks B, D, E have their own ADRs at the start of their
  respective V2.x release cycles. This ADR does not pre-decide
  their internal shape.
- The "V2 boundary" packages in V1 stay backwards compatible. New
  behavior lands in the same files, behind a feature flag if
  needed, until V2.0 ships.
- A test in `@dt/realtime` continues to use
  `InMemoryRealtimeStream` so that downstream tests do not need a
  real WebSocket server.

## Revisit when

- V2.0 ships and the team wants to start V2.1.
- A new requirement appears that does not fit any of the 5 tracks.
  In that case, this ADR gets a follow-up ADR that adds the new
  track and re-orders if needed.

## Cross-references

- Plan: [`docs/plans/v2-overview.md`](../plans/v2-overview.md)
- V1 dev spec §8: `/Users/zengxiangrong/Desktop/digital-twin-platform-codex-dev-doc.md`
- ADR 0003 (BFF layer): `0003-bff-layer.md`
- ADR 0006 (V1 closure): `0006-v1-closure.md`
