#!/bin/sh
# Runs (via the nginx:alpine entrypoint) BEFORE nginx starts. Generates the
# SPA's runtime config + a CSP naming the deployment's API/IdP origins, so one
# built image serves any deployment.
#
#   FDP_API_URL            absolute API origin, e.g. https://fdp.example  (default "/")
#   FDP_PUBLIC_ORIGIN      this SPA's own origin (OIDC redirect base)
#   FDP_IDP_ORIGIN         OIDC provider origin for connect-src (optional)
#
# Look & feel (white-labeling — a CLIENT deployment concern; the server is not
# involved). Set these in the *client* service of your compose file:
#
#   FDP_BRANDING           JSON for window.__FDP_CONFIG__.branding — the full
#                          palette (theme/themeDark colors) plus logo/favicon/org.
#                          Generate it with the in-app Appearance editor
#                          (/appearance → "Docker env"). Validated below; an
#                          invalid value is dropped (with a warning), never
#                          injected — the client still boots with the default look.
#   FDP_BRANDING_ORG_NAME  } discrete identity overrides — convenient single
#   FDP_BRANDING_LOGO_URL  } strings for compose. Each, when set, overrides the
#   FDP_BRANDING_LOGO_URL_DARK    } matching key in FDP_BRANDING. (Colors are a
#   FDP_BRANDING_FAVICON_URL      } coordinated token family, so they live in
#   FDP_BRANDING_FAVICON_URL_DARK } FDP_BRANDING, not as discrete vars.)
#   FDP_BRANDING_IMG_ORIGIN  extra origin(s) for the CSP img-src, space-separated,
#                          ONLY if logos/favicons are hosted off-origin (a CDN).
#                          Same-origin assets and data: URIs need nothing here.
set -eu

API_URL="${FDP_API_URL:-/}"
PUBLIC_ORIGIN="${FDP_PUBLIC_ORIGIN:-}"
IDP_ORIGIN="${FDP_IDP_ORIGIN:-}"
IMG_ORIGIN="${FDP_BRANDING_IMG_ORIGIN:-}"

# Assemble branding with jq so the emitted JSON is always valid: validate the
# FDP_BRANDING base, then merge discrete identity vars over it (discrete wins).
# An invalid base is dropped (not injected) WITH an explanation, so a typo can
# never produce a broken config.js — the client just boots with the default look.
BRANDING_BASE="${FDP_BRANDING:-}"
if [ -n "$BRANDING_BASE" ]; then
  # Require a JSON object; capture jq's parse error to explain what's wrong.
  if ! BRANDING_ERR="$(printf '%s' "$BRANDING_BASE" \
      | jq -e 'if type == "object" then empty else error("FDP_BRANDING must be a JSON object, got a " + type) end' 2>&1 >/dev/null)"; then
    echo "[fdp] ERROR: FDP_BRANDING is invalid and was IGNORED (the client will use the default look & feel)." >&2
    echo "[fdp]   reason: ${BRANDING_ERR:-could not parse as JSON}" >&2
    echo "[fdp]   value : ${BRANDING_BASE}" >&2
    echo "[fdp]   fix   : generate a valid value with the in-app Appearance editor (/appearance -> Docker env)," >&2
    echo "[fdp]           and check your compose quoting — wrap the whole JSON in single quotes." >&2
    BRANDING_BASE=""
  fi
fi
[ -n "$BRANDING_BASE" ] || BRANDING_BASE="{}"

# Overlay = the discrete identity vars that are actually set (drop empties).
OVERLAY="$(jq -n \
  --arg orgName "${FDP_BRANDING_ORG_NAME:-}" \
  --arg logoUrl "${FDP_BRANDING_LOGO_URL:-}" \
  --arg logoUrlDark "${FDP_BRANDING_LOGO_URL_DARK:-}" \
  --arg faviconUrl "${FDP_BRANDING_FAVICON_URL:-}" \
  --arg faviconUrlDark "${FDP_BRANDING_FAVICON_URL_DARK:-}" \
  '{orgName:$orgName, logoUrl:$logoUrl, logoUrlDark:$logoUrlDark, faviconUrl:$faviconUrl, faviconUrlDark:$faviconUrlDark}
   | with_entries(select(.value != ""))')"

# Shallow-merge (overlay wins); theme/themeDark from the base are preserved.
BRANDING_JSON="$(printf '%s' "$BRANDING_BASE" | jq -c --argjson ov "$OVERLAY" '. + $ov')"
if [ "$BRANDING_JSON" = "{}" ]; then
  BRANDING_FIELD=""
else
  BRANDING_FIELD=", branding: ${BRANDING_JSON}"
fi

# 1) Runtime config the SPA reads (window.__FDP_CONFIG__) — see src/runtimeConfig.ts.
cat > /usr/share/nginx/html/config.js <<EOF
window.__FDP_CONFIG__ = { apiUrl: "${API_URL}", publicOrigin: "${PUBLIC_ORIGIN}"${BRANDING_FIELD} };
EOF

# 2) CSP: allow XHR/fetch to the API (and IdP token/JWKS endpoints) cross-origin,
#    plus any off-origin image host for a white-label logo/favicon.
cat > /etc/nginx/fdp-headers.conf <<EOF
add_header Content-Security-Policy "default-src 'self'; connect-src 'self' ${API_URL} ${IDP_ORIGIN}; img-src 'self' data: ${IMG_ORIGIN}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" always;
EOF

echo "[fdp] runtime config: apiUrl=${API_URL} publicOrigin=${PUBLIC_ORIGIN} idp=${IDP_ORIGIN} branding=$([ -n "$BRANDING_FIELD" ] && echo yes || echo no)"
