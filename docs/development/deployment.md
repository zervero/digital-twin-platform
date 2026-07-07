# Deployment (V2.3 + V3.0)

> Scope: production-shape local stack (`docker compose`) and per-container
> run instructions for `apps/bff` and `apps/web`.
>
> Kubernetes, Helm, TLS termination, and the Tauri release pipeline are V3.

## Quickstart

```bash
cp .env.example .env  # adjust AUTH_PROVIDER if needed
docker compose up --build
curl -sS http://localhost:8080/health
```

The compose stack runs:

- `bff` on the internal `dt-net` network, port 3001
- `web` on host port 8080 (mapped from container `:80`), proxying `/api/` to the BFF

Stop the stack with `docker compose down`.

## Environment variables

### BFF (`@dt/config`)

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `production` enables env validation + structured JSON logs |
| `PORT` | no | `3001` | HTTP listen port |
| `LOG_LEVEL` | no | `info` | `debug` / `info` / `warn` / `error` |
| `AUTH_PROVIDER` | **yes in production** | unset in dev | `mock` (V2.3) or `oidc` (V3.0) |

In production, missing or invalid `AUTH_PROVIDER` causes `readAppEnv` to
throw `EnvValidationError` at boot, which the BFF logs and exits 1 on.
The container's `docker-entrypoint.sh` re-checks the value before exec
as defense-in-depth, so a future refactor that drops the gate in
`readAppEnv` still fails fast with a clear log line. See
[`packages/config/src/index.ts`](../../packages/config/src/index.ts)
and [`apps/bff/docker-entrypoint.sh`](../../apps/bff/docker-entrypoint.sh).

#### OIDC env vars (V3.0, when `AUTH_PROVIDER=oidc`)

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `OIDC_ISSUER_URL` | yes | — | Issuer base URL; must match the JWT `iss` claim exactly |
| `OIDC_CLIENT_ID` | yes | — | Client id sent on `/authorize` |
| `OIDC_AUDIENCE` | yes | — | Must match the JWT `aud` claim |
| `OIDC_SCOPES` | no | `openid profile` | Space-separated; permission-shaped scopes (`device:read`) are valid |
| `OIDC_JWKS_URI` | no | `${OIDC_ISSUER_URL}/.well-known/jwks.json` | Override only if the IdP uses a non-standard path |
| `OIDC_COOKIE_NAME` | no | `dt_oidc_session` | Cookie the BFF reads on `/api/auth/me` |
| `OIDC_COOKIE_SECURE` | no | `true` in production | Set `false` only for local HTTP testing |
| `OIDC_ALLOW_DEV_BYPASS` | no | `false` | **Dev only**. Skips JWT verification; never set in production |

Missing or invalid `OIDC_ISSUER_URL` / `OIDC_AUDIENCE` in
production throws `EnvValidationError` at boot. See
[`docs/development/oidc.md`](./oidc.md) for the full env-var
contract, the JWT claim shape, and the dev IdP setup.

### Web (nginx template)

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `BFF_UPSTREAM` | no | `http://bff:3001` | Upstream for the `/api/` proxy |

The `nginx` config uses `envsubst '${BFF_UPSTREAM}'` only — not a bare
`envsubst` — so nginx runtime vars (`$host`, `$scheme`, `$remote_addr`,
...) are never clobbered. See
[`apps/web/docker-entrypoint.sh`](../../apps/web/docker-entrypoint.sh).

## Health and readiness

- `GET /health` (BFF) — liveness probe. 200 as long as the process is
  alive. Never flips. Used by the Docker `HEALTHCHECK` and by compose's
  `service_healthy` gate on the web service.
- `GET /ready` (BFF) — readiness probe. 200 when accepting traffic,
  503 during graceful shutdown. An orchestrator should poll `/ready`
  and stop sending new traffic when it flips to 503.

For Kubernetes:

```yaml
livenessProbe:
  httpGet: { path: /health, port: 3001 }
  periodSeconds: 30
readinessProbe:
  httpGet: { path: /ready, port: 3001 }
  periodSeconds: 5
  failureThreshold: 1
```

## Graceful shutdown

The BFF handles `SIGTERM` and `SIGINT` (T2):

1. Sets the `isShuttingDown` flag (`/ready` flips to 503).
2. Stops the dev mock source (if running).
3. Sends a WebSocket close frame (`1001 going away`) to every active
   client.
4. Closes the HTTP server (stops accepting new connections, waits for
   in-flight responses).
5. Hard-exits after a 10-second drain timeout.

`tini` is PID 1 in the BFF image, which forwards signals to the node
process. That means `docker stop <container>` (default `SIGTERM`, then
`SIGKILL` after the 10-second Docker stop grace period) drains
cleanly. Without `tini`, `docker stop` would deliver `SIGTERM` to a
node process not registered as PID 1, and the
[shutdown handlers in `apps/bff/src/index.ts`](../../apps/bff/src/index.ts)
would not run.

## Logs

- BFF: structured JSON via `@dt/observability` (V2.0). Every line has
  `time`, `level`, `msg`, and (for per-request log lines) `requestId`.
  In dev (`pretty` format) the same fields are human-readable.
  Container logs are captured by the default Docker `json-file` driver
  and are visible via `docker compose logs bff`.
- Web: nginx access + error logs to stdout (the `nginx:alpine` image
  is configured that way by default).

> No host-mounted log volume: nothing in the BFF writes to a file,
> so a `volumes:` mount for `/var/log/bff` would be dead weight.
> Mount a host path only when a process inside actually writes
> files.

## Why tsx at runtime? (BFF image)

V1's workspace packages are all explicitly **type-only**: their
`package.json` `main` points at `src/index.ts` and their `dist/` is a
placeholder gitkeep. The BFF's compiled `dist/index.js` would fail
with `ERR_UNKNOWN_FILE_EXTENSION` when importing `@dt/config`,
`@dt/contracts`, etc., because Node can't load a `.ts` file directly.

The BFF image therefore runs the source with `tsx` at runtime, not a
pre-built `dist/`. `tsx` is a devDep (not a prod dep, so
`pnpm deploy --legacy --prod` strips it). The image installs `tsx`
into a side directory `/opt/tsx` with a throwaway `package.json` (so
its install does not trip over the `workspace:*` protocol in the
deployed package). The `CMD` invokes
`/opt/tsx/node_modules/.bin/tsx /app/src/index.ts` directly rather
than `node --import tsx`, because the latter's ESM resolution does
not reliably honor `NODE_PATH`.

This is a single-image choice. Making all workspace packages emit
real `dist/` artifacts (so the BFF can run compiled JS) is left to
V2.4 as an explicit decision.

## Running the BFF without Docker

```bash
pnpm install --frozen-lockfile
NODE_ENV=production AUTH_PROVIDER=mock pnpm --filter @dt/bff dev
```

The BFF uses `tsx` to load `.ts` source at runtime, so no separate
build step is needed. The `pnpm --filter @dt/bff start` script (which
runs the compiled `dist/index.js`) is reserved for a future when the
BFF has a real build artifact. For V2.3, use `dev`.

The BFF listens on `:3001` by default. Set `PORT` to override.

## Running the web without Docker

```bash
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@dt/web...
pnpm --filter @dt/web preview  # vite preview on :4173
```

`vite preview` is a dev convenience, not a production server. For
anything beyond local exploration, use the Docker image, which serves
the same `dist/` files via nginx with the SPA fallback and `/api/`
reverse proxy.

The Tauri desktop app (`apps/desktop`) does not use the web's Docker
image — it embeds the same `apps/web/dist/` build as its
`frontendDist`. See
[`apps/desktop/src-tauri/tauri.conf.json`](../../apps/desktop/src-tauri/tauri.conf.json).

## Pre-release pre-flight

Before merging a release-please PR for a production-shape
release (V2.3+), the release captain runs `scripts/smoke-prod.sh`
to verify the Dockerfiles still build
and the compose stack still serves `/health`, `/ready`, and the
`/api/` proxy end to end. The script is the gating check for V2.3
acceptance #6, #7, #8.

If `docker compose` is not available locally (e.g. the host's
Docker Desktop is mid-recovery), the smoke script returns a clear
error and the captain defers to a second machine. Do not skip the
pre-flight — a release with a broken Dockerfile is worse than a
delayed release.

For V3.0 and beyond, the release captain additionally runs
`scripts/smoke-oidc.sh` (or the CI equivalent) to verify the
OIDC path end-to-end against the dev IdP. A release with a
broken OIDC code path is a P0.

## What's not in V2.3 (and where each item went in V3+)

- Kubernetes manifests / Helm chart — V3 (Track G in ADR 0012).
- TLS termination, ACME, cert provisioning — V3 (front the
  compose stack with your own reverse proxy that terminates
  TLS until V3 ships its ingress story).
- Tauri release build CI (signed `.dmg` / `.msi` / `.AppImage`)
  — V3 (Track H).
- Multi-region, CDN — V3+.
- Metrics endpoint, OpenTelemetry traces — V3 (Track G).
- Persistent plugin storage, plugin marketplace — V3 (Track J).

Shipped in V3.0:

- Real auth provider (OIDC) — V3.0 Track F. See
  [`docs/development/oidc.md`](./oidc.md) and ADR 0013 (V3.0
  closure). `AUTH_PROVIDER=oidc` is now functional end-to-end
  with JWKS verification, the V2.1 permission union, and the
  dev IdP for CI.

Shipped in V3.1:

- **Kubernetes Helm chart** — V3.1 Track G. The umbrella
  chart at `tooling/k8s/digital-twin-platform/` provisions
  the BFF + web + (optionally) Ingress + cert-manager with
  `helm install dtp`. See
  [`docs/development/production-platform.md`](./production-platform.md)
  for the install / TLS / OTel / operations runbook.
- **OpenTelemetry traces + metrics** — V3.1 Track G. The
  `@dt/otel` package starts a NodeSDK on BFF bootstrap and
  shuts it down as the last step of graceful shutdown.
  Configured via `OTEL_*` env vars; defaults wired in
  `apps/bff/.env.example.otel`.
- **V3.0 was the last "compose is enough" release.** From
  V3.1 onward the supported deployment shape is the helm
  chart. The compose files in `apps/{bff,web}` Dockerfiles
  remain for dev-loop convenience but are no longer the
  production path. The V2.3-era `docker-compose.yml`
  contract is now considered legacy.

## Related guides

- [Local development](./local-dev.md) — `pnpm dev`, prerequisites, troubleshooting.
- [Contributing](./contributing.md) — workflow rules (branches, commits, hooks).
- [Release playbook](./release-playbook.md) — release-please cadence and PR review.
- [OIDC (V3.0)](./oidc.md) — `AUTH_PROVIDER=oidc`, dev IdP,
  production env vars, JWT claim shape, troubleshooting.
- [Production platform (V3.1)](./production-platform.md) — helm chart,
  TLS via cert-manager, OTel, operations runbook.
- [V2.3 closure ADR](../adr/0011-v2.3-closure.md) — the rationale for the
  tsx-at-runtime design choice documented above, plus the full
  acceptance matrix and deviations from the V2.3 plan.
- [V3.0 closure ADR](../adr/0013-v3.0-closure.md) — Track F (OIDC)
  acceptance matrix and deviations from the V3.0 plan.
