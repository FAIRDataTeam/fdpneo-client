#!/bin/sh
# Runs (via the nginx:alpine entrypoint) BEFORE nginx starts. Generates the
# SPA's runtime config + a CSP naming the deployment's API/IdP origins, so one
# built image serves any deployment.
#
#   FDP_API_URL       absolute API origin, e.g. https://fdp.example  (default "/")
#   FDP_PUBLIC_ORIGIN this SPA's own origin (OIDC redirect base)
#   FDP_IDP_ORIGIN    OIDC provider origin for connect-src (optional)
set -eu

API_URL="${FDP_API_URL:-/}"
PUBLIC_ORIGIN="${FDP_PUBLIC_ORIGIN:-}"
IDP_ORIGIN="${FDP_IDP_ORIGIN:-}"

# 1) Runtime config the SPA reads (window.__FDP_CONFIG__) — see src/runtimeConfig.ts.
cat > /usr/share/nginx/html/config.js <<EOF
window.__FDP_CONFIG__ = { apiUrl: "${API_URL}", publicOrigin: "${PUBLIC_ORIGIN}" };
EOF

# 2) CSP: allow XHR/fetch to the API (and IdP token/JWKS endpoints) cross-origin.
cat > /etc/nginx/fdp-headers.conf <<EOF
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' ${API_URL} ${IDP_ORIGIN}; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" always;
EOF

echo "[fdp] runtime config: apiUrl=${API_URL} publicOrigin=${PUBLIC_ORIGIN} idp=${IDP_ORIGIN}"
