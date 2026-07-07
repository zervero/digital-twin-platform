#!/usr/bin/env bash
# V3.3 Tenant isolation smoke.
#
# Boots the dev OIDC IdP and the BFF in OIDC mode, mints a
# JWT for each of the three dev tenants (acme-corp,
# globex-ind, initech-llc) plus one with the tenant claim
# intentionally omitted, and asserts:
#
#   1. GET /api/devices with each tenant token returns
#      only that tenant's devices (and the per-tenant
#      status distribution: acme 3 machines, globex 2,
#      initech 4 -- see apps/bff/src/mock/demo-data.ts).
#   2. GET /api/scene returns the per-tenant scene id
#      (`<tenantId>-scene`).
#   3. POST /api/commands with a mismatched `tenantId`
#      (token for acme-corp, body for globex-ind) returns
#      403 `TENANT_FORBIDDEN`.
#   4. A token minted with --no-tenant gets 401
#      `AUTH_NO_TENANT` on every tenant-scoped route.
#
# The CLI `mint` subcommand (V3.3 T8) shares the IdP's
# RSA keypair with the server listener via a file in
# os.tmpdir(), so a JWT minted here is verifiable by
# the same IdP the BFF fetches JWKS from.
set -euo pipefail

BFF_PORT="${BFF_PORT:-3001}"
OIDC_PORT="${OIDC_PORT:-9999}"
LOG_FILE="$(mktemp -t bff-tenant-smoke.XXXXXX.log)"
IDP_LOG="$(mktemp -t idp-tenant-smoke.XXXXXX.log)"
BFF_PID=""
IDP_PID=""

cleanup() {
  if [ -n "$BFF_PID" ] && kill -0 "$BFF_PID" 2>/dev/null; then
    kill "$BFF_PID" 2>/dev/null || true
    wait "$BFF_PID" 2>/dev/null || true
  fi
  if [ -n "$IDP_PID" ] && kill -0 "$IDP_PID" 2>/dev/null; then
    kill "$IDP_PID" 2>/dev/null || true
    wait "$IDP_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if lsof -i ":$BFF_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[smoke] bff port $BFF_PORT already in use"
  exit 1
fi
if lsof -i ":$OIDC_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[smoke] idp port $OIDC_PORT already in use"
  exit 1
fi

echo "[smoke] starting dev oidc idp on :$OIDC_PORT"
DEV_OIDC_PORT="$OIDC_PORT" node scripts/dev-oidc-idp.mjs > "$IDP_LOG" 2>&1 &
IDP_PID=$!

echo "[smoke] starting bff on :$BFF_PORT (oidc mode)"
(cd "$(dirname "$0")/.." && \
  PORT="$BFF_PORT" \
  NODE_ENV=development \
  AUTH_PROVIDER=oidc \
  OIDC_ISSUER_URL="http://localhost:$OIDC_PORT" \
  OIDC_CLIENT_ID=digital-twin \
  OIDC_AUDIENCE=digital-twin-platform \
  OIDC_SCOPES="openid profile device:read scene:read command:send" \
  pnpm --filter @dt/bff dev) > "$LOG_FILE" 2>&1 &
BFF_PID=$!

# Wait for IdP ready
for _ in $(seq 1 40); do
  if curl -sf "http://localhost:$OIDC_PORT/.well-known/openid-configuration" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
if ! curl -sf "http://localhost:$OIDC_PORT/.well-known/openid-configuration" >/dev/null 2>&1; then
  echo "[smoke] idp never became ready"
  cat "$IDP_LOG"
  exit 1
fi

# Wait for BFF listening
for _ in $(seq 1 60); do
  if grep -Eq '(listening|"msg":"listening")' "$LOG_FILE" 2>/dev/null; then break; fi
  sleep 0.5
done
if ! grep -Eq '(listening|"msg":"listening")' "$LOG_FILE" 2>/dev/null; then
  echo "[smoke] bff never logged listening"
  cat "$LOG_FILE"
  exit 1
fi

# Mint 4 tokens. `mint` is a CLI subcommand that shares
# the IdP's RSA keypair via os.tmpdir() (see
# scripts/dev-oidc-idp.mjs T8 note).
echo "[smoke] minting tokens"
TOKEN_A=$(DEV_OIDC_PORT="$OIDC_PORT" node scripts/dev-oidc-idp.mjs mint --tenant acme-corp)
TOKEN_B=$(DEV_OIDC_PORT="$OIDC_PORT" node scripts/dev-oidc-idp.mjs mint --tenant globex-ind)
TOKEN_C=$(DEV_OIDC_PORT="$OIDC_PORT" node scripts/dev-oidc-idp.mjs mint --tenant initech-llc)
TOKEN_NOTENANT=$(DEV_OIDC_PORT="$OIDC_PORT" node scripts/dev-oidc-idp.mjs mint --no-tenant)

if [ -z "$TOKEN_A" ] || [ -z "$TOKEN_B" ] || [ -z "$TOKEN_C" ] || [ -z "$TOKEN_NOTENANT" ]; then
  echo "[smoke] mint produced empty token"
  exit 1
fi

assert_eq() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  if [ "$actual" != "$expected" ]; then
    echo "[smoke] FAIL $label: expected '$expected', got '$actual'"
    echo "--- bff log ---"; cat "$LOG_FILE"
    exit 1
  fi
  echo "[smoke] ok $label ($actual)"
}

# 1. Per-tenant device read.
echo "[smoke] asserting per-tenant device isolation"
DEVICES_A=$(curl -sf -H "Cookie: dt_oidc_session=$TOKEN_A" "http://localhost:$BFF_PORT/api/devices")
DEVICES_B=$(curl -sf -H "Cookie: dt_oidc_session=$TOKEN_B" "http://localhost:$BFF_PORT/api/devices")
DEVICES_C=$(curl -sf -H "Cookie: dt_oidc_session=$TOKEN_C" "http://localhost:$BFF_PORT/api/devices")

# Every device must carry its tenant id, and the count
# must match the per-tenant helper output (3 / 2 / 4
# machines respectively per V3.3 plan T5 step 5.1).
for tenant_token in "acme-corp:3:$DEVICES_A" "globex-ind:2:$DEVICES_B" "initech-llc:4:$DEVICES_C"; do
  IFS=: read -r tenant expected_count body <<< "$tenant_token"
  count=$(echo "$body" | jq 'length')
  bad=$(echo "$body" | jq --arg t "$tenant" '[.[] | select(.tenantId != $t)] | length')
  assert_eq "$count" "$expected_count" "tenant=$tenant device count"
  assert_eq "$bad" "0" "tenant=$tenant every device.tenantId matches"
done

# 2. Per-tenant scene id.
echo "[smoke] asserting per-tenant scene id"
SCENE_A=$(curl -sf -H "Cookie: dt_oidc_session=$TOKEN_A" "http://localhost:$BFF_PORT/api/scene")
SCENE_B=$(curl -sf -H "Cookie: dt_oidc_session=$TOKEN_B" "http://localhost:$BFF_PORT/api/scene")
SCENE_C=$(curl -sf -H "Cookie: dt_oidc_session=$TOKEN_C" "http://localhost:$BFF_PORT/api/scene")
assert_eq "$(echo "$SCENE_A" | jq -r '.id')" "acme-corp-scene" "scene id for acme-corp"
assert_eq "$(echo "$SCENE_B" | jq -r '.id')" "globex-ind-scene" "scene id for globex-ind"
assert_eq "$(echo "$SCENE_C" | jq -r '.id')" "initech-llc-scene" "scene id for initech-llc"
assert_eq "$(echo "$SCENE_A" | jq -r '.tenantId')" "acme-corp" "scene.tenantId for acme-corp"

# 3. Cross-tenant command: acme-corp token + globex-ind tenantId
# in body -> 403 TENANT_FORBIDDEN.
echo "[smoke] asserting cross-tenant command is rejected"
STATUS=$(curl -s -o /tmp/cross.json -w '%{http_code}' \
  -H "Cookie: dt_oidc_session=$TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"id":"smoke-1","type":"reset-view","tenantId":"globex-ind"}' \
  "http://localhost:$BFF_PORT/api/commands")
assert_eq "$STATUS" "403" "cross-tenant command status"
assert_eq "$(jq -r '.error' < /tmp/cross.json)" "TENANT_FORBIDDEN" "cross-tenant command error code"

# 3b. Same-tenant command: acme-corp token + acme-corp tenantId
# -> 200. Asserts the previous rejection is not just "all
# commands 403".
STATUS=$(curl -s -o /tmp/same.json -w '%{http_code}' \
  -H "Cookie: dt_oidc_session=$TOKEN_A" \
  -H 'Content-Type: application/json' \
  -d '{"id":"smoke-2","type":"reset-view","tenantId":"acme-corp"}' \
  "http://localhost:$BFF_PORT/api/commands")
assert_eq "$STATUS" "200" "same-tenant command status"
assert_eq "$(jq -r '.accepted' < /tmp/same.json)" "true" "same-tenant command accepted"

# 4. Token without tenant claim -> 401 AUTH_NO_TENANT on
# every tenant-scoped route.
echo "[smoke] asserting no-tenant token is rejected"
for path in /api/devices /api/scene; do
  STATUS=$(curl -s -o /tmp/notenant.json -w '%{http_code}' \
    -H "Cookie: dt_oidc_session=$TOKEN_NOTENANT" \
    "http://localhost:$BFF_PORT$path")
  assert_eq "$STATUS" "401" "no-tenant token GET $path status"
  assert_eq "$(jq -r '.error' < /tmp/notenant.json)" "AUTH_NO_TENANT" "no-tenant token GET $path error"
done
STATUS=$(curl -s -o /tmp/notenant.json -w '%{http_code}' \
  -H "Cookie: dt_oidc_session=$TOKEN_NOTENANT" \
  -H 'Content-Type: application/json' \
  -d '{"id":"smoke-3","type":"reset-view","tenantId":"acme-corp"}' \
  "http://localhost:$BFF_PORT/api/commands")
assert_eq "$STATUS" "401" "no-tenant token POST /api/commands status"
assert_eq "$(jq -r '.error' < /tmp/notenant.json)" "AUTH_NO_TENANT" "no-tenant token POST /api/commands error"

# Cleanup temp bodies.
rm -f /tmp/cross.json /tmp/same.json /tmp/notenant.json

echo "[smoke] smoke:tenant PASS"
