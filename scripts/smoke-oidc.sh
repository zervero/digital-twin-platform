#!/usr/bin/env bash
# V3.0 OIDC smoke. Boots the dev IdP + BFF and exercises the
# full OIDC code + token exchange to confirm:
#   - IdP discovery + JWKS are served correctly
#   - /api/auth/oidc/start redirects to the IdP with state + PKCE
#   - The IdP issues a real id_token via the Authorization Code
#     + PKCE flow
#   - With the id_token in the dt_oidc_session cookie,
#     /api/auth/me returns the authenticated session
#   - With that cookie, /api/devices returns 200
#
# This is a development / CI convenience. Production runs
# against a real IdP via the OIDC_* env vars; the same BFF
# code path is exercised.
set -euo pipefail

BFF_PORT="${BFF_PORT:-3001}"
OIDC_PORT="${OIDC_PORT:-9999}"
LOG_FILE="$(mktemp -t bff-oidc-smoke.XXXXXX.log)"
IDP_LOG="$(mktemp -t idp-smoke.XXXXXX.log)"
COOKIE_JAR="$(mktemp)"
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
  OIDC_SCOPES="openid profile device:read scene:read" \
  pnpm --filter @dt/bff dev) > "$LOG_FILE" 2>&1 &
BFF_PID=$!

for _ in $(seq 1 40); do
  if grep -q 'dev-oidc' "$IDP_LOG" 2>/dev/null; then break; fi
  sleep 0.25
done
if ! grep -q 'dev-oidc' "$IDP_LOG" 2>/dev/null; then
  echo "[smoke] idp never logged ready"
  cat "$IDP_LOG"
  exit 1
fi

for _ in $(seq 1 60); do
  if grep -Eq '(listening|"msg":"listening")' "$LOG_FILE" 2>/dev/null; then break; fi
  sleep 0.5
done
if ! grep -Eq '(listening|"msg":"listening")' "$LOG_FILE" 2>/dev/null; then
  echo "[smoke] bff never logged listening"
  cat "$LOG_FILE"
  exit 1
fi

# 1. IdP discovery.
DISC="$(curl -sf "http://localhost:$OIDC_PORT/.well-known/openid-configuration")"
echo "$DISC" | grep -q '"authorization_endpoint"' || { echo "[smoke] discovery missing authorization_endpoint"; cat "$IDP_LOG"; exit 1; }
echo "$DISC" | grep -q '"token_endpoint"' || { echo "[smoke] discovery missing token_endpoint"; cat "$IDP_LOG"; exit 1; }
echo "[smoke] idp discovery OK"

# 2. /api/auth/oidc/start -> IdP authorize (with state + PKCE).
START_HEADERS="$(curl -s -D - -o /dev/null -c "$COOKIE_JAR" \
  "http://localhost:$BFF_PORT/api/auth/oidc/start")"
echo "$START_HEADERS" | grep -q "^HTTP/.* 302" || { echo "[smoke] /start did not return 302"; echo "$START_HEADERS"; cat "$LOG_FILE"; exit 1; }
LOCATION="$(printf '%s' "$START_HEADERS" | awk 'tolower($1) == "location:" { print $2 }' | tr -d '\r\n')"
echo "$LOCATION" | grep -q "localhost:$OIDC_PORT/authorize" || { echo "[smoke] /start did not redirect to idp; got: $LOCATION"; exit 1; }
echo "$LOCATION" | grep -q "code_challenge_method=S256" || { echo "[smoke] /start missing PKCE S256 challenge"; exit 1; }
echo "$LOCATION" | grep -q "state=" || { echo "[smoke] /start missing state param"; exit 1; }
echo "[smoke] /start -> idp authorize with state + PKCE"

# Extract code_verifier + state from the cookie jar.
STATE_COOKIE="$(grep 'dt_oidc_state' "$COOKIE_JAR" | awk '{print $7}')"
VERIFIER_COOKIE="$(grep 'dt_oidc_verifier' "$COOKIE_JAR" | awk '{print $7}')"
[ -n "$STATE_COOKIE" ] || { echo "[smoke] /start did not set state cookie"; cat "$COOKIE_JAR"; exit 1; }
[ -n "$VERIFIER_COOKIE" ] || { echo "[smoke] /start did not set verifier cookie"; cat "$COOKIE_JAR"; exit 1; }
echo "[smoke] /start set state + verifier cookies"

# 3. Drive the IdP /authorize directly (bypassing the user's
#    browser) to get an authorization code. The IdP redirects
#    back to the redirect_uri with code + state. We capture
#    the Location header to extract the code.
AUTH_URL="$LOCATION&as=admin@example.com"
AUTH_LOC="$(curl -s -D - -o /dev/null "$AUTH_URL" | awk 'tolower($1) == "location:" { print $2 }' | tr -d '\r\n')"
CODE="$(printf '%s' "$AUTH_LOC" | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')"
echo "$CODE" | grep -q . || { echo "[smoke] /authorize did not return a code; loc=$AUTH_LOC"; cat "$IDP_LOG"; exit 1; }
echo "[smoke] idp /authorize -> code"

# 4. Exchange code + verifier at the IdP /token to get the
#    real id_token.
TOKEN_RES="$(curl -sf -X POST \
  -d "grant_type=authorization_code" \
  -d "code=$CODE" \
  -d "client_id=digital-twin" \
  -d "code_verifier=$VERIFIER_COOKIE" \
  "http://localhost:$OIDC_PORT/token")"
ID_TOKEN="$(printf '%s' "$TOKEN_RES" | node -e '
let buf = "";
process.stdin.on("data", c => buf += c);
process.stdin.on("end", () => {
  const j = JSON.parse(buf);
  process.stdout.write(j.id_token || "");
});
')"
[ -n "$ID_TOKEN" ] || { echo "[smoke] /token did not return id_token; res=$TOKEN_RES"; exit 1; }
echo "[smoke] idp /token -> id_token (${#ID_TOKEN} chars)"

# 5. /api/auth/me with dt_oidc_session=ID_TOKEN should return
#    a populated session.
ME_RES="$(curl -sf -H "cookie: dt_oidc_session=$ID_TOKEN" \
  "http://localhost:$BFF_PORT/api/auth/me")"
echo "$ME_RES" | grep -q '"email":"admin@example.com"' \
  || { echo "[smoke] /me did not echo admin email; res=$ME_RES"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] /me with id_token cookie -> admin session"

# 6. /api/devices with the same cookie should return 200
#    (admin token has device:read + device:write).
DEVICES_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "cookie: dt_oidc_session=$ID_TOKEN" \
  "http://localhost:$BFF_PORT/api/devices")"
[ "$DEVICES_STATUS" = "200" ] \
  || { echo "[smoke] /api/devices with admin token expected 200, got $DEVICES_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] /api/devices with admin token -> 200"

# 7. /api/devices with no cookie should return 401 (proves
#    the OIDC session gating actually fires).
ANON_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  "http://localhost:$BFF_PORT/api/devices")"
[ "$ANON_STATUS" = "401" ] \
  || { echo "[smoke] /api/devices anon expected 401, got $ANON_STATUS"; exit 1; }
echo "[smoke] /api/devices anonymous -> 401"

# 8. Same /api/devices with a viewer-only id_token should
#    also return 200 (viewer has device:read), but
#    /api/commands should return 403 (viewer lacks command:send).
VIEWER_TOKEN="$(curl -sf -X POST \
  -d "grant_type=authorization_code" \
  -d "code=$CODE" \
  -d "client_id=digital-twin" \
  -d "code_verifier=$VERIFIER_COOKIE" \
  "http://localhost:$OIDC_PORT/token" > /dev/null; \
  curl -sf -X POST \
  -d "grant_type=authorization_code" \
  -d "code=$CODE" \
  -d "client_id=digital-twin" \
  -d "code_verifier=$VERIFIER_COOKIE" \
  "http://localhost:$OIDC_PORT/token" | node -e '
let buf = "";
process.stdin.on("data", c => buf += c);
process.stdin.on("end", () => {
  // Each call returns a fresh id_token; the IdP drops the
  // code after the first exchange. So the second call here
  // fails with invalid_grant; reuse the original.
  process.stdout.write("");
});
')" || true
# Easier: use a fresh authorize->token round-trip for the viewer.
rm -f "$COOKIE_JAR"
curl -s -D - -o /dev/null -c "$COOKIE_JAR" \
  "http://localhost:$BFF_PORT/api/auth/oidc/start" > /dev/null
STATE_COOKIE="$(grep 'dt_oidc_state' "$COOKIE_JAR" | awk '{print $7}')"
VERIFIER_COOKIE="$(grep 'dt_oidc_verifier' "$COOKIE_JAR" | awk '{print $7}')"
START_LOC="$(curl -s -D - -o /dev/null \
  -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  "http://localhost:$BFF_PORT/api/auth/oidc/start" \
  | awk 'tolower($1) == "location:" { print $2 }' | tr -d '\r\n')"
VIEWER_AUTH_LOC="$(curl -s -D - -o /dev/null \
  "${START_LOC}&as=viewer@example.com" \
  | awk 'tolower($1) == "location:" { print $2 }' | tr -d '\r\n')"
VIEWER_CODE="$(printf '%s' "$VIEWER_AUTH_LOC" | sed -n 's/.*[?&]code=\([^&]*\).*/\1/p')"
VIEWER_TOKEN="$(curl -sf -X POST \
  -d "grant_type=authorization_code" \
  -d "code=$VIEWER_CODE" \
  -d "client_id=digital-twin" \
  -d "code_verifier=$VERIFIER_COOKIE" \
  "http://localhost:$OIDC_PORT/token" \
  | node -e '
let buf = "";
process.stdin.on("data", c => buf += c);
process.stdin.on("end", () => { const j = JSON.parse(buf); process.stdout.write(j.id_token || ""); });
')"
[ -n "$VIEWER_TOKEN" ] || { echo "[smoke] viewer token round-trip failed"; cat "$IDP_LOG"; exit 1; }
VIEWER_DEVICES_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "cookie: dt_oidc_session=$VIEWER_TOKEN" \
  "http://localhost:$BFF_PORT/api/devices")"
[ "$VIEWER_DEVICES_STATUS" = "200" ] \
  || { echo "[smoke] /api/devices with viewer token expected 200, got $VIEWER_DEVICES_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] /api/devices with viewer token -> 200"

VIEWER_CMD_STATUS="$(curl -s -o /dev/null -w '%{http_code}' \
  -X POST -H "cookie: dt_oidc_session=$VIEWER_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"id":"c1","type":"reset-view"}' \
  "http://localhost:$BFF_PORT/api/commands")"
[ "$VIEWER_CMD_STATUS" = "403" ] \
  || { echo "[smoke] /api/commands with viewer token expected 403, got $VIEWER_CMD_STATUS"; cat "$LOG_FILE"; exit 1; }
echo "[smoke] /api/commands with viewer token -> 403"

echo "[smoke] OK"
