# ADR 0003 - BFF Layer

## Status

Accepted (V1).

## Context

The Web and Desktop apps both need a server. The server's job in V1 is to
serve a mock device list and a mock scene, and to accept commands. In V2
it will aggregate data from multiple upstream services, push realtime
events, and enforce auth and tenancy. The apps must not couple to
upstream service shapes.

## Decision

Introduce a Backend-for-Frontend service in `apps/bff`. The BFF:

- Exposes `/health`, `/api/devices`, `/api/scene`, `/api/commands`.
- Owns response shapes via `@dt/contracts`.
- Hides upstream services (none in V1) behind its own surface.
- Is the only place that knows about real authentication, tenants, and
  upstream systems in V3.

The web app talks to the BFF exclusively through `@dt/api-client`.

## Consequences

- The apps are isolated from upstream churn. The BFF absorbs version
  bumps and schema changes.
- We can scale the BFF independently from the apps.
- Realtime, caching, and auth live in one place in V2, not scattered
  across packages.
- We pay the cost of operating a second runtime. V1 keeps it tiny: Hono
  on Node, no database, no auth.
