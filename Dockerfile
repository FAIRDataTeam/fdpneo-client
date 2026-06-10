# syntax=docker/dockerfile:1
#
# FDP client image — build the Vite SPA, serve the static bundle with nginx.
# The API origin is injected at RUNTIME (config.js + CSP) by the entrypoint
# script, so one image is reusable across deployments.

# --- build: compile + type-check the SPA -------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Dependency layer (cached unless package*.json change).
COPY package.json package-lock.json ./
RUN npm ci

# Sources, then build (vue-tsc type-check + vite build → dist/). VITE_* are left
# unset; the runtime config supplies the API origin instead of baking it in.
COPY . .
RUN npm run build

# --- runtime: nginx serving the static bundle --------------------------------
FROM nginx:1.27-alpine AS runtime

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/fdp-headers.conf /etc/nginx/fdp-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html

# nginx:alpine runs every /docker-entrypoint.d/*.sh before starting nginx.
COPY deploy/docker-entrypoint.d/40-fdp-config.sh /docker-entrypoint.d/40-fdp-config.sh
RUN chmod +x /docker-entrypoint.d/40-fdp-config.sh

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=6 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
