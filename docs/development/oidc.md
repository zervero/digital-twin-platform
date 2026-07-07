# OIDC (V3.0)

> Scope: how to run and operate the V3.0 OIDC authentication
> path. Covers the dev IdP, the production env-var contract,
> the JWT claim shape the BFF expects, and the cookie +
> transport details a deployment needs to know.
>
> Audience: anyone running `AUTH_PROVIDER=oidc` (locally,
> in CI, or in production). For the rationale (why this
> design, what the alternatives were), see
> [`docs/plans/v3.0-implementation-plan.md`](../plans/v3.0-implementation-plan.md)
> and the V3 roadmap ADR (`docs/adr/0012-v3-roadmap.md`).

## Two paths, one gate

`AUTH_PROVIDER` selects the auth backend:

| Value | Used by | Cookie shape | Session source |
| --- | --- | --- | --- |
| `mock` (V2.3 and earlier) | dev only | `Authorization: Bearer <token>` (header) | in-memory `MockAuthStore` |
| `oidc` (V3.0) | dev, CI, prod | `dt_oidc_session=<jwt>` (HttpOnly cookie) | external OIDC issuer, JWT verified via JWKS |

`AUTH_PROVIDER=oidc` is required in production. `mock` is
still valid in `NODE_ENV=development` so the simplest
`pnpm dev` loop keeps working.

The `AUTH_PROVIDER` gate that V2.3 introduced still applies:
production boot with no `AUTH_PROVIDER` (or an invalid value)
fails fast in `readAppEnv` and again in the BFF's
`docker-entrypoint.sh`.

## Quickstart (dev)

```bash
# Terminal 1: boot the dev OIDC IdP (default port 9999).
pnpm dev:oidc

# Terminal 2: boot the dev stack against the dev IdP.
AUTH_PROVIDER=oidc \
  OIDC_ISSUER_URL=http://localhost:9999 \
  OIDC_CLIENT_ID=digital-twin \
  OIDC_AUDIENCE=digital-twin-platform \
  OIDC_SCOPES="openid profile device:read scene:read" \
  pnpm dev
```

Open http://localhost:5173 and click "Sign in". The login
button redirects to the dev IdP, which lists three built-in
test users selectable from a `?as=<email>` query param:

| Email | Permissions |
| --- | --- |
| `viewer@example.com` | `device:read`, `scene:read` |
| `operator@example.com` | `device:read`, `device:write`, `scene:read`, `command:send` |
| `admin@example.com` | all six, including `scene:write` and `auth:login` |

The dev IdP issues a real RS256 JWT signed by an in-memory key
pair generated at startup. The BFF verifies it via the JWKS
served at `/.well-known/jwks.json`. The whole flow uses the
standard OIDC Authorization Code + PKCE dance — there is no
"dev shortcut" that production doesn't go through.

The dev IdP is **not** for production. It has no user
database, no rotation, no session storage. Use it for local
development and the CI smoke (see
[`scripts/smoke-oidc.sh`](../../scripts/smoke-oidc.sh)).

## End-to-end smoke

`pnpm smoke:oidc` boots the dev IdP + the BFF in OIDC mode and
exercises the full flow. The script asserts:

1. The IdP serves `/.well-known/openid-configuration` with
   `authorization_endpoint` and `token_endpoint`.
2. `GET /api/auth/oidc/start` returns 302 to the IdP with
   `state` and `code_challenge_method=S256` (PKCE).
3. The IdP `/authorize` accepts the request, redirects back
   with a `code`, and `/token` exchanges it for a real
   `id_token`.
4. `GET /api/auth/me` with the `dt_oidc_session` cookie
   echoes the verified session.
5. `GET /api/devices` with the admin id_token returns 200.
6. `GET /api/devices` anonymously returns 401.
7. `GET /api/devices` with a viewer id_token returns 200.
8. `POST /api/commands` with a viewer id_token returns 403.

If any of these fail, the script prints the BFF and IdP logs
and exits non-zero. Run it from the repo root.

## Production env vars

When `AUTH_PROVIDER=oidc`, the BFF reads these from
`@dt/config` (`OidcConfig`):

| Var | Required | Example | Notes |
| --- | --- | --- | --- |
| `OIDC_ISSUER_URL` | yes | `https://auth.example.com/` | Must match the JWT `iss` claim exactly. Trailing slash matters: `jose` compares the issuer as a string. |
| `OIDC_CLIENT_ID` | yes | `digital-twin` | Sent on `/authorize`; the IdP may use it to scope the consent screen. |
| `OIDC_AUDIENCE` | yes | `digital-twin-platform` | Must match the JWT `aud` claim. |
| `OIDC_SCOPES` | no | `openid profile device:read scene:read` | Space-separated. Defaults to `openid profile`. Permission-shaped scopes (`device:read`) are valid; they get mapped into the `Permission` union via `extractPermissions`. |
| `OIDC_JWKS_URI` | no | `https://auth.example.com/.well-known/jwks.json` | Override only when the IdP serves JWKS at a non-standard path. |
| `OIDC_COOKIE_NAME` | no | `dt_oidc_session` | Cookie name the BFF reads on `/api/auth/me`. |
| `OIDC_COOKIE_SECURE` | no | `true` | Set `true` in any HTTPS deployment. Defaults to `true` when `NODE_ENV=production`. |
| `OIDC_ALLOW_DEV_BYPASS` | no | `false` | Dev-only escape hatch. If `true`, the BFF skips JWT verification and uses a built-in mock session. Never set this in production. |

`AUTH_PROVIDER` must also be set to `oidc` (see the
[deployment doc](./deployment.md) for the gate semantics).

The values are validated at boot by `readAppEnv`. Missing or
invalid `OIDC_ISSUER_URL` / `OIDC_AUDIENCE` in production
throws `EnvValidationError`, which the BFF logs and exits 1
on.

## JWT claim shape

The BFF extracts permissions from two places, in this order:

1. `permissions` (JSON array of strings, Auth0-style)
2. `scope` (space-separated string, OIDC standard)

Both are mapped to the `Permission` union from
`@dt/contracts` (defined in V2.1). Unknown values are
silently dropped. Duplicates are deduped.

```json
{
  "iss": "https://auth.example.com/",
  "aud": "digital-twin-platform",
  "sub": "user-uuid-or-email",
  "exp": 1718000000,
  "iat": 1717996400,
  "email": "user@example.com",
  "name": "User Name",
  "scope": "openid profile device:read scene:read",
  "permissions": ["device:read", "scene:read"]
}
```

Standard claims used by the BFF:

| Claim | Used for |
| --- | --- |
| `sub` | user id (synthesized as `oidc:<sub>` in `User.id`) |
| `email` | `User.email` when present, else falls back to `sub` |
| `name` | `User.displayName` when present |
| `preferred_username` | fallback for `User.displayName` |
| `scope` | permission extraction (space-separated) |
| `permissions` | permission extraction (array) |
| `iss` | verified against `OIDC_ISSUER_URL` |
| `aud` | verified against `OIDC_AUDIENCE` |
| `exp` | JWT expiry (enforced by `jose`) |

Unknown extra claims are ignored. The IdP can include
whatever else it wants (groups, tenant id, custom roles);
they will be present in the verified payload but not
consumed by the BFF.

## Cookie and transport

The session cookie is named `dt_oidc_session` (configurable
via `OIDC_COOKIE_NAME`). Its attributes:

| Attribute | Value | Why |
| --- | --- | --- |
| `HttpOnly` | always | XSS-resistant: the SPA cannot read the JWT from JavaScript. |
| `SameSite` | `Lax` | Lets the cookie survive the OAuth callback redirect; protects against most CSRF shapes. |
| `Secure` | `OIDC_COOKIE_SECURE` (defaults to `true` in production) | Required for any HTTPS deployment. |
| `Path` | `/` | The cookie is scoped to the whole BFF. |
| `Max-Age` | matches JWT `exp - iat` | Server-driven: the cookie dies when the JWT does. |

The cookie is set by `GET /api/auth/oidc/callback` and
cleared by `POST /api/auth/logout` (the latter writes a
`Max-Age=0` Set-Cookie). The browser is **not** redirected
to the IdP on logout in V3.0 — the IdP session expires
naturally. RP-initiated logout (the
`end_session_endpoint` round-trip) is a V3.x follow-up.

The JWT is never stored in `localStorage` or `sessionStorage`.
XSS-resilience is a deliberate V3.0 design choice.

## Permission enforcement

The V2.1 `requiresPermission` middleware now actually fires:

- No session cookie -> **401** (the SPA redirects to login).
- Session cookie but missing the required permission ->
  **403** (the SPA shows "you can't do that").
- Session cookie with the permission -> request continues.

The middleware reads the JWT's `permissions` claim directly,
so OIDC users never round-trip through the role-based
fallback. The `mock` provider still uses the role-based
permission derivation (`permissionsFor(roles)`); the two
paths are gated by `AUTH_PROVIDER` and never mix.

## Architecture

```
            ┌─────────────────┐
            │  IdP (real or   │
            │  dev-oidc-idp)  │
            └─────────────────┘
                   ▲    ▲
   /authorize      │    │ /token (PKCE)
                   │    │
            ┌──────┴────┴──────┐
            │   BFF (Hono)     │
            │                  │
/api/auth/  │  /oidc/start     │   sets dt_oidc_session
            │  /oidc/callback  │
            │                  │
/api/auth/  │  /me  /logout    │   reads dt_oidc_session,
            │                  │   verifies JWT via JWKS
            │                  │
/api/       │  /devices        │   requiresPermission(...)
            │  /scene          │
            │  /commands       │
            └──────────────────┘
                   ▲
                   │  XHR + cookies
            ┌──────┴──────┐
            │  apps/web    │
            │  (Vue SPA)   │
            └──────────────┘
```

`@dt/auth-oidc` is the only place that knows how to verify
JWTs. `apps/bff` wires it into the auth provider, the
`@dt/app-shell` composable triggers the redirect, and
`@dt/contracts` carries the `Permission` union.

## Troubleshooting

### `ERR_JWT_EXPIRED` on every request

The IdP clock and the BFF clock drifted, or the JWT TTL is
shorter than expected. Check that the IdP's `exp` is in the
future. The BFF has no clock-skew tolerance in V3.0; a
follow-up may add a small leeway via `jose`'s `clockTolerance`
option.

### `BAD_AUDIENCE` after rotating `OIDC_AUDIENCE`

The new audience value must be published to the IdP's token
config before any user logs in again. Old tokens issued with
the previous audience will keep failing until they expire.

### `JWKS_ERROR` on first request

The BFF can't reach the JWKS endpoint. Confirm `OIDC_ISSUER_URL`
is reachable from the BFF container (not just from your
laptop) and that the IdP's `/.well-known/openid-configuration`
advertises a `jwks_uri`. The resolver is cached for 5 minutes
and cooled down for 30 seconds after a failure.

### 401 right after `pnpm dev:oidc` starts

The dev IdP generates a fresh key pair on each startup, so
any id_token issued by a previous run is rejected. Restart
the SPA's login flow to get a fresh token.

### `pnpm smoke:oidc` says "bff port 3001 already in use"

Another process (often a leftover `pnpm dev`) is bound to
3001. Kill it before re-running the smoke.

### Why is the email `admin@example.com@localhost:9999`?

It isn't, anymore. Earlier V3.0 development accidentally
synthesized the email as `${subject}@${issuer.host}`, which
produced nonsensical addresses for any IdP whose `sub` is
already an email. The fix (commit `b6a5e4f`) reads the
standard `email` claim with a fallback to `sub`. If you see
this string anywhere, you're looking at a pre-fix build.

## What's not in V3.0

- **RP-initiated logout** (the `end_session_endpoint` bounce).
  V3.0 just clears the cookie.
- **Refresh tokens**. The session cookie dies with the JWT;
  re-login is required when it expires.
- **Token introspection** (RFC 7662). The BFF only verifies
  locally; it never calls back to the IdP per request.
- **Group / role claim mapping**. Permissions come from
  `scope` / `permissions` only; custom claim shapes need a
  V3.x change.
- **Multi-tenant routing** (Track I in ADR 0012). V3.0 has a
  single tenant per BFF.

## Related guides

- [Local development](./local-dev.md) — prerequisites, `pnpm dev`,
  troubleshooting.
- [Deployment](./deployment.md) — env vars table, health checks,
  graceful shutdown, the production-side gate.
- [Contributing](./contributing.md) — branch / commit conventions,
  documentation discipline.
- [V3.0 implementation plan](../plans/v3.0-implementation-plan.md) —
  the design decisions, task ordering, and acceptance matrix.
- [V3 overview](../plans/v3-overview.md) — where Track F sits in
  the larger V3 roadmap.
