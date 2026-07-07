# Multi-tenant data model (V3.3)

> Scope: how the V3.3 platform keeps one tenant's data
> from leaking into another. Covers the data model, the
> JWT claim shape the BFF verifies, the dev IdP flow,
> and the troubleshooting tree for the four error
> codes a tenant boundary can surface.
>
> Audience: anyone touching `requiresTenantScope`, the
> `tenantId` field on a DTO, the `@dt/tenant` package,
> or the V3.3 `smoke:tenant` script. For the rationale
> (why this design, what the alternatives were), see
> [`docs/plans/v3.3-implementation-plan.md`](../plans/v3.3-implementation-plan.md)
> and the V3 roadmap ADR (`docs/adr/0012-v3-roadmap.md`).

## The model

The V3.3 model is **shared infrastructure, tenant-scoped
data**:

- A single BFF process serves every tenant; nothing
  about the runtime is per-tenant.
- Every scoped DTO carries a required `tenantId: string`
  (see `@dt/contracts` `Device`, `SceneNode`,
  `SceneSnapshot`, `DigitalTwinCommand`, and every
  `DigitalTwinEvent` variant).
- The BFF enforces isolation at three boundaries:

  1. **HTTP routes** — `/api/devices`, `/api/scene`,
     and `/api/commands` are gated on the
     `requiresTenantScope` middleware (T4), which reads
     the tenant id from the session, resolves it
     against the dev tenant registry (`resolveTenant`),
     and sets `c.var.tenant` for the handler. A handler
     with a missing or unknown tenant id returns 401
     `AUTH_NO_TENANT`; a cross-tenant command body
     returns 403 `TENANT_FORBIDDEN`.
  2. **Realtime** — `RealtimeBroadcaster.subscribeClient`
     applies a 1-line predicate on `event.tenantId`
     (T7), so a WebSocket subscribed for tenant A
     cannot receive tenant B's events. The dev mock
     source publishes one event per device per tick,
     each stamped with the device's own `tenantId`.
  3. **The data layer itself** — the V3.3 mock
     registry (`apps/bff/src/mock/demo-data.ts`) is
     the single source of truth for which devices
     and which scene belong to which tenant. In
     production this becomes a database lookup
     behind `resolveTenant`; the route handlers do
     not change.

The dev tenant registry has three entries for V3.3
(`acme-corp`, `globex-ind`, `initech-llc`); the
`MockAuthStore` and `dev-oidc-idp.mjs` mint tokens
that route through the same `requiresTenantScope`
gate as a production session.

## The JWT claim shape

The BFF reads the tenant id from the OIDC JWT's
**namespaced** tenant claim. The default claim name is
exported from `@dt/tenant` as `TENANT_ID_CLAIM`:

```
https://api.digital-twin-platform.local/tenant_id
```

The namespacing follows the OIDC convention
([Auth0](https://auth0.com/docs/get-started/authentication/access-tokens/access-token-claims#payload-claims),
Keycloak, Okta all support it) so a token issued by
an external IdP can carry a tenant claim without
colliding with the registered-claim namespace.

Override the claim name at deploy time by setting
`OIDC_TENANT_CLAIM` (consumed by `@dt/auth-oidc`'s
`OidcVerifyConfig.tenantClaimName`). The default
works for the dev IdP and any IdP that has been
configured to issue the namespaced claim.

A JWT with **no** tenant claim surfaces as
`VerifiedSession.tenantId: undefined`, which the
middleware translates to 401 `AUTH_NO_TENANT`.

## The dev IdP flow

Two roles for the dev IdP:

1. **Server mode** (default) — boots an HTTP listener
   on `$DEV_OIDC_PORT` (default 9999) and serves the
   full OIDC Authorization Code + PKCE flow used by
   `pnpm dev` when `AUTH_PROVIDER=oidc` and by
   `pnpm smoke:oidc`.
2. **Mint mode** — `node scripts/dev-oidc-idp.mjs
   mint` signs a JWT with the same in-memory RSA
   keypair and prints it to stdout, then exits. Used
   by `pnpm smoke:tenant` to mint per-tenant JWTs
   without driving the full OAuth dance.

The two modes share the keypair via a JSON file in
`os.tmpdir()` (`DEV_OIDC_KEY_FILE` overrides the
default path), so a token minted in mint mode is
verifiable against the JWKS the server mode exposes.
Without the shared key, every mint invocation would
generate a fresh keypair the BFF could not verify.

### Mint flags

```bash
# Default: signs as admin@example.com with the
# acme-corp tenant claim.
node scripts/dev-oidc-idp.mjs mint

# Specific tenant.
node scripts/dev-oidc-idp.mjs mint --tenant globex-ind

# Specific user (overrides the default admin). Useful
# for permission-coverage smokes (viewer / operator).
node scripts/dev-oidc-idp.mjs mint --as viewer@example.com

# Omit the tenant claim entirely -- exercises the
# `AUTH_NO_TENANT` path.
node scripts/dev-oidc-idp.mjs mint --no-tenant
```

`mint` defaults to admin permissions (all six,
including `command:send`) so a smoke can exercise
the write paths. `--as <email>` lets tests override
to any of the three built-in roles for coverage.

### End-to-end smoke

`pnpm smoke:tenant` exercises the full multi-tenant
isolation contract:

1. Boots the dev IdP (server mode) and the BFF
   (OIDC mode pointing at the IdP).
2. Mints one JWT per registered tenant
   (`acme-corp`, `globex-ind`, `initech-llc`) plus
   one with `--no-tenant`.
3. Asserts each tenant sees only its own devices
   and its own scene id.
4. Asserts a command whose body carries a
   mismatched `tenantId` returns 403
   `TENANT_FORBIDDEN`.
5. Asserts the no-tenant token returns 401
   `AUTH_NO_TENANT` on every tenant-scoped route.

The script lives in `scripts/smoke-tenant.sh`; the
GitHub Actions job lives at
`.github/workflows/ci.yml#smoke_tenant` and runs on
every PR and every push to `main`.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| 401 `AUTH_NO_TENANT` on a scoped route | JWT has no tenant claim, or the claim is the wrong namespace | Confirm the IdP is configured to emit `https://api.digital-twin-platform.local/tenant_id` (or your `OIDC_TENANT_CLAIM` value). Decode the token at [jwt.io](https://jwt.io) and check the claim. |
| 401 `AUTH_NO_TENANT` with the claim present | Claim is for a tenant the registry does not know | Add the tenant to `DEMO_TENANTS` (dev) or wire `resolveTenant` to your tenant database (prod). |
| 403 `TENANT_FORBIDDEN` on `POST /api/commands` | Command body's `tenantId` does not match the session's resolved tenant | The client should not be constructing cross-tenant commands in the first place; the BFF rejects them before dispatch. Inspect the SPA / agent code that builds the command body. |
| 403 `AUTH_FORBIDDEN` on a scoped route | Caller's role does not grant the required permission | This is the V3.0 behavior, unchanged. Adjust the IdP's `permissions` claim or the user's role assignment. |
| A realtime event the UI expects is not arriving on the WebSocket | The event was published for a different tenant; the broadcaster filters at broadcast | Inspect the source -- every `DigitalTwinEvent` must carry the device's own `tenantId`. Use `dev-source.ts`'s `runTick()` and a `MultiTenantFakeAuthStore` test to confirm. |
| `smoke:tenant` fails with `mint failed` | `jose` couldn't read / write the keypair file in `os.tmpdir()` | Confirm `os.tmpdir()` is writable, or override with `DEV_OIDC_KEY_FILE=/some/path node scripts/dev-oidc-idp.mjs ...`. |

## What V3.3 does not do

- **No per-tenant database**. The dev registry is
  in-process; production still needs a real
  database with row-level security (V3.3.x
  follow-up; the single change point is
  `apps/bff/src/tenants/resolve.ts`).
- **No cross-tenant observability isolation**.
  Logs and OTel spans are still process-global;
  V3.3 only enforces isolation at the HTTP and
  realtime boundaries.
- **No per-tenant rate limiting**. The free vs pro
  plan distinction in `DEMO_TENANTS` is metadata
  only; a future feature will gate it on `plan`.
