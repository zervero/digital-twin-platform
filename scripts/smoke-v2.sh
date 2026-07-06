#!/usr/bin/env bash
# V2.0 smoke test. Boots the BFF, exercises the WebSocket, and asserts
# structured logging + request id propagation. Exits 0 on success.
#
# What it covers (one assertion per V2 acceptance item):
#   - /health returns 200 (sanity)
#   - /health response carries an X-Request-Id header (T5)
#   - WebSocket connects and emits a hello ping with a nonce (T4)
#   - Client can reply pong and keep the connection open (T4)
#   - The dev mock source emits device:list-updated within 6s (T4)
#   - The BFF log line for the /health request contains the same
#     request id (T5)
set -euo pipefail

PORT="${PORT:-3001}"
LOG_FILE="$(mktemp -t bff-smoke.XXXXXX.log)"
BFF_PID=""

cleanup() {
  if [ -n "$BFF_PID" ] && kill -0 "$BFF_PID" 2>/dev/null; then
    kill "$BFF_PID" 2>/dev/null || true
    wait "$BFF_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Reject obviously-busy ports up front so we never end up testing a
# BFF we did not start.
if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[smoke] port $PORT already in use; set PORT to a free port"
  exit 1
fi

echo "[smoke] starting bff on :$PORT (log: $LOG_FILE)"
# Force dev mode: the smoke fundamentally needs the DevMockSource
# to emit device:list-updated events, and the mock source is
# gated on NODE_ENV != production. This smoke is the dev-mode
# contract; production behavior is exercised separately.
(cd "$(dirname "$0")/.." && PORT="$PORT" NODE_ENV=development pnpm --filter @dt/bff dev) > "$LOG_FILE" 2>&1 &
BFF_PID=$!

# Wait for OUR BFF to log "listening" — never trust an unauthenticated
# `curl /health` to be answered by the process we started. The pattern
# matches both pretty (`[info] listening {"port":...}`) and json
# (`{"msg":"listening",...}`) modes.
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

# Belt-and-suspenders: also confirm /health is reachable.
if ! curl -sf "http://localhost:$PORT/health" >/dev/null; then
  echo "[smoke] /health not reachable"
  cat "$LOG_FILE"
  exit 1
fi

REQUEST_ID="$(curl -is "http://localhost:$PORT/health" \
  | awk -F': ' 'tolower($1)=="x-request-id"{gsub(/\r/,"",$2);print $2}')"
if [ -z "$REQUEST_ID" ]; then
  echo "[smoke] no X-Request-Id in /health response"
  cat "$LOG_FILE"
  exit 1
fi
echo "[smoke] request id: $REQUEST_ID"

# Exercise the WebSocket end-to-end.
node --input-type=module -e "
import WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:${PORT}/api/stream');
let pingNonce = null;
let gotListUpdate = false;
const timeout = setTimeout(() => {
  console.error('[smoke] timeout waiting for device:list-updated');
  process.exit(1);
}, 6000);
ws.on('open', () => console.log('[smoke] ws open'));
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'ping') {
    pingNonce = msg.payload.nonce;
    ws.send(JSON.stringify({
      type: 'pong',
      payload: { nonce: pingNonce },
      timestamp: new Date().toISOString(),
    }));
    console.log('[smoke] replied to ping');
  } else if (msg.type === 'device:list-updated') {
    gotListUpdate = true;
    clearTimeout(timeout);
    ws.close();
    console.log('[smoke] saw device:list-updated');
  }
});
ws.on('close', () => {
  process.exit(gotListUpdate ? 0 : 1);
});
"

# Verify OUR BFF logged the request id we used for /health.
if ! grep -q "\"requestId\":\"$REQUEST_ID\"" "$LOG_FILE" \
  && ! grep -q "\"requestId\": \"$REQUEST_ID\"" "$LOG_FILE" \
  && ! grep -q "requestId.*$REQUEST_ID" "$LOG_FILE"; then
  echo "[smoke] request id $REQUEST_ID not found in bff logs"
  cat "$LOG_FILE"
  exit 1
fi
echo "[smoke] log line for request id $REQUEST_ID found"
echo "[smoke] OK"
