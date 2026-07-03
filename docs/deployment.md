# FAIR Data Point v2 — Deployment Guide

How to deploy a FAIR Data Point (FDP) v2 instance: the **client** (Vue 3 SPA),
the **server** (FastAPI), and the three backing services they require —
**GraphDB** (triple store), **PostgreSQL** (operational state), and **Keycloak**
(OIDC identity provider).

> This describes the reference v2 implementation in the `fdp-server` and
> `fdp-client` repositories. For the *usage* walkthrough (logging in, creating
> records, managing schemas/policies/users), see the [User Manual](./user-manual.md).

---

## 1. Architecture & components

An FDP deployment is five processes. The client and server are stateless; all
durable state lives in GraphDB and PostgreSQL.

| Component | Technology | Default port | Role |
|---|---|---|---|
| **fdp-client** | Vue 3 + TypeScript + Vite | `5173` (dev) / static build (prod) | The browser UI (SPA). Talks to the API and the IdP directly. |
| **fdp-server** | Python 3 + FastAPI (uvicorn) | `8000` | REST/LDP API + SPARQL endpoint. Validates bearer tokens; enforces ODRL access control. |
| **GraphDB** | Ontotext GraphDB 10.7 | `7200` | RDF triple store — all metadata records, schemas, policies, licenses. |
| **PostgreSQL** | PostgreSQL 16 | `5432` | Operational state: metrics, search index, authorization cache, audit log, saved queries, API keys. |
| **Keycloak** | Keycloak 25 | `8080` | OIDC provider. The FDP has **no internal user database** — identities live here. |

```
                 ┌────────────┐     OIDC login (Auth Code + PKCE)
   Browser ──────│ fdp-client │──────────────────────────────► Keycloak :8080
                 └─────┬──────┘                                      ▲
                       │ REST/LDP + SPARQL (Bearer token)            │ validates
                       ▼                                             │ tokens
                 ┌────────────┐         ┌──────────────┐            │
                 │ fdp-server │────────►│ GraphDB :7200│ (RDF)      │
                 │   :8000    │────────►│ Postgres:5432│ (state) ───┘
                 └────────────┘         └──────────────┘
```

Key design points (see the `fdp-server` architecture docs and ADRs for detail):

- **The server is not in the auth path.** The browser authenticates *directly*
  with Keycloak; the server only validates the bearer tokens it receives.
- **The client is stateless across reloads.** All persistent state is on the
  server. The SPA is a static bundle that can be served from any web server/CDN.
- **CORS-only networking.** The SPA calls the API cross-origin; there is no dev
  proxy. Three origins must agree (see [§7](#7-the-origin-coupling-important)).

---

## 2. Prerequisites

- **Docker** + **Docker Compose** (for the backing services).
- **[uv](https://docs.astral.sh/uv/)** (Python package manager) — for the server:
  `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Node.js ≥ 20** + **npm** — for the client.
- **git**.

---

## 3. Quick start (local development)

This brings up a complete, working FDP on `localhost` in ~5 minutes. Run it from
two clones side by side: `fdp-server/` and `fdp-client/`.

### 3.1 Start the backing services

```bash
cd fdp-server
docker compose -f deploy/compose.yaml up -d
docker compose -f deploy/compose.yaml ps   # wait until all are healthy
```

This starts **GraphDB** (`:7200`), **PostgreSQL** (`:5432`, `fdp/fdp/fdp`), and
**Keycloak** (`:8080`, `admin/admin`) with a pre-imported `fdp-dev` realm.
Credentials are **development-only**.

### 3.2 Create the GraphDB repository

The server expects a repository named `fdp`. Create it once:

1. Open the GraphDB workbench at <http://localhost:7200>.
2. **Setup → Repositories → Create new repository → GraphDB repository**.
3. Repository ID: `fdp`. Accept the defaults and create it.

(Alternatively, preload a repository config into `deploy/graphdb/preload/`.)

### 3.3 Configure and start the server

```bash
cd fdp-server
cp .env.example .env          # defaults already match the compose stack
uv sync --extra dev
uv run fdp db migrate         # apply database migrations (Alembic)
uv run fdp profile apply ./profiles/default   # seed schemas, the system Offer, etc.
uv run fastapi dev src/fdp/main.py            # serves on http://localhost:8000
```

Verify: `curl http://localhost:8000/healthz` → `OK`, and
`curl http://localhost:8000/config` returns the bootstrap JSON.

### 3.4 Configure and start the client

```bash
cd fdp-client
cp .env.example .env          # defaults match the server + Keycloak above
npm install
npm run dev                   # serves on http://localhost:5173
```

### 3.5 Use it

Open <http://localhost:5173>, click sign in, and log in with **`admin` / `admin`**
(an admin + steward dev user). See the [User Manual](./user-manual.md) for what to
do next.

---

## 4. Backing services in detail

### 4.1 GraphDB (triple store)

Holds all RDF metadata. The server is triple-store-agnostic (any
SPARQL 1.1 endpoint works — Fuseki, Oxigraph, …), but GraphDB is the recommended
default and the only one wired in the dev compose.

Server configuration (`FDP_TRIPLESTORE_*`):

| Variable | Example | Notes |
|---|---|---|
| `FDP_TRIPLESTORE_QUERY_ENDPOINT` | `http://localhost:7200/repositories/fdp` | SPARQL query endpoint (required) |
| `FDP_TRIPLESTORE_UPDATE_ENDPOINT` | `http://localhost:7200/repositories/fdp/statements` | SPARQL update endpoint (required) |
| `FDP_TRIPLESTORE_GRAPH_STORE_ENDPOINT` | `http://localhost:7200/repositories/fdp/rdf-graphs/service` | Graph Store protocol (optional, used for fast graph ingest/replace) |
| `FDP_TRIPLESTORE_USERNAME` / `_PASSWORD` | — | Set if the store requires auth (enable in production) |
| `FDP_TRIPLESTORE_SUPPORTS_REPOSITORY_MANAGEMENT` | `true` | GraphDB-only capability flag |

### 4.2 PostgreSQL (operational state)

Holds everything that isn't RDF: the metrics pipeline, the full-text **search
index**, the authorization cache, the audit log, saved SPARQL queries, and
API-key hashes. **If Postgres is down, search and the steward dashboard fail**
even though browsing still works.

| Variable | Example |
|---|---|
| `POSTGRES_DSN` | `postgresql+asyncpg://fdp:fdp@localhost:5432/fdp` |

Run migrations after any server upgrade: `uv run fdp db migrate`.

### 4.3 Keycloak (OIDC identity provider)

The FDP delegates **all** authentication to an external OIDC provider. The dev
compose imports a `fdp-dev` realm with:

- **Roles:** `admin`, `steward`.
- **Dev users** (passwords = usernames; **dev-only, publicly known**):

  | User | Password | Realm roles |
  |---|---|---|
  | `admin` | `admin` | `admin`, `steward` |
  | `alice` | `alice` | `steward` |
  | `bob` | `bob` | _(none — anonymous-equivalent)_ |

- **Clients:** `fdp-client` (public SPA, Authorization Code + PKCE) and
  `fdp-server` (confidential, service-account — used for the user-management
  facade, see [§6](#6-user-management-facade-optional)).
- An **audience mapper** that adds `fdp` to the access token's `aud` claim so the
  server accepts tokens issued to the client.

Server configuration (`FDP_OIDC_*`):

| Variable | Example | Notes |
|---|---|---|
| `FDP_OIDC_ISSUER` | `http://localhost:8080/realms/fdp-dev` | The realm issuer URL (required) |
| `FDP_OIDC_AUDIENCE` | `fdp` | Expected `aud` claim (required) |
| `FDP_OIDC_ROLES_CLAIM` | `realm_access.roles` | Dot-path to the roles array in the token |

> **Production:** replace the dev realm wholesale. Create the two clients, set
> real redirect URIs (your client origin), and provision users/roles. Never ship
> the dev realm or `admin/admin`.

---

## 5. Server configuration reference

Settings are read from environment variables (or a `.env` file) via
pydantic-settings. Copy `fdp-server/.env.example` and adjust. Groups:

| Prefix | Purpose | Key variables |
|---|---|---|
| _(top-level)_ | Core | `ENVIRONMENT` (`development`/`staging`/`production`), `BASE_URL` (public URL that mints resource IRIs), `POSTGRES_DSN`, `FDP_NAMESPACE` |
| `FDP_TRIPLESTORE_` | RDF store | query/update/graph-store endpoints, credentials, capability flags ([§4.1](#41-graphdb-triple-store)) |
| `FDP_OIDC_` | Authentication | `ISSUER`, `AUDIENCE`, `ROLES_CLAIM` ([§4.3](#43-keycloak-oidc-identity-provider)) |
| `FDP_CORS_` | Browser access | `ALLOW_ORIGINS` (comma-separated or JSON array), `ALLOW_CREDENTIALS` ([§7](#7-the-origin-coupling-important)) |
| `FDP_IDP_ADMIN_` | User management | `CLIENT_ID`, `CLIENT_SECRET` (enables `/users`), `BASE_URL`, `REALM` ([§6](#6-user-management-facade-optional)) |
| `FDP_METRICS_` | Metrics pipeline | rollup cadence, GeoIP database path |
| `FDP_SEARCH_` | Search index | indexing options |
| `FDP_API_KEYS_` | Personal access tokens | token policy |
| `FDP_SCHEMA_SYNC_` | Schema sync | external schema refresh |
| `FDP_DATA_` | Simple data provider | data-distribution serving |
| `FDP_PROFILE_` | Deployment profile | profile bundle selection |

After editing config, restart the server. After upgrading, also run
`uv run fdp db migrate`.

### Running the server in production

The dev command is `uv run fastapi dev`. For production use uvicorn directly
(the ASGI app is `fdp.main:app`):

```bash
uv run uvicorn fdp.main:app --host 0.0.0.0 --port 8000 --workers 4
# or: uv run fastapi run src/fdp/main.py
```

Put it behind a TLS-terminating reverse proxy ([§8](#8-production-hardening)).

---

## 6. User management facade (optional)

The admin **Users** screen (create/invite users, assign roles) is gated on a
server-side service account that can call Keycloak's Admin API (ADR-0013). It is
**off by default**.

Enable it by setting both:

```env
FDP_IDP_ADMIN_CLIENT_ID=fdp-server
FDP_IDP_ADMIN_CLIENT_SECRET=fdp-server-dev-secret   # dev value; use a real secret in prod
# FDP_IDP_ADMIN_BASE_URL / _REALM are derived from FDP_OIDC_ISSUER when unset
```

When configured, `GET /config` reports `features.user_management: true`, the
`/users` endpoints come alive, and the client shows the **Users** admin menu. The
dev realm already includes the `fdp-server` confidential client with a
least-privilege service account (`view-users`, `query-users`, `manage-users`,
`view-realm`). If the credentials are unset, the facade returns `503` and the UI
hides the feature. In production, create an equivalent confidential client and
supply a strong secret.

---

## 7. The origin coupling (important)

Because the SPA calls the API cross-origin and authenticates against Keycloak,
**three origins must agree**. A mismatch causes "server unreachable" on writes or
a failed login redirect:

1. **`VITE_PUBLIC_ORIGIN`** (client) — the exact origin you open the app at.
2. **`FDP_CORS_ALLOW_ORIGINS`** (server) — must include that origin.
3. **Keycloak client redirect URI** — must allow that origin's `/auth/callback`.

> `http://localhost:5173` and `http://127.0.0.1:5173` are **different origins** to
> the browser — pick one and use it everywhere. (The client warns in dev on a
> mismatch.) Never use `*` for `FDP_CORS_ALLOW_ORIGINS` while credentials are
> allowed.

---

## 8. Client build & serving

The client is a static SPA.

> **Toolchain:** **Node.js ≥ 20** (Vite 8 requires Node 20.19+/22.12+). The
> build uses **Vite 8**, whose **Rolldown** bundler takes `build.rollupOptions.
> output.manualChunks` as a *function* (not Rollup's object map) — see
> `vite.config.ts` if you adjust chunking. `npm install` reports **0 known
> vulnerabilities**; the toolchain (Vite/Vitest) is dev-only and never shipped in
> `dist/`.

```bash
cd fdp-client
npm install
npm run build         # → dist/  (static files)
npm run preview       # optional: preview the production build locally
```

Build-time configuration is baked in from `.env` (`VITE_*`). Serve `dist/` from
any static host (nginx, Caddy, S3+CloudFront, …) configured for SPA history
fallback (rewrite unknown paths to `index.html`). Set, at build time:

- `VITE_FDP_API_URL` — the server's public URL.
- `VITE_PUBLIC_ORIGIN` — the origin the SPA is served at (see [§7](#7-the-origin-coupling-important)).
- `VITE_OIDC_AUTHORITY` / `VITE_OIDC_CLIENT_ID` — fallbacks; the live values come
  from the server's `GET /config` at startup.

> **Regenerating API types:** the client's request/response types are generated
> from the server's OpenAPI spec. After a server contract change, run
> `npm run generate-api` (with the server running) to refresh `src/api/schema.ts`.

### 8.1 Container image & runtime configuration

The client also ships as an nginx image (`Dockerfile`) whose entrypoint
(`deploy/docker-entrypoint.d/40-fdp-config.sh`) writes `config.js` and the CSP
from environment variables **at start-up**, so one image serves any deployment —
no rebuild per environment. Set these on the **client** service in compose:

| Variable | Purpose |
|---|---|
| `FDP_API_URL` | Absolute API origin (default `/`). Also added to the CSP `connect-src`. |
| `FDP_PUBLIC_ORIGIN` | The origin this SPA is served at (OIDC redirect base, see [§7](#7-the-origin-coupling-important)). |
| `FDP_IDP_ORIGIN` | OIDC provider origin, added to the CSP `connect-src` (optional). |
| `FDP_BRANDING` | **Look & feel** (white-labeling): JSON for `window.__FDP_CONFIG__.branding` — the full color palette plus logo/favicon/org name. Validated at start-up (see below). |
| `FDP_BRANDING_ORG_NAME`, `FDP_BRANDING_LOGO_URL`, `FDP_BRANDING_LOGO_URL_DARK`, `FDP_BRANDING_FAVICON_URL`, `FDP_BRANDING_FAVICON_URL_DARK` | Discrete **identity** overrides — convenient single strings for compose. Each, when set, overrides the matching key in `FDP_BRANDING`. (Colors are a coordinated token family, so they live in `FDP_BRANDING`, authored via the editor.) |
| `FDP_BRANDING_IMG_ORIGIN` | Extra origin(s) for the CSP `img-src`, only if the logo/favicon is hosted off-origin (a CDN). Same-origin assets and `data:` URIs need nothing here. |

**Misconfiguration is explained, never fatal.** Branding mistakes can't break the
client — they're reported instead:

- **Invalid JSON in `FDP_BRANDING`** is caught by the entrypoint, which logs the
  parse error and the offending value to the **container logs** and boots with the
  default look (it is never injected, so `config.js` can't become malformed).
- **Semantic mistakes** (an unknown key, a non-customizable token, a value that
  isn't a CSS color) are logged with an explanation to the **browser console** at
  start-up, and shown live in the **Appearance editor** as "Configuration issues"
  while you edit — so you see and fix them before deploying.

> **Look & feel is a client concern, schemata are a server concern.** Branding
> (`FDP_BRANDING`) lives on the **client** service: it only authors the client's
> own `config.js`, never touching the server. Custom **metadata schemata** are
> durable server state and are seeded on the **server** side via the deployment
> profile (`fdp profile apply`, selected with the server's `FDP_PROFILE_*` vars —
> see [§5](#5-server-configuration-reference)). The two never mix.

**Authoring `FDP_BRANDING` the easy way:** open the in-app **Appearance** editor
at `/appearance` (no sign-in required — it's a client-side preview/export tool),
adjust colors/logo/favicon with live preview, switch the export to **Docker env**,
and copy the generated `FDP_BRANDING='…'` line straight into your compose file.

```yaml
services:
  fdp-client:
    image: ghcr.io/.../fdp-client:latest
    environment:
      FDP_API_URL: https://api.fdp.example
      FDP_PUBLIC_ORIGIN: https://fdp.example
      FDP_IDP_ORIGIN: https://idp.example
      # Look & feel — generated by the Appearance editor (Docker env export):
      FDP_BRANDING: '{"orgName":"Acme Data","logoUrl":"/branding/logo.svg","theme":{"--accent":"#7a1f2b","--signal":"#0d6e6e"}}'
    ports:
      - "8080:80"
```

---

## 9. Production hardening

- **TLS everywhere.** Terminate HTTPS at a reverse proxy. Give each component a
  stable public origin (subdomains or path prefixes) and set `BASE_URL` to the
  server's public **https** URL — it mints the persistent resource IRIs.
- **Replace all dev credentials.** New Keycloak realm + admin password; strong
  `POSTGRES_DSN` credentials; enable GraphDB security with a service user and set
  `FDP_TRIPLESTORE_USERNAME`/`_PASSWORD`.
- **Secrets** via your platform's secret manager or environment, never committed.
- **CORS:** list only the real client origin(s); never `*` with credentials.
- **Scheduled jobs:** run `fdp metrics rollup` on a cron (cadence per
  `FDP_METRICS_AGGREGATE_TO_HOURLY_AFTER_SECONDS` /
  `FDP_METRICS_DISCARD_HOURLY_AFTER_DAYS`). Optionally `fdp search reindex` after
  bulk imports and `fdp schema sync` if you use external schemas.
- **Metrics geography (optional):** provide a GeoLite2 City database and set
  `FDP_METRICS_GEOIP_DATABASE_PATH`.
- **Backups:** back up both stores — the GraphDB repository (RDF) **and** the
  Postgres database (operational state). They must be restored together.
- **Health/readiness:** `GET /healthz` (liveness), `GET /readyz` (readiness —
  checks downstreams), `GET /info` (build info).

---

## 10. Operations cheat-sheet

| Task | Command |
|---|---|
| Start backing services | `docker compose -f deploy/compose.yaml up -d` |
| Stop (keep data) | `docker compose -f deploy/compose.yaml down` |
| Stop + wipe data | `docker compose -f deploy/compose.yaml down -v` |
| DB migrations | `uv run fdp db migrate` |
| Seed/refresh the deployment profile | `uv run fdp profile apply ./profiles/default` (add `--force` to re-apply) |
| Validate a profile | `uv run fdp profile validate <path>` |
| Roll up metrics | `uv run fdp metrics rollup` |
| Rebuild the search index | `uv run fdp search reindex` |
| Factory reset (also via API `POST /admin/reset`) | re-apply the profile with `--force` |
| Run server (dev) | `uv run fastapi dev src/fdp/main.py` |
| Run client (dev) | `npm run dev` |

---

*See also: [User Manual](./user-manual.md) · the `fdp-server` architecture docs
and ADRs · the FAIR Data Point specifications at
<https://specs.fairdatapoint.org>.*
