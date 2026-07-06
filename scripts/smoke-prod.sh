#!/usr/bin/env bash
# V2.3 production smoke. Builds the BFF and web images,
# starts the compose stack, exercises /health and /api/
# through the web proxy, asserts /ready on the BFF, sends
# SIGTERM via `docker compose stop`, and asserts the BFF
# drains within 15s. This is a local pre-flight script; CI
# does not run it (no docker-in-docker on the runner).
# Exits 0 on success.
#
# Note on /ready: /ready is a BFF-internal orchestrator
# probe and is NOT proxied through nginx (the nginx config
# only matches 'location /api/'). The smoke uses
# 'docker compose exec bff ...' to reach the BFF directly
# on the internal network, which is what a Kubernetes
# readiness probe would do anyway.
set -euo pipefail

COMPOSE="docker compose"
PROJECT="dt-smoke-$(date +%s)"

cleanup() {
  $COMPOSE -p "$PROJECT" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[smoke-prod] building images"
$COMPOSE -p "$PROJECT" build

echo "[smoke-prod] starting stack"
$COMPOSE -p "$PROJECT" up -d

# Wait for the web proxy to start serving /health (proxied to BFF).
echo "[smoke-prod] waiting for /health via web proxy"
for _ in $(seq 1 60); do
  if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
if ! curl -sf http://localhost:8080/health >/dev/null 2>&1; then
  echo "[smoke-prod] /health never came up"
  $COMPOSE -p "$PROJECT" logs
  exit 1
fi
echo "[smoke-prod] /health 200 via web proxy"

# Verify /api/ is proxied to the BFF.
ME_RES="$(curl -sf http://localhost:8080/api/auth/me)"
if ! echo "$ME_RES" | grep -q '"session":null'; then
  echo "[smoke-prod] /api/auth/me should return session:null (got: $ME_RES)"
  $COMPOSE -p "$PROJECT" logs
  exit 1
fi
echo "[smoke-prod] /api/auth/me proxied to BFF"

# Verify /ready via direct exec (BFF-internal probe).
if ! $COMPOSE -p "$PROJECT" exec -T bff wget -qO- http://127.0.0.1:3001/ready >/dev/null 2>&1; then
  echo "[smoke-prod] /ready should be 200 when not shutting down"
  $COMPOSE -p "$PROJECT" logs
  exit 1
fi
echo "[smoke-prod] /ready 200 when not shutting down"

# Send SIGTERM via compose stop, with a 15s deadline.
echo "[smoke-prod] sending SIGTERM (docker compose stop)"
START="$(date +%s)"
$COMPOSE -p "$PROJECT" stop -t 15
ELAPSED=$(( $(date +%s) - START ))
if [ "$ELAPSED" -gt 15 ]; then
  echo "[smoke-prod] BFF did not drain within 15s (took ${ELAPSED}s)"
  exit 1
fi
echo "[smoke-prod] BFF drained in ${ELAPSED}s"

echo "[smoke-prod] OK"
