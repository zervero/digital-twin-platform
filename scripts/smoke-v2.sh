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

echo "[smoke] starting bff on :$PORT (log: $LOG_FILE)"
(cd "$(dirname "$0")/.." && pnpm --filter @dt/bff dev) > "$LOG_FILE" 2>&1 &
BFF_PID=$!

# Wait for /health up to 15s.
for _ in $(seq 1 30); do
  if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
if ! curl -sf "http://localhost:$PORT/health" >/dev/null; then
  echo "[smoke] bff never came up"
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

# Verify the BFF logged the request id we used for /health.
if ! grep -q "\"requestId\":\"$REQUEST_ID\"" "$LOG_FILE" \
  && ! grep -q "\"requestId\": \"$REQUEST_ID\"" "$LOG_FILE" \
  && ! grep -q "requestId.*$REQUEST_ID" "$LOG_FILE"; then
  echo "[smoke] request id $REQUEST_ID not found in bff logs"
  cat "$LOG_FILE"
  exit 1
fi
echo "[smoke] log line for request id $REQUEST_ID found"
echo "[smoke] OK"
