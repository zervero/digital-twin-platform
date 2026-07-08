#!/usr/bin/env bash
# V3.4 Marketplace smoke -- T8.
#
# Boots the BFF in mock auth mode with a generated dev
# signing secret, then exercises the full marketplace
# surface end-to-end against the freshly-built BFF:
#
#   1. admin publishes hello-plugin@1.0.0 with a base64
#      artifact body.
#   2. operator cannot publish (403 PLUGIN_PERMISSION_DENIED).
#   3. admin installs hello-plugin@1.0.0 for acme-corp.
#   4. operator cannot install (403 PLUGIN_PERMISSION_DENIED).
#   5. admin lists installed -- one row, active=true.
#   6. admin publishes hello-plugin@1.1.0; admin installs
#      it; admin activates 1.1.0 (side-by-side upgrade).
#   7. admin uninstalls 1.0.0; 1.1.0 stays active.
#   8. admin uninstalls 1.1.0; no rows remain.
#
# The smoke uses the mock auth store (AUTH_PROVIDER=mock)
# and the file-based plugin store wired in V3.4 T4. The
# mock store stamps every dev session with the default
# `acme-corp` tenantId so the route's
# `requiresTenantScope` middleware is exercised end-to-end.
# `PLUGIN_SIGNING_SECRET` and `PLUGIN_STORAGE_ROOT` are
# passed explicitly so the smoke does not pick up a
# stale dev secret or storage dir from a previous run.
set -euo pipefail

BFF_PORT="${BFF_PORT:-3001}"
LOG_FILE="$(mktemp -t bff-marketplace-smoke.XXXXXX.log)"
BFF_PID=""
# 48-byte random dev secret. `PLUGIN_SIGNING_SECRET` only
# requires 32 bytes; the extra padding keeps the value
# comfortably above the threshold so a future bump to
# 64 bytes (e.g. for a real SHA-512 / GPG switch) does
# not silently break this script.
SIGNING_SECRET="$(openssl rand -base64 48)"

# Per-smoke storage root under the repo so the cleanup
# is a single `rm -rf` and the smoke does not race the
# dev `pnpm dev` instance for the same files.
STORAGE_ROOT="$(mktemp -d -t dtp-mp-smoke-XXXXXX)"

cleanup() {
  if [ -n "$BFF_PID" ] && kill -0 "$BFF_PID" 2>/dev/null; then
    kill "$BFF_PID" 2>/dev/null || true
    wait "$BFF_PID" 2>/dev/null || true
  fi
  rm -rf "$STORAGE_ROOT"
}
trap cleanup EXIT

if lsof -i ":$BFF_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[smoke] bff port $BFF_PORT already in use"
  exit 1
fi

echo "[smoke] starting bff on :$BFF_PORT (mock mode, dev signing secret)"
(cd "$(dirname "$0")/.." && \
  PORT="$BFF_PORT" \
  NODE_ENV=development \
  AUTH_PROVIDER=mock \
  PLUGIN_SIGNING_SECRET="$SIGNING_SECRET" \
  PLUGIN_STORAGE_ROOT="$STORAGE_ROOT" \
  pnpm --filter @dt/bff dev) > "$LOG_FILE" 2>&1 &
BFF_PID=$!

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

# Mint a session for an admin and an operator of acme-corp.
# The mock store stamps every session with tenantId
# 'acme-corp' (see apps/bff/src/auth/mock-store.ts), so
# both tokens are tenant-scoped to the same tenant. The
# role difference is what exercises the policy gate.
TOKEN_ADMIN=$(curl -s -X POST "http://localhost:$BFF_PORT/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","roles":["admin"]}' \
  | jq -r .session.token)
TOKEN_OP=$(curl -s -X POST "http://localhost:$BFF_PORT/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"op@example.com","roles":["operator"]}' \
  | jq -r .session.token)

# Sanity: both tokens should be non-empty.
if [ -z "$TOKEN_ADMIN" ] || [ -z "$TOKEN_OP" ]; then
  echo "[smoke] failed to mint mock sessions"
  cat "$LOG_FILE"
  exit 1
fi

assert_status() {
  local got="$1"
  local want="$2"
  local label="$3"
  if [ "$got" != "$want" ]; then
    echo "[smoke] FAIL $label: got status $got, want $want"
    cat "$LOG_FILE"
    exit 1
  fi
}

# 1. List registry (empty initially).
echo "[smoke] asserting empty registry"
LIST=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
  "http://localhost:$BFF_PORT/api/plugins")
test "$(echo "$LIST" | jq 'length')" = "0"

# 2. Publish a plugin version (admin only).
echo "[smoke] publishing hello-plugin@1.0.0"
ARTIFACT_B64="$(echo -n 'hello-plugin-payload-v1.0.0' | base64)"
MANIFEST='{"id":"hello-plugin","name":"Hello Plugin","version":"1.0.0","vendor":"Acme","permissions":["device:read"]}'
PUB=$(curl -s -X POST "http://localhost:$BFF_PORT/api/plugins" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H 'Content-Type: application/json' \
  -d "{\"manifest\":$MANIFEST,\"artifact\":\"$ARTIFACT_B64\"}")
test "$(echo "$PUB" | jq -r .version)" = "1.0.0"
test "$(echo "$PUB" | jq -r .pluginId)" = "hello-plugin"

# 2b. Operator cannot publish.
echo "[smoke] asserting operator cannot publish"
STATUS=$(curl -s -o /tmp/mp-op-pub.json -w '%{http_code}' -X POST \
  "http://localhost:$BFF_PORT/api/plugins" \
  -H "Authorization: Bearer $TOKEN_OP" \
  -H 'Content-Type: application/json' \
  -d "{\"manifest\":$MANIFEST,\"artifact\":\"$ARTIFACT_B64\"}")
assert_status "$STATUS" "403" "operator publish status"
test "$(jq -r .error < /tmp/mp-op-pub.json)" = "PLUGIN_PERMISSION_DENIED"
rm -f /tmp/mp-op-pub.json

# 3. Install for acme-corp.
echo "[smoke] installing hello-plugin@1.0.0 for acme-corp"
INSTALL=$(curl -s -X POST \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/install" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"pluginId":"hello-plugin","version":"1.0.0"}')
test "$(echo "$INSTALL" | jq -r .active)" = "true"
test "$(echo "$INSTALL" | jq -r .version)" = "1.0.0"
test "$(echo "$INSTALL" | jq -r .tenantId)" = "acme-corp"

# 4. Operator cannot install.
echo "[smoke] asserting operator cannot install"
STATUS=$(curl -s -o /tmp/mp-op-inst.json -w '%{http_code}' -X POST \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/install" \
  -H "Authorization: Bearer $TOKEN_OP" \
  -H 'Content-Type: application/json' \
  -d '{"pluginId":"hello-plugin","version":"1.0.0"}')
assert_status "$STATUS" "403" "operator install status"
test "$(jq -r .error < /tmp/mp-op-inst.json)" = "PLUGIN_PERMISSION_DENIED"
rm -f /tmp/mp-op-inst.json

# 5. List installed -- one row, active=true.
echo "[smoke] listing installed versions"
INSTALLED=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/installed")
test "$(echo "$INSTALLED" | jq 'length')" = "1"
test "$(echo "$INSTALLED" | jq -r '.[0].active')" = "true"
test "$(echo "$INSTALLED" | jq -r '.[0].version')" = "1.0.0"

# 6. Side-by-side upgrade: publish + install 1.1.0, then
# activate 1.1.0. After step 6, both versions are
# installed and 1.1.0 is the active one.
echo "[smoke] publishing + installing hello-plugin@1.1.0"
ARTIFACT_B64_V2="$(echo -n 'hello-plugin-payload-v1.1.0' | base64)"
MANIFEST_V2='{"id":"hello-plugin","name":"Hello Plugin","version":"1.1.0","vendor":"Acme","permissions":["device:read"]}'
curl -sf -X POST "http://localhost:$BFF_PORT/api/plugins" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H 'Content-Type: application/json' \
  -d "{\"manifest\":$MANIFEST_V2,\"artifact\":\"$ARTIFACT_B64_V2\"}" > /dev/null

curl -sf -X POST \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/install" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"pluginId":"hello-plugin","version":"1.1.0"}' > /dev/null

echo "[smoke] activating 1.1.0"
curl -sf -X PUT \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/activate" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"pluginId":"hello-plugin","version":"1.1.0"}' > /dev/null

INSTALLED=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/installed")
test "$(echo "$INSTALLED" | jq 'length')" = "2"
test "$(echo "$INSTALLED" | jq -r '[.[] | select(.active)] | .[0].version')" = '1.1.0'

# 7. Uninstall 1.0.0; 1.1.0 stays active.
echo "[smoke] uninstalling 1.0.0"
curl -sf -X DELETE \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/installed/1.0.0" \
  -H "Authorization: Bearer $TOKEN_ADMIN" > /dev/null

INSTALLED=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/installed")
test "$(echo "$INSTALLED" | jq 'length')" = "1"
test "$(echo "$INSTALLED" | jq -r '.[0].active')" = "true"
test "$(echo "$INSTALLED" | jq -r '.[0].version')" = "1.1.0"

# 8. Uninstall 1.1.0; no rows remain.
echo "[smoke] uninstalling 1.1.0"
curl -sf -X DELETE \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/installed/1.1.0" \
  -H "Authorization: Bearer $TOKEN_ADMIN" > /dev/null

INSTALLED=$(curl -s -H "Authorization: Bearer $TOKEN_ADMIN" \
  "http://localhost:$BFF_PORT/api/plugins/hello-plugin/installed")
test "$(echo "$INSTALLED" | jq 'length')" = "0"

echo "smoke:marketplace PASS"
