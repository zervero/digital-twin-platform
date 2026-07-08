# Plugin marketplace + persistence (V3.4)

> Scope: how a V3.4 operator publishes, signs, installs,
> activates, and uninstalls a plugin against the
> platform's marketplace API, how the file-based
> `PluginStore` and HMAC signing fit together, and how
> the dev loop keeps working without a real KMS.
>
> Audience: anyone touching `apps/bff/src/routes/marketplace.ts`,
> `apps/bff/src/plugins/`, `@dt/plugin-registry`,
> `@dt/plugin-runtime`'s persistence surface, or
> `pnpm smoke:marketplace`. For the rationale (why this
> design, what the alternatives were), see
> [`docs/plans/v3.4-implementation-plan.md`](../plans/v3.4-implementation-plan.md)
> and the V3 roadmap ADR (`docs/adr/0012-v3-roadmap.md`).

## The model

The V3.4 marketplace is **local, file-backed, per-tenant**:

- A single BFF process owns the local registry and the
  file-based `PluginStore`. Multi-replica deployments
  are out of scope (a V3.4.x follow-up moves the
  store to SQLite or Postgres).
- The registry is a flat in-memory `Map` keyed on
  plugin id; published versions live under
  `<root>/_registry/<pluginId>/<version>/`.
- Installs are per-tenant. Each install record carries
  `tenantId` + `pluginId` + `version` + `installedAt` +
  paths to the manifest, signed artifact, and signature
  file. Active version is a single `active.txt` pointer
  per `(tenantId, pluginId)`.
- Authentication reuses the V3.3 `requiresTenantScope`
  middleware; the policy gate (`canInstallForTenant`,
  `canPublish`) layers the marketplace-specific
  permission check on top. Operators / viewers can list
  the registry; only admins can publish / install /
  activate / uninstall.
- The on-disk layout:

  ```
  <root>/_registry/<pluginId>/<version>/manifest.json
  <root>/_registry/<pluginId>/<version>/artifact.tgz
  <root>/_registry/<pluginId>/<version>/signature.txt
  <root>/<tenantId>/<pluginId>/<version>/manifest.json
  <root>/<tenantId>/<pluginId>/<version>/artifact.tgz
  <root>/<tenantId>/<pluginId>/<version>/signature.txt
  <root>/<tenantId>/<pluginId>/<version>/install.json
  <root>/<tenantId>/<pluginId>/active.txt
  ```

  The `_registry/` tree holds publish-time artifacts;
  the `<tenantId>/` tree holds install-time artifacts.
  They never overlap. The default `<root>` is
  `apps/bff/.data/plugins/` and is gitignored.

## The signing key

`PLUGIN_SIGNING_SECRET` is the HMAC-SHA256 key the BFF
uses to sign every published artifact. The contract:

- The value must be at least **32 bytes** (the BFF
  refuses to boot with anything shorter in production).
  Base64-encoded values are fine; the BFF treats the raw
  string as the key.
- The BFF signs the manifest, not the artifact body, so
  a published plugin's signature is bound to its declared
  id / name / version / permissions / vendor. Replaying
  the same artifact with a tampered manifest fails the
  verification step at install time.
- The signature is **per-instance**, not
  third-party-verifiable. An attacker with the secret
  can sign malicious artifacts; the secret is the
  trust boundary. GPG / Sigstore / cosign are
  V3.4.x follow-ups when the operator wants
  third-party-verifiable provenance.

### Dev loop

In dev, the BFF auto-generates a random secret on first
boot and writes it to
`apps/bff/.data/dev-signing-secret` (gitignored). The
secret survives across restarts but never leaves the
machine. To force a fresh secret, delete the file and
restart the BFF.

To pin a dev secret (e.g. so two terminals share the
same key during a long smoke), export it before
`pnpm dev`:

```bash
export PLUGIN_SIGNING_SECRET="$(openssl rand -base64 32)"
pnpm dev
```

The `pnpm smoke:marketplace` script does this for you:
it generates a per-run secret and passes it to the BFF
via the env var, so two smoke runs do not collide on
the same signature.

### Production

In production, set `PLUGIN_SIGNING_SECRET` to a value
sourced from your secret manager (Kubernetes Secret,
HashiCorp Vault, AWS Secrets Manager, ...). The BFF
**does not** auto-generate in production; a missing
or short secret is a hard boot error.

```yaml
# k8s example
env:
  - name: PLUGIN_SIGNING_SECRET
    valueFrom:
      secretKeyRef:
        name: digital-twin-bff
        key: plugin-signing-secret
```

A real rotation story (re-sign all published artifacts
under the new key, reject installs against the old
key for a grace period, then retire the old key) is a
V3.4.x follow-up.

## The API surface

| Method | Path | Min gate | Policy | Purpose |
| --- | --- | --- | --- | --- |
| `GET` | `/api/plugins` | `plugin:read` | none | list the local registry |
| `POST` | `/api/plugins` | `plugin:read` | `plugin:publish` | publish a new version |
| `GET` | `/api/plugins/:id` | `plugin:read` | none | get one plugin (all versions) |
| `POST` | `/api/plugins/:id/install` | `plugin:read` | `plugin:install` | install for the caller's tenant |
| `GET` | `/api/plugins/:id/installed` | `plugin:read` | none | list the caller's installed versions |
| `PUT` | `/api/plugins/:id/activate` | `plugin:read` | `plugin:install` | activate an installed version |
| `DELETE` | `/api/plugins/:id/installed/:ver` | `plugin:read` | `plugin:install` | uninstall a version |

`plugin:read` is granted to every role; the policy gate
is what keeps write actions admin-only. The `Permission`
union in `@dt/contracts` was extended in V3.4 T3; the
extension is additive (no breaking change to the V3.0
stable contract).

## The dev loop

1. Start the BFF (auto-generates a dev signing secret):

   ```bash
   pnpm dev
   ```

2. Mint an admin session via the mock auth store:

   ```bash
   curl -s -X POST http://localhost:3001/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@example.com","roles":["admin"]}' \
     | jq -r .session.token
   ```

3. Publish a manifest + base64 artifact:

   ```bash
   ART="$(echo -n 'hello-plugin-payload-v1.0.0' | base64)"
   MAN='{"id":"hello-plugin","name":"Hello Plugin","version":"1.0.0","vendor":"Acme","permissions":["device:read"]}'
   curl -sf -X POST http://localhost:3001/api/plugins \
     -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     -d "{\"manifest\":$MAN,\"artifact\":\"$ART\"}"
   ```

4. Install for the caller's tenant:

   ```bash
   curl -sf -X POST http://localhost:3001/api/plugins/hello-plugin/install \
     -H "Authorization: Bearer $TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"pluginId":"hello-plugin","version":"1.0.0"}'
   ```

5. The `MarketplacePanel` in the running app
   (`apps/web` via the BFF) shows the install with
   `active: true`. A click on the panel's refresh
   button re-pulls the install list.

## Troubleshooting

### 401 `AUTH_NO_TENANT` on `/api/plugins/*`

The JWT has no tenant claim. Mint a token via the dev
IdP with `--tenant <id>`, or log in via the mock store
with the `acme-corp` default (set in
`MockAuthStore.login`).

### 403 `PLUGIN_PERMISSION_DENIED` on install / publish / activate / uninstall

The caller is an operator or viewer. Use an admin
session:

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","roles":["admin"]}' \
  | jq -r .session.token
```

### 400 `PLUGIN_SIGNATURE_INVALID` on install

The signature file does not match the artifact. This
happens if the artifact was published with one secret
and verified with another; ensure the same
`PLUGIN_SIGNING_SECRET` is set on both publish and
install. To recover, republish the plugin under the
current secret.

### 409 `PLUGIN_ALREADY_INSTALLED` on install

The version is already installed for the caller's
tenant. Uninstall first, or pick a different version.
The V3.4 install model is **side-by-side** (multiple
versions installed at once, one active).

### 400 `PLUGIN_MANIFEST_INVALID` on publish

The manifest shape is wrong. The route validates via
`validatePluginManifest` from `@dt/plugin-runtime`; the
error message lists the bad field(s). The V2.2 manifest
contract (`id`, `name`, `version`, `vendor`, `permissions`)
is the source of truth.

### The marketplace panel is empty in the app-shell

The caller's tenant has no installed plugins. Use the
install form at the top of the panel, or curl the
`POST /api/plugins/:id/install` endpoint directly.

### An installed plugin does not appear in the UI

The activation envelope has not picked up the install;
click the refresh button in the panel, or navigate away
and back. The V3.4 stub activation envelope renders the
manifest name + version as a placeholder panel; real
plugin activation is a V3.4.x follow-up.

### 404 `PLUGIN_NOT_FOUND` / `PLUGIN_VERSION_NOT_FOUND`

The registry or the install set does not have the
requested plugin / version. `GET /api/plugins` lists
the registry; `GET /api/plugins/:id/installed` lists
the caller's installs.

### The `pnpm smoke:marketplace` smoke fails on `401 AUTH_SESSION_EXPIRED`

A previous BFF run wrote a per-checkout dev secret that
this run does not know about. Delete
`apps/bff/.data/dev-signing-secret` and re-run; the
BFF will regenerate on next boot.

## What this doc is not

- Not the API reference. The route types live in
  `@dt/contracts` (`PublishPluginRequest`,
  `InstallPluginRequest`, `ActivatePluginRequest`).
- Not the rationale. See `docs/plans/v3.4-implementation-plan.md`.
- Not the storage spec. The on-disk layout is in
  `apps/bff/src/plugins/storage.ts`'s top-of-file
  comment.
- Not the signing spec. The HMAC details are in
  `apps/bff/src/plugins/signing.ts`.
