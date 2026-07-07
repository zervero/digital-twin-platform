#!/usr/bin/env bash
# Strict chart lint for the umbrella chart.
#
# Two stages:
#   1. `helm lint --strict` -- schema + best-practice check
#   2. `kubeconform -strict` -- render the chart and validate every
#      emitted manifest against the Kubernetes OpenAPI schemas
#
# Both stages must pass. We render twice: once with default values
# (no ingress / cert-manager) and once with the cert-manager example
# overlay, so both code paths are exercised.
#
# cert-manager CRDs (Certificate, ClusterIssuer, ...) are NOT in the
# stock kubernetes-json-schema. We pull them from the datreeio CRD
# catalog at runtime. If the catalog fetch fails (offline), kubeconform
# degrades gracefully via -ignore-missing-schemas.

set -euo pipefail

CHART_DIR="tooling/k8s/digital-twin-platform"
CERTMANAGER_EXAMPLE="$CHART_DIR/values-certmanager-example.yaml"
CRD_SCHEMA_LOCATION='https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json'

echo "[chart:lint:strict] helm dependency update"
helm dependency update "$CHART_DIR" >/dev/null

echo "[chart:lint:strict] helm lint --strict (defaults)"
helm lint --strict "$CHART_DIR"

echo "[chart:lint:strict] helm lint --strict (with cert-manager overlay)"
helm lint --strict "$CHART_DIR" -f "$CERTMANAGER_EXAMPLE"

echo "[chart:lint:strict] helm template | kubeconform -strict (defaults)"
helm template dtp "$CHART_DIR" \
  | kubeconform -strict -summary -verbose \
      -schema-location default \
      -schema-location "$CRD_SCHEMA_LOCATION" \
      -ignore-missing-schemas

echo "[chart:lint:strict] helm template | kubeconform -strict (cert-manager overlay)"
helm template dtp "$CHART_DIR" -f "$CERTMANAGER_EXAMPLE" \
  | kubeconform -strict -summary -verbose \
      -schema-location default \
      -schema-location "$CRD_SCHEMA_LOCATION" \
      -ignore-missing-schemas
