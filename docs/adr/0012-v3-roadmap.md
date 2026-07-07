# ADR 0012 - V3 Roadmap

## Status

Accepted. V3.0 (Track F) and V3.1 (Track G) shipped -
see ADR 0013 and ADR 0014 for the per-track closure
records.

## Context

V1 closed cleanly (ADR 0006). V2 added the 5 "enterprise
base" tracks across V2.0 (realtime + observability), V2.1
(auth contracts), V2.2 (plugin runtime), and V2.3 (production
deployment) -- see ADR 0007, 0008, 0009, 0010, 0011.

V2.3 stopped short at compose + env-validated mock auth. The
items V2 deferred because they depended on real auth, a real
production platform, or both now belong to V3.

This ADR translates the loose V3 wishlist into a tractable
scope: 5 tracks, one per V3.x release, with an explicit
ordering rationale.

## Decision

### The 5 V3 tracks

The V3 items cluster into 5 tracks. Full details, dependency
graph, and per-track acceptance sketch in
[`docs/plans/v3-overview.md`](../plans/v3-overview.md).

| Track | Package(s) | What it ships |
| --- | --- | --- |
| F. Real auth (OIDC) | `@dt/contracts`, `@dt/bff`, `@dt/app-shell`, new `@dt/auth-oidc` | `AUTH_PROVIDER=oidc` runtime; JWT verification; permission union becomes the JWT claim; `requiresPermission` middleware wired into the existing surfaces; dev-mode `mock` stays as a toggle |
| G. Production platform | `apps/bff`, `apps/web`, `.github/workflows`, new `tooling/k8s/` | Helm chart; K8s manifests; ingress + cert-manager + Let's Encrypt; OTel metrics + traces + logs; health/readiness + graceful drain re-uses V2.3's BFF contract |
| H. Tauri release pipeline | `apps/desktop`, `.github/workflows` | Signed `.dmg` / `.msi` / `.AppImage`; auto-update channel; release artifacts in GitHub Releases; signing keys managed in GitHub Actions secrets |
| I. Multi-tenant data model | `@dt/contracts`, `@dt/bff`, new `@dt/tenant` | `tenant_id` in the API contracts; BFF route scoping; per-tenant config; storage-layer row-level security; cross-tenant request returns 403 |
| J. Plugin marketplace + persistence | `@dt/plugin-runtime`, `@dt/app-shell`, new `@dt/plugin-registry` | Persisted plugin storage; signed plugin artifacts; marketplace install/upgrade API; V2.2's contract becomes the activation envelope |

### Track ordering rationale

```
V3.0 (F) ──► V3.1 (G) ──► V3.2 (H) ──► V3.3 (I) ──► V3.4 (J)
   auth        platform      desktop      data        marketplace
```

- **F first** because I (multi-tenancy) needs tenant identity,
  which needs a real IdP. F is the smallest delta from V2.3
  that unlocks the rest of V3.
- **G second** because K8s / TLS / OTel generalize the V2.3
  compose story. The shape of F's production deployment is
  much clearer once G's ingress + TLS contract is in place,
  so H (which reuses G's signing-key workflow) and I (which
  reuses G's tenant-aware routing) both depend on G.
- **H third** because the Tauri release pipeline is largely
  independent of F/G/I/J at the code level, but ships after G
  so the desktop release CI reuses G's signing-key
  infrastructure and TLS-aware download mirror.
- **I fourth** because the multi-tenant data model depends on
  F (auth for tenant identity) and G (production platform for
  tenant-aware ingress routing). RLS at the storage layer is
  the headline; the API contract extension is mechanical
  once F lands.
- **J last** because the plugin marketplace has the highest
  fanout (persistence, signing, install/upgrade, marketplace
  API) and assumes the platform primitives F/G/I produced.

### Per-release shape

Each V3.x release cuts a single release-please version bump,
mirroring V1 / V2 cadence. V3 starts at `3.0.0` (fresh
semver major) -- the V2 spec's "enterprise base" framing
warrants a fresh start, and V3 is qualitatively beyond V2's
"compose-only prototype" production story.

## Consequences

- V3.0 work is bounded: a single track (auth) with a small
  surface area, ready to plan as `v3.0-implementation-plan.md`
  once this ADR is Accepted.
- G, H, I, J each get their own ADR at the start of their
  respective V3.x release cycles. This ADR does not
  pre-decide their internal shape.
- The V2.3 `AUTH_PROVIDER=mock|oidc` env gate is the
  explicit insertion point for Track F -- flipping it from
  `mock` to `oidc` is the user-visible behavior change.
- V1's @dt/contracts `Permission` union becomes the
  authorization source of truth in V3, but the union shape
  itself stays stable so older auth contracts from V2.1 stay
  valid.
- The dev BFF's `mock` provider is preserved (behind an
  explicit env flag) so contributors running `pnpm dev`
  without an IdP don't have to do extra setup.

## Revisit when

- V3.0 ships and the team wants to start V3.1.
- A new requirement appears that does not fit any of the 5
  tracks. In that case, this ADR gets a follow-up ADR that
  adds the new track and re-orders if needed.

## Cross-references

- V3 plan: [`docs/plans/v3-overview.md`](../plans/v3-overview.md)
- V2 closure: [`docs/adr/0011-v2.3-closure.md`](./0011-v2.3-closure.md)
- V3.0 closure: [`docs/adr/0013-v3.0-closure.md`](./0013-v3.0-closure.md)
- V3.1 closure: [`docs/adr/0014-v3.1-closure.md`](./0014-v3.1-closure.md)
- V2 roadmap ADR: [`docs/adr/0007-v2-roadmap.md`](./0007-v2-roadmap.md)
- V1 closure: [`docs/adr/0006-v1-closure.md`](./0006-v1-closure.md)
- V1 dev spec §8: `/Users/zengxiangrong/Desktop/digital-twin-platform-codex-dev-doc.md`

## Update history

- 2026-07-07: V3.0 (Track F) shipped. Real auth (OIDC)
  became the default `AUTH_PROVIDER`, JWT verification and
  `requiresPermission` middleware wired across BFF + app-shell;
  dev `mock` provider preserved behind env flag. See ADR 0013.
- 2026-07-07: V3.1 (Track G) shipped. Effective version
  `4.1.0` -- the `v3.1.0` / `v4.0.0` tags in the GitHub
  Releases list are release-please artifacts and do not
  reflect distinct work. Records V3.1 closure: 8 tasks, 10
  acceptance items, 3 deliberate deviations, 1 release-please
  artifact. Status flips to Accepted. See ADR 0014.
- 2026-07-06: Initial. V3 roadmap proposed. 5 tracks (F-J)
  in the order auth -> platform -> desktop -> data ->
  marketplace. First concrete V3 work is Track F
  (AUTH_PROVIDER=oidc implementation). Status flips to
  Accepted when V3.0 ships.
