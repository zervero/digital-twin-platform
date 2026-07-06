#!/bin/sh
# Web entrypoint. Substitutes $BFF_UPSTREAM into the nginx
# config (envsubst) before exec'ing nginx. We pass
# '${BFF_UPSTREAM}' explicitly so nginx's runtime variables
# ($host, $scheme, $remote_addr, ...) are left alone.
set -eu

: "${BFF_UPSTREAM:=http://bff:3001}"
export BFF_UPSTREAM

envsubst '${BFF_UPSTREAM}' \
  < /etc/nginx/templates/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

exec "$@"
