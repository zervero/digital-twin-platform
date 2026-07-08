#!/usr/bin/env bash
# V3.0 permissions smoke. Boots the BFF in dev mode, exercises
# the V3.0 permission middleware on /api/devices, /api/scene,
# /api/commands, and /api/auth/me. Exits 0 on success.
#
# What it covers (one assertion per V3.0 acceptance item):
#   - GET /api/devices without a session returns 401
#   - GET /api/devices with a viewer session returns 200
#   - GET /api/scene without a session returns 401
#   - GET /api/scene with a viewer session returns 200
#   - POST /api/commands with a viewer session returns 403
#     (viewer lacks command:send)
#   - POST /api/commands with an admin session returns 200
#     (admin has command:send)
#
# This script does NOT cover OIDC; the OIDC smoke is a
# separate script (smoke-oidc.sh, T7) because it needs a
# dev IdP.
set -euo pipefail

PORT="${PORT:-3001}"
LOG_FILE="$(mktemp -t bff-smoke-perms.XXXXXX.log)"
BFF_PID=""

cleanup() {
  if [ -n "$BFF_PID" ] && kill -0 "$BFF_PID" 2>/dev/null; then
    kill "$BFF_PID" 2>/dev/null || true
    wait "$BFF_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[smoke] port $PORT already in use; set PORT to a free port"
  exit 1
fi

echo "[smoke] starting bff on :$PORT (log: $LOG_FILE)"
(cd "$(dirname "$0")/.." && PORT="$PORT" NODE_ENV=development pnpm --filter @dt/bff dev) > "$LOG_FILE" 2>&1 &
BFF_PID=$!

for _ in $(seq 1 60); do
  if grep -Eq '(listening|"msg":"listening")' "$LOG_FILE" 2>/dev/null; then
    break
  fi
  sleep 0.5
done
if ! grep -Eq '(listening|"msg":"listening")' "$LOG_FILE" 2>/dev/null; then
  echo "[smoke] bff never logged 'listening'"
  cat "$LOG_FILE"
  exit 1
fi

extract_token() {
  node --input-type=module -e "
import process from 'node:process';
let buf = '';
process.stdin.on('data', (c) => buf += c);
process.stdin.on('end', () => {
  const j = JSON.parse(buf);
  process.stdout.write(j.session.token);
});
"
}

# 1. Anonymous /api/devices -> 401
ANON_DEVICES_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  "http://localhost:$PORT/api/devices")"
[ "$ANON_DEVICES_STATUS" = "401" ] \
  || { echo "[smoke] expected 401 on /api/devices (anonymous), got $ANON_DEVICES_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] GET /api/devices (anonymous) -> 401"

# 2. Viewer /api/devices -> 200
VIEWER_LOGIN="$(curl -sf -X POST -H 'content-type: application/json' \
  -d '{"email":"viewer@example.com"}' \
  "http://localhost:$PORT/api/auth/login")"
VIEWER_TOKEN="$(printf '%s' "$VIEWER_LOGIN" | extract_token)"
[ -n "$VIEWER_TOKEN" ] \
  || { echo "[smoke] viewer login returned no token"; cat "$LOG_FILE"; exit 1; }
VIEWER_DEVICES_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "authorization: Bearer $VIEWER_TOKEN" \
  "http://localhost:$PORT/api/devices")"
[ "$VIEWER_DEVICES_STATUS" = "200" ] \
  || { echo "[smoke] expected 200 on /api/devices (viewer), got $VIEWER_DEVICES_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] GET /api/devices (viewer) -> 200"

# 3. Anonymous /api/scene -> 401
ANON_SCENE_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  "http://localhost:$PORT/api/scene")"
[ "$ANON_SCENE_STATUS" = "401" ] \
  || { echo "[smoke] expected 401 on /api/scene (anonymous), got $ANON_SCENE_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] GET /api/scene (anonymous) -> 401"

# 4. Viewer /api/scene -> 200
VIEWER_SCENE_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "authorization: Bearer $VIEWER_TOKEN" \
  "http://localhost:$PORT/api/scene")"
[ "$VIEWER_SCENE_STATUS" = "200" ] \
  || { echo "[smoke] expected 200 on /api/scene (viewer), got $VIEWER_SCENE_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] GET /api/scene (viewer) -> 200"

# 5. Viewer POST /api/commands -> 403 (lacks command:send)
VIEWER_CMD_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST -H "authorization: Bearer $VIEWER_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"id":"c1","type":"reset-view","tenantId":"acme-corp"}' \
  "http://localhost:$PORT/api/commands")"
[ "$VIEWER_CMD_STATUS" = "403" ] \
  || { echo "[smoke] expected 403 on /api/commands (viewer), got $VIEWER_CMD_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] POST /api/commands (viewer) -> 403"

# 6. Admin POST /api/commands -> 200
ADMIN_LOGIN="$(curl -sf -X POST -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","roles":["admin"]}' \
  "http://localhost:$PORT/api/auth/login")"
ADMIN_TOKEN="$(printf '%s' "$ADMIN_LOGIN" | extract_token)"
[ -n "$ADMIN_TOKEN" ] \
  || { echo "[smoke] admin login returned no token"; cat "$LOG_FILE"; exit 1; }
ADMIN_CMD_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST -H "authorization: Bearer $ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"id":"c1","type":"reset-view","tenantId":"acme-corp"}' \
  "http://localhost:$PORT/api/commands")"
[ "$ADMIN_CMD_STATUS" = "200" ] \
  || { echo "[smoke] expected 200 on /api/commands (admin), got $ADMIN_CMD_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] POST /api/commands (admin) -> 200"

echo "[smoke] OK"
