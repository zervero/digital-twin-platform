# Local Development

This document explains how to run, build, and test the V1 platform on a
fresh checkout.

## Prerequisites

- **Node.js >= 22.17.1** (pinned via `.nvmrc`; Node 20.x is known to fail
  during `pnpm install` — see [ADR 0004](../adr/0004-node-22-pin.md) and
  the Troubleshooting section)
- **pnpm 11.7.0** (`corepack enable` once after cloning to pin pnpm)
- (Optional) Rust toolchain for Tauri desktop builds

To pick up the right versions automatically:

```bash
nvm install   # reads .nvmrc
nvm use
corepack enable
```

## Install

```bash
pnpm install
```

## Run the dev stack

```bash
pnpm dev
```

This boots:

- BFF on http://localhost:3001
- Web app on http://localhost:5173

The Tauri desktop app does not auto-start. Launch it explicitly:

```bash
pnpm --filter @dt/desktop dev
```

There is also a one-shot script that boots the web, BFF and the Tauri
desktop shell together:

```bash
pnpm dev:all
```

`dev:all` is implemented as `turbo run dev --filter=!@dt/web`. The
reason `@dt/web` is excluded is that `@dt/desktop`'s Tauri config sets
`beforeDevCommand: pnpm --filter @dt/web dev`, so Tauri starts its own
Vite dev server on port 5173 when the desktop shell launches. Running
both `@dt/web` and `@dt/desktop` through Turbo would race for the same
port. The Tauri-owned Vite is the canonical one in this mode.


## Scripts

```bash
pnpm build        # production build via Turbo
pnpm test         # run all package unit tests
pnpm typecheck    # strict TypeScript check across the workspace
pnpm lint         # eslint
pnpm clean        # remove build artifacts and node_modules
```

## Per-package checks

```bash
pnpm --filter @dt/contracts test
pnpm --filter @dt/device-domain test
pnpm --filter @dt/scene-domain test
pnpm --filter @dt/api-client test
pnpm --filter @dt/engine-sdk test
pnpm --filter @dt/bff dev
pnpm --filter @dt/web dev
pnpm --filter @dt/desktop dev
```

## Environment variables

Web app:

- `VITE_BFF_URL` - defaults to `http://localhost:3001`.

BFF:

- `PORT` - defaults to `3001`.
- `LOG_LEVEL` - one of `debug`, `info`, `warn`, `error`.
- `CORS_ALLOWED_ORIGINS` - comma-separated allowlist of
  origins permitted to call the BFF cross-origin. Defaults to
  `http://localhost:5173,http://localhost:1420` in
  development (Vite + Tauri). Production deployments MUST
  set this explicitly; an unset value in production is
  treated as "deny all cross-origin", which is the safe
  default. Added in V3.5 Track K -- see
  [ADR 0018](../adr/0018-v3.5-i18n.md).

WebSocket auth (V3.5 Track K T8.2):

- The `/api/stream` endpoint requires a bearer token (V3.3 added the
  tenant gate). The browser WebSocket API does not allow setting
  arbitrary request headers, so the client tunnels the token through
  the `Sec-WebSocket-Protocol` subprotocols list as `bearer, <token>`.
  The BFF's `subprotocolAuth` middleware reads it back and injects it
  into the `Authorization` header, so the existing `requiresTenantScope`
  gate works on the upgrade path. There is no separate env var to
  configure -- the token always comes from the login response, and the
  path is automatic once a user is authenticated.

Desktop (Tauri):

- Standard Tauri env vars. See Tauri docs.

## Running the dev stack with OIDC

`pnpm dev` defaults to `AUTH_PROVIDER=mock` (V2.3 behavior).

### Mock login as operator (ops device actions)

Toolbar login defaults to `viewer`. To exercise device actions in the
ops drawer, mint an operator session from the browser console (BFF on
http://localhost:3001):

```js
const res = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'op@example.com', roles: ['operator'] }),
});
const { session } = await res.json();
sessionStorage.setItem('dt:auth:token', session.token);
location.reload();
```

To exercise the V3.0 OIDC code path locally:

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

The login button now redirects to the dev IdP. Three built-in
test users are selectable via the `?as=<email>` query param on
the IdP authorize endpoint: `viewer@example.com`,
`operator@example.com`, `admin@example.com`. See
[`docs/development/oidc.md`](./oidc.md) for the full env-var
contract and the JWT claim shape.

`pnpm smoke:oidc` runs the full OIDC end-to-end against the dev
IdP from CI; use it as a sanity check after editing any auth-
related code.

## Project layout

```
apps/            # Web, Desktop, BFF
packages/        # Shared libraries
tooling/         # tsconfig presets
docs/            # Architecture, ADRs, dev guides
```

## Adding a new package

1. Create `packages/<name>/package.json` and `tsconfig.json`.
2. Extend `../../tooling/tsconfig/base.json` (or `vue.json` for Vue).
3. Add the package to the workspace (`pnpm-workspace.yaml` already globs
   `packages/*`, so this is automatic).
4. Import it via the workspace alias: `"@dt/<name>": "workspace:*"`.

## Generating a Tauri updater keypair (local only)

If you are testing the desktop update flow end-to-end on your own
machine (V3.2 Track H), you need a local updater keypair. Run:

```bash
pnpm --filter @dt/desktop exec tauri signer generate -w ~/.tauri/dtp.key -p <your-password>
```

Then paste the contents of `~/.tauri/dtp.key.pub` into
`apps/desktop/src-tauri/tauri.conf.json` `plugins.updater.pubkey`.
Do **not** commit the `.key` file - the repo's `.gitignore` excludes
it, and the private key belongs in GitHub Actions secrets for CI use.
Full operator handoff, including macOS / Windows code-signing secrets
and rotation procedure, lives in
[desktop-signing.md](./desktop-signing.md).

## Troubleshooting

- **Browser shows "No 'Access-Control-Allow-Origin' header"** - the web app at
  `http://localhost:5173` and the BFF at `http://localhost:3001` are on
  different origins. The BFF's CORS middleware allowlists Vite + Tauri
  dev ports in development (added in V3.5 Track K). If you hit this in
  production, set `CORS_ALLOWED_ORIGINS=https://your-app-origin`
  explicitly. See [ADR 0018](../adr/0018-v3.5-i18n.md).
- **WebSocket shows "WebSocket connection to ws://... failed"** - the BFF's
  `/api/stream` requires a bearer token (V3.3 added the tenant gate), but
  browser WebSocket protocol forbids setting arbitrary request headers.
  The client (useDeviceStream) tunnels the token through the
  `Sec-WebSocket-Protocol` subprotocols list as `bearer, <token>`; the
  BFF's `subprotocolAuth` middleware reads it back and injects it into
  Authorization. This is automatic -- if you see this error in the
  console, log in first (the toolbar's "Sign in (dev)" button) and the
  status dot in the toolbar should turn green. Added in V3.5 Track K
  T8.2.
- **Marketplace panel logs `GET /api/plugins 401 AUTH_SESSION_EXPIRED`
  (or the panel silently fails to load) even after a successful login** -
  `createFetchMarketplaceApi` (the V3.4 fetch wrapper used by
  `MarketplacePanel`) historically used `globalThis.fetch` without
  injecting the auth bearer token, so every call to the BFF marketplace
  routes was bounced by `requiresTenantScope` with 401. The V3.5
  follow-up (4.5.2) added an optional `getAuthToken` option, and
  `MarketplacePanel` wires it to `authStore.token`. If you see this
  error in the console, confirm the host is on 4.5.2 or later; custom
  hosts that call `createFetchMarketplaceApi` directly must pass
  `getAuthToken: () => authStore.token` (the same callback the
  `useDeviceStream` WebSocket path uses) so the HTTP and WebSocket
  transports share one source of truth for the bearer token.
- **Vite dev server won't start** - check that port 5173 is free.
- **BFF unreachable from web** - confirm the URL in `apps/web/.env` or
  `VITE_BFF_URL` matches the BFF's `PORT`.
- **Tests fail in `@dt/engine-sdk`** - the test suite uses `jsdom`; make
  sure the dev dependency installed correctly.
- **Tauri build complains about icons** - the V1 placeholder icons are
  1x1 transparent PNGs. Replace them with real assets before shipping.
- **`pnpm install` fails on Node 20.x** - upgrade to Node 22.17.1 or
  newer (`nvm use` from the repo root). The 20.x line is not supported
  in V1; see [ADR 0004](../adr/0004-node-22-pin.md).
- **`pnpm smoke:oidc` fails with "bff port 3001 already in use"** -
  another process (often a leftover `pnpm dev`) is bound to 3001.
  Kill it before re-running the smoke, or set `BFF_PORT=<other>`.
