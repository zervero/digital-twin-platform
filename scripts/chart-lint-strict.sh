#!/usr/bin/env bash
# Strict chart lint for the umbrella chart.
#
# Two stages:
#   1. `helm lint --strict` — schema + best-practice check
#   2. `kubeconform -strict` — render the chart and validate every
#      emitted manifest against the Kubernetes OpenAPI schemas
#
# Both stages must pass. We render once and pipe to kubeconform
# (no temp file) so the lint never drifts from the install shape.

set -euo pipefail

CHART_DIR="tooling/k8s/digital-twin-platform"

echo "[chart:lint:strict] helm dependency update"
helm dependency update "$CHART_DIR" >/dev/null

echo "[chart:lint:strict] helm lint --strict"
helm lint --strict "$CHART_DIR"

echo "[chart:lint:strict] helm template | kubeconform -strict"
# -ignoreMissingSchemas skips resources whose CRDs aren't shipped
# with stock kubeconform (e.g. PodDisruptionBudget pre-policy/v1 in
# some clusters). Our chart uses policy/v1 which IS shipped.
helm template dtp "$CHART_DIR" \
  | kubeconform -strict -summary -verbose -schema-location default
