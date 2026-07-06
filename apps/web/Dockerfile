# syntax=docker/dockerfile:1.7
#
# Multi-stage Dockerfile for apps/web.
#
# V2.3 design notes:
# - Builder uses `pnpm turbo run build --filter=@dt/web...` so the
#   ^build dependency chain (notably @dt/ui-kit, which copies
#   tokens.css into dist/ for `import "@dt/ui-kit/styles"` to resolve)
#   runs in order. Vite + vue-tsc consume the V1 type-only workspace
#   packages as TS source natively.
# - Runtime is nginx:1.27-alpine. We wipe the default html and
#   default.conf, drop in our build, and ship an envsubst-driven
#   nginx config so $BFF_UPSTREAM can be set per environment
#   (compose sets it to `http://bff:3001`).
# - nginx:alpine already includes `envsubst` (from gettext) and we
#   still ship our own entrypoint that explicitly substitutes
#   $BFF_UPSTREAM only — never the whole template — so nginx's
#   runtime vars ($host, $scheme, etc.) are not clobbered.
# - WebSocket upgrade headers cover /api/stream (V2.0 realtime).
#   No separate location block needed.
# - .dockerignore lives at the repo root (shared with apps/bff in
#   T3); a per-app ignore would just duplicate it.

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /repo
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY . .

RUN corepack enable \
  && pnpm install --frozen-lockfile \
  && pnpm turbo run build --filter=@dt/web...

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime

RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
