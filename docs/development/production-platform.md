# Production Platform (V3.1)

> Scope: how to run the Digital Twin Platform on a Kubernetes
> cluster with TLS, OIDC, and OpenTelemetry. Covers the helm
> chart at `tooling/k8s/digital-twin-platform/`, the value
> overlays for staging / prod, the cert-manager path for
> public TLS, and the OTLP wiring for traces / metrics.
>
> Audience: cluster operators deploying the platform to a
> real cluster (not local `pnpm dev`). For the rationale
> (why this design, what the alternatives were), see
> [`docs/plans/v3.1-implementation-plan.md`](../plans/v3.1-implementation-plan.md).

## Two artefacts, one install

```
tooling/k8s/digital-twin-platform/    umbrella chart (v0.1.0)
├── Chart.yaml                        bff + web subcharts
├── values.yaml                       defaults (no TLS, no OIDC)
├── values.schema.json                JSON schema; rejects bad input
├── templates/
│   ├── _helpers.tpl
│   ├── namespace.yaml                pod-security=restricted
│   ├── cluster-issuer.yaml           cert-manager (T5)
│   └── certificate.yaml              cert-manager (T5)
├── charts/
│   ├── bff/                          API + WS + OIDC
│   └── web/                          SPA + nginx + ingress
├── values-prod.yaml                  prod-sized overlay
├── values-staging.yaml               staging-sized overlay
├── values-certmanager-example.yaml   cert-manager + ingress overlay
├── values-oidc-example.yaml          OIDC env-var overlay
└── secrets.example.yaml              OIDC Secret template (NOT a real Secret)
```

The umbrella chart produces **10 resources by default** and
**13 with the cert-manager overlay**. Both counts are
asserted by `pnpm chart:lint:strict`.

## Quickstart (local cluster)

```bash
# 1. kind / minikube / k3d — anything that gives you a
#    kubeconfig and a `kubectl` works.
kind create cluster --name dtp

# 2. Install the chart with defaults (no TLS, no OIDC).
pnpm chart:dep
helm install dtp tooling/k8s/digital-twin-platform

# 3. Port-forward the web SPA.
kubectl port-forward svc/dtp-web 8080:80

# 4. Sanity-check.
curl http://localhost:8080/health    # web SPA serves index.html
kubectl port-forward svc/dtp-bff 3001:3001
curl http://localhost:3001/health    # BFF returns 200
curl http://localhost:3001/ready     # 200 when ready, 503 while shutting down
```

Defaults use `AUTH_PROVIDER=mock` (the V2.3 dev auth path)
and `authProvider: mock` in the BFF configMap. This is
intentional — local clusters should boot without external
dependencies. Switch to OIDC with `-f values-oidc-example.yaml`
once you have an issuer.

## Production install

```bash
# 1. Render and review the manifest before applying.
helm template prod-dtp tooling/k8s/digital-twin-platform \
  -f values-prod.yaml \
  -f values-certmanager-example.yaml \
  -f values-oidc-example.yaml \
  --set global.ingress.hosts[0].host=dtp.your-domain.example \
  --set bff.oidc.secretName=bff-oidc-secret-real

# 2. Pre-create the OIDC Secret OUT OF BAND. The chart never
#    owns secret material. Three documented paths:
#    - kubectl create secret generic bff-oidc-secret --from-literal=...
#    - sealed-secrets (kubeseal)
#    - external-secrets (Vault / AWS Secrets Manager / ...)
#    See secrets.example.yaml for the expected keys.

# 3. Apply.
helm install prod-dtp tooling/k8s/digital-twin-platform \
  -f values-prod.yaml \
  -f values-certmanager-example.yaml \
  -f values-oidc-example.yaml \
  --set global.ingress.hosts[0].host=dtp.your-domain.example
```

`values-prod.yaml` sets `replicaCount: 2` for both workloads
and bumps resource limits. `values-oidc-example.yaml`
documents the OIDC env vars for Auth0 / Keycloak / Okta.
`values-certmanager-example.yaml` enables the Ingress +
cert-manager path with sensible defaults.

## TLS

The chart ships **two layers** for TLS, both gated by
`global.certManager.enabled: true`:

1. **ClusterIssuer** at the umbrella level. One of:
   - `letsencrypt-prod` (default; rate limits)
   - `letsencrypt-staging` (set `global.certManager.staging: true`)
2. **Certificate** at the umbrella level. `dnsNames` is
   derived from `global.ingress.hosts[]` so adding a host
   to values.yaml is enough to get a cert for it.

The **Ingress** lives in the `web` subchart. It carries
the `cert-manager.io/cluster-issuer` annotation, which
the cert-manager Ingress shim reads to auto-create the
matching Certificate. The explicit Certificate CRD we
emit is a belt-and-suspenders fallback for clusters
where the shim is disabled or stale.

### Verifying a fresh cert

```bash
kubectl get certificate -n digital-twin-platform
# NAME                       READY   SECRET                     AGE
# digital-twin-platform-tls True    digital-twin-platform-tls   2m

kubectl describe certificate digital-twin-platform-tls -n digital-twin-platform
# Look for "Message: Certificate is up to date and has been renewed".

# Force a renewal check (no-op if the cert is already current).
cmctl renew digital-twin-platform-tls -n digital-twin-platform
```

### Common TLS failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Certificate` stuck in `Pending` for >10m | DNS doesn't resolve to ingress controller IP | Add the A record; the HTTP-01 challenge needs port 80 reachable from Let's Encrypt |
| `Certificate` issues but browser warns | `staging: true` (untrusted cert) | Flip to `staging: false` and re-apply; wait for renewal |
| `secretName mismatch` warning on the Ingress | `global.ingress.tls[].secretName` doesn't match the Certificate's `secretName` | Set both to the same value; the chart defaults both to `digital-twin-platform-tls` |
| 503 from the BFF readiness probe | `authProvider` mismatch (oidc + no IdP, or vice versa) | Check `kubectl logs -l app.kubernetes.io/component=bff` for the env-var warning |

## OpenTelemetry

The BFF ships with `@dt/otel`, which starts an OpenTelemetry
NodeSDK on bootstrap and shuts it down as the last step of
graceful shutdown. The chart wires `OTEL_*` env vars via
`global.ingress.certManager` -> no wait, via the BFF's
ConfigMap (see `charts/bff/templates/configmap.yaml`):

| Env var | Default in chart | Notes |
| --- | --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector.observability:4318` | Assumes a sidecar / in-cluster collector |
| `OTEL_SERVICE_NAME` | `digital-twin-platform-bff` | Match the chart's Service.name |
| `OTEL_METRIC_EXPORT_INTERVAL` | `30000` (30s) | Tighten to 10s only if dashboards need it |
| `OTEL_SDK_DISABLED` | `false` | Set `true` to skip the SDK entirely (zero overhead) |

To send traces / metrics to a hosted backend (Honeycomb,
Grafana Cloud, Datadog, etc.), override
`bff.config.otelExporterOtlpEndpoint` and add the auth
header via a future `bff.config.otelExporterOtlpHeaders`
key (V3.2).

For local development:

```bash
# Terminal: alligator (an OTel collector that prints to stdout).
docker run --rm -p 4318:4318 -p 4317:4317 otel/alligator:latest

# Terminal: the BFF.
OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318 \
  pnpm dev
```

The web SPA does NOT ship OTel in V3.1. Browser RUM is
reserved for V3.x and the env vars are documented in
[`apps/web/.env.example.otel`](../../apps/web/.env.example.otel).

## Operations

### Rolling update

```bash
# Bump the image tag (defaults to .Chart.AppVersion; pinned per-env).
helm upgrade prod-dtp tooling/k8s/digital-twin-platform \
  -f values-prod.yaml \
  --reuse-values \
  --set bff.image.tag=v4.0.1

# Watch the rollout.
kubectl rollout status deploy/dtp-bff -n digital-twin-platform
kubectl rollout status deploy/dtp-web -n digital-twin-platform
```

The BFF's `terminationGracePeriodSeconds: 30` plus a
5s `preStop` sleep gives the load balancer time to
drain in-flight requests before SIGTERM lands. WS
frames drain inside `bootstrap.ts`'s shutdown path;
the OTel SDK flushes as the last step before exit.

### Rollback

```bash
helm history prod-dtp -n digital-twin-platform
helm rollback prod-dtp <revision> -n digital-twin-platform
```

### Log retrieval

```bash
# Structured JSON logs from the BFF (one line per request).
kubectl logs -l app.kubernetes.io/component=bff -n digital-twin-platform --tail=100

# Follow a specific pod.
kubectl logs -f dtp-bff-<hash> -n digital-twin-platform

# nginx access logs from the web pod.
kubectl logs -l app.kubernetes.io/component=web -n digital-twin-platform
```

The BFF uses `@dt/observability`'s `createLogger()` which
emits JSON lines with `ts`, `level`, `requestId`, `msg`,
and context fields. Pipe to `jq` for pretty-printing.

### Manual scale

```bash
kubectl scale deploy/dtp-bff -n digital-twin-platform --replicas=4
kubectl scale deploy/dtp-web -n digital-twin-platform --replicas=4
```

For autoscaling, see [What's not in V3.1](#whats-not-in-v31).

## Troubleshooting

| Symptom | First check | Likely fix |
| --- | --- | --- |
| `ImagePullBackOff` on BFF / web | `kubectl describe pod` | The image tag doesn't exist on the registry; check `bff.image.tag` / `web.image.tag` against the release manifest |
| BFF `CrashLoopBackOff` after install | `kubectl logs` last 50 lines | Usually a missing OIDC Secret; the chart references it by name but does not generate it |
| Ingress returns 502 with `upstream connect error` | `kubectl get endpoints -n digital-twin-platform dtp-bff` | BFF pods aren't ready (readiness probe failing) or Service selector mismatch |
| Cert-manager not issuing | `kubectl describe clusterissuer` + `kubectl describe certificate` | The issuer's ACME account registration failed; check `kubectl logs -n cert-manager -l app=cert-manager` |
| OTel spans not reaching the collector | `kubectl logs -l app.kubernetes.io/component=bff \| grep otel` | Endpoint unreachable; check `OTEL_EXPORTER_OTLP_ENDPOINT` resolves from the pod's network namespace |
| `Pod security policy / SecurityContext` warning | `kubectl get pod -o yaml` | The namespace has `pod-security.kubernetes.io/enforce: restricted`; the chart sets `runAsNonRoot: true` + `readOnlyRootFilesystem: true` but your custom image might not be compatible |

## What's not in V3.1

Documented so the next iteration knows what's left:

- **HA / multi-region.** Single-region, single-cluster.
  For multi-region, the chart needs a `global.clusterName`
  override + per-region values overlays + a global load
  balancer. Tracked in V3.2 backlog.
- **Autoscaling (HPA).** Replica count is static. The chart
  exposes `replicaCount` for manual scaling; an HPA could
  be added as a subchart template gated by
  `autoscaling.enabled`.
- **PodDisruptionBudget for the web workload.** BFF has
  one (minAvailable: 1); web doesn't because the default
  replica count is 1. Add `web.podDisruptionBudget` when
  scaling web to 2+ replicas.
- **Browser RUM (V3.x web OTel).** The env contract is
  documented in [`apps/web/.env.example.otel`](../../apps/web/.env.example.otel);
  the implementation lands when the V3.x track opens.
- **External Secrets operator integration.** The chart
  consumes a pre-created Secret by name. The values
  schema for `ExternalSecret` CRDs lands when the
  secrets-management track opens.
- **Multi-arch images.** Images are amd64 only. arm64
  nodes will pull the amd64 image via emulation; native
  arm64 builds are a V3.2 task.
- **Backup / restore for stateful components.** The
  platform has no stateful workloads in V3.1; if V3.2
  adds Postgres, add a `velero` hook here.

## Related guides

- [`local-dev.md`](local-dev.md) — `pnpm dev` workflow on a laptop
- [`oidc.md`](oidc.md) — V3.0 OIDC authentication contract (env vars, JWT shape, cookie)
- [`deployment.md`](deployment.md) — pre-V3.1 deployment shape (docker compose, single VM)
- [`contributing.md`](contributing.md) — commit / PR / release conventions
- [`release-playbook.md`](release-playbook.md) — what to do after release-please opens a PR
