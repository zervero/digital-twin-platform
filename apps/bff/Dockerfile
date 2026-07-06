# syntax=docker/dockerfile:1.7
#
# Multi-stage Dockerfile for apps/bff.
#
# V2.3 design notes:
# - V1 workspace packages are explicitly "type-only" (their `main` points
#   at `src/index.ts`, their `dist/` is a placeholder). The BFF's compiled
#   `dist/index.js` can't `import` those `.ts` files without a loader.
# - We use `tsx` at runtime to load the BFF's workspace deps as TS source,
#   matching the V1 design. The BFF's own `src/index.ts` is loaded the same
#   way (no separate `pnpm build` step needed in the runtime).
# - `pnpm deploy --legacy --prod` produces a self-contained folder with the
#   BFF source + its workspace deps + prod runtime deps.
# - `tsx` is a devDep in `apps/bff/package.json`, so it was stripped by
#   `pnpm deploy --prod`. We layer it on top from a separate side directory
#   (`/opt/tsx`) so the install there doesn't trip over the workspace:*
#   protocol in the deployed package.json. We invoke `/opt/tsx/node_modules
#   /.bin/tsx` directly rather than via `node --import tsx` because the
#   latter's ESM resolution doesn't reliably honor NODE_PATH.
# - `tini` is PID 1 so SIGTERM is forwarded to node (the `shutdown()` path
#   in `src/index.ts` depends on this — see T2 of the V2.3 plan).

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /repo
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY . .

RUN corepack enable \
  && pnpm install --frozen-lockfile \
  && pnpm deploy --filter=@dt/bff --legacy --prod /deploy

# ---- runtime ----
FROM node:22-alpine AS runtime
RUN apk add --no-cache tini wget
WORKDIR /app

# Install tsx in a side directory so its package.json (a tiny throwaway)
# doesn't conflict with the deployed package's workspace:* deps.
# esbuild is tsx's transitive runtime dep and gets pulled in automatically.
RUN mkdir -p /opt/tsx && cd /opt/tsx \
  && echo '{"name":"tsx-runtime","version":"0.0.0","private":true}' > package.json \
  && npm install --no-save --no-audit --no-fund tsx@^4.19.2 \
  && npm cache clean --force

ENV NODE_ENV=production \
    PORT=3001 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Copy the deployed folder (BFF source + @dt/* deps as TS + prod node_modules).
COPY --from=builder /deploy ./

# docker-entrypoint.sh re-validates AUTH_PROVIDER in production before
# exec'ing the CMD, so a misconfigured env fails fast with a clear log.
COPY apps/bff/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Non-root user.
RUN addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app /opt/tsx
USER app

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/app/docker-entrypoint.sh"]
CMD ["/opt/tsx/node_modules/.bin/tsx", "/app/src/index.ts"]
