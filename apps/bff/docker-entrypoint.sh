#!/bin/sh
# BFF entrypoint. Re-validates AUTH_PROVIDER in production so a
# misconfigured env fails fast with a clear log line, then execs
# the CMD. The container's CMD runs the BFF under `node --import
# tsx` so the V1 type-only workspace packages can be loaded as
# TypeScript source.
#
# This is a belt-and-suspenders check: `readAppEnv` (T1) already
# throws `EnvValidationError` if AUTH_PROVIDER is missing in
# production. We duplicate the check here so a future refactor
# that drops the production gate in readAppEnv still surfaces a
# clear error before the node process boots.
set -eu

if [ "${NODE_ENV:-}" = "production" ] && [ -z "${AUTH_PROVIDER:-}" ]; then
  echo "[bff] FATAL: AUTH_PROVIDER is required in production (allowed: mock|oidc)" >&2
  exit 1
fi

exec "$@"
