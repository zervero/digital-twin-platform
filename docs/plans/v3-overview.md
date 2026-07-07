# V3 Overview

> Active. Records the scope and ordering for V3 work, with
> per-track ship status. V3 is **proposed**: tracks are scoped
> and ordered here; the first V3 release is not yet cut.
>
> V2 closed as `digital-twin-platform@2.3.0` (see ADR 0011); the
> V2 spec items all landed across V2.0 -> V2.3. The remaining
> "enterprise" items live in V3 and beyond.

## Context

V1 shipped a runnable starter. V2 added realtime, observability,
auth contracts, plugin runtime, and a production-shape compose
stack (Tracks A-E, ADR 0007). Each V2.x release cut a single
release-please version bump, so the V2 cadence mirrored V1.

V3 picks up the items V2 deferred because they depended on a
real auth provider, a real production platform, or both:

- Real auth (OIDC) and end-to-end permission enforcement.
- Kubernetes + TLS + metrics/traces (the "production platform"
  the V2.3 compose stack was the prototype for).
- Tauri release pipeline: signed installers, auto-update,
  macOS/Windows/Linux builds from CI.
- Multi-tenant data model: workspace isolation in the BFF,
  scoped queries, row-level security at the storage layer.
- Plugin marketplace: signed plugin artifacts, persistence,
  remote install/upgrade.

## The 5 V3 tracks

The V3 items cluster naturally into 5 tracks. Each track is
self-contained: it has a clear package owner, a single
acceptance shape, and a natural order relative to the others.

| Track | Package(s) | Why it matters |
| --- | --- | --- |
| **F. Real auth (OIDC)** | `@dt/contracts`, `@dt/bff`, `@dt/app-shell`, new `@dt/auth-oidc` | V2.3 baked the `AUTH_PROVIDER=oidc` env gate; V3 fills the implementation in. OIDC unlocks V3 multi-tenancy. |
| **G. Production platform** | `apps/bff`, `apps/web`, `.github/workflows`, new `tooling/k8s/` | V2.3 stopped at compose. K8s manifests + Helm chart, TLS via cert-manager, OTel metrics + traces + logs. |
| **H. Tauri release pipeline** | `apps/desktop`, `.github/workflows` | The Tauri app runs locally today; V3 ships signed `.dmg` / `.msi` / `.AppImage` and an auto-update channel. |
| **I. Multi-tenant data model** | `@dt/contracts`, `@dt/bff`, new `@dt/tenant` | Workspace isolation in API contracts, BFF route scoping, RLS at the storage layer. Depends on F (auth) for tenant identity. |
| **J. Plugin marketplace + persistence** | `@dt/plugin-runtime`, `@dt/app-shell`, new `@dt/plugin-registry` | V2.2 ships the contract (manifest, registry, extension types). V3 adds persistence, signed plugin artifacts, remote install/upgrade. |

### Per-track status (live)

| Track | Release | Status | Closure |
| --- | --- | --- | --- |
| F. Real auth (OIDC) | V3.0 | **Shipped** | [ADR 0013](../adr/0013-v3.0-closure.md) |
| G. Production platform | V3.1 | Proposed | — |
| H. Tauri release pipeline | V3.2 | Proposed | — |
| I. Multi-tenant data model | V3.3 | Proposed | — |
| J. Plugin marketplace + persistence | V3.4 | Proposed | — |

CI checks (lint / typecheck / test / build / smoke) and the
cross-cutting observability surface (structured logs, request
id) are already in place across V1 + V2 and continue as
floor-level expectations.

## Track ordering

```
F → G → H → I → J
```

- **F (auth) first**: I (multi-tenancy) needs tenant identity,
  which needs a real IdP. F is the smallest delta from V2.3 that
  unlocks the rest of V3.
- **G (production platform) second**: K8s / TLS / OTel
  generalize the V2.3 compose story. The shape of F's
  deployment is much clearer once G's ingress + TLS contract
  is in place.
- **H (Tauri releases) third**: independent of F/G/I/J at the
  code level, but ships after G so the desktop app's release
  CI reuses G's signing-key workflow.
- **I (multi-tenant) fourth**: depends on F (auth) for tenant
  identity and on G (production platform) for tenant-aware
  routing. RLS at the storage layer is the headline; the API
  contract extension is mechanical once F lands.
- **J (plugin marketplace) last**: highest fanout (persistence,
  signing, install/upgrade, marketplace API). Lots of design
  surface; park it until F/G/I have produced the platform
  primitives J assumes.

This order also keeps each V3.x release shippable as a single
release-please version bump, so the V3 cadence mirrors V2.

## Per-release shape (placeholder)

```
V3.0 (F) ──► V3.1 (G) ──► V3.2 (H) ──► V3.3 (I) ──► V3.4 (J)
   auth        platform      desktop      data        marketplace
```

Each V3.x release will be cut by a detailed implementation
plan (`docs/plans/v3.N-implementation-plan.md`) decomposed
into bite-sized tasks with exact files, code, tests, and
verification commands, following the V2 plan convention.

## First V3 track: F (real auth) — shipped in V3.0

Track F was the first concrete V3 work. V3.0 ships it: the
`AUTH_PROVIDER=oidc` branch is functional end-to-end, with
JWKS verification, the V2.1 permission union, the dev IdP
for CI, and a full e2e smoke (`pnpm smoke:oidc`). The
implementation plan ([`docs/plans/v3.0-implementation-plan.md`](./v3.0-implementation-plan.md))
is **Accepted**; the closure record is at
[`docs/adr/0013-v3.0-closure.md`](../adr/0013-v3.0-closure.md).

The original V3 track sketch (final shape landed in the V3.0
plan, which now supersedes this section):

- `apps/bff` boots with `AUTH_PROVIDER=oidc` and a real OIDC
  issuer URL; the env gate passes (`readAppEnv` returns OK).
- The BFF's auth middleware verifies the `Authorization:
  Bearer <jwt>` header against the issuer's JWKS; bad or
  expired tokens return 401.
- The V2.1 permission union becomes the JWT `scope` /
  `permissions` claim, validated per route via the existing
  `requiresPermission` middleware (currently a stub; V3 wires
  it into the existing surfaces).
- The `mock` provider stays in dev mode; the dev BFF uses
  either, controlled by an env flag.
- `apps/web` and `apps/desktop` both handle the OIDC
  redirect-flow login and persist the token via an OIDC-shaped
  cookie/storage.

## What's explicitly NOT in V3

- **AI agent / LLM integration** (V2 spec item left for a
  future track; `@dt/ai-agent` is a V1 interface-only package
  and stays so until the right V3.x allocates it).
- **Marketplace monetization, plugin analytics, plugin
  ratings**. J is marketplace plumbing, not the commerce
  layer.
- **Mobile clients** (iOS / Android native). The V1 dev spec
  defers these to V3+.
- **High-availability / multi-region active-active**. V3
  ships a single-region deployment story; HA is V4+.

## Open questions

These are answered at the top of each V3.N implementation plan,
not here:

1. OIDC provider: Auth0, Keycloak, Okta, or generic?
2. K8s distribution scope: vanilla k8s, GKE/EKS/AKS, k3s?
3. TLS cert management: cert-manager + Let's Encrypt, manual,
   or external (e.g. cloud load balancer terminates TLS)?
4. OTel export: OTLP, Prometheus scrape, or both?
5. Multi-tenant model: shared DB with row-level security, or
   separate DBs per tenant (database-per-tenant pattern)?
6. Plugin marketplace storage: self-hosted registry, GitHub
   Releases, or external repo (npm-style)?
7. Workspace identity source: same OIDC issuer as Track F, or
   a separate workspace-scoped service?

## Cross-references

- V3 roadmap ADR: `docs/adr/0012-v3-roadmap.md`
- V3.0 (planned): `docs/plans/v3.0-implementation-plan.md` (TBD)
- V2.3 closure: `docs/adr/0011-v2.3-closure.md`
- V2 roadmap ADR: `docs/adr/0007-v2-roadmap.md`
- V1 closure: `docs/adr/0006-v1-closure.md`
