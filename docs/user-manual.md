# FAIR Data Point v2 — User Manual

A practical guide to **installing** a FAIR Data Point (FDP) and **using** it:
browsing and searching metadata, publishing records, and administering schemas,
access policies, licenses, and users.

- New to deployment? Start at [Install in 5 steps](#1-install-in-5-steps).
- Already running? Jump to [Signing in & roles](#2-signing-in--roles).
- Full operator/production detail lives in the [Deployment Guide](./deployment.md).

---

## 1. Install in 5 steps

You need **Docker** + **Docker Compose**, **[uv](https://docs.astral.sh/uv/)**,
**Node.js ≥ 20**, and two clones side by side: `fdp-server/` and `fdp-client/`.

1. **Backing services** — from `fdp-server/`:
   ```bash
   docker compose -f deploy/compose.yaml up -d
   ```
   This starts GraphDB (`:7200`), PostgreSQL (`:5432`), and Keycloak (`:8080`).

2. **GraphDB repository** — open <http://localhost:7200> →
   *Setup → Repositories → Create* → a **GraphDB repository** with ID `fdp`.

3. **Server** — from `fdp-server/`:
   ```bash
   cp .env.example .env
   uv sync --extra dev
   uv run fdp db migrate
   uv run fdp profile apply ./profiles/default
   uv run fastapi dev src/fdp/main.py        # → http://localhost:8000
   ```

4. **Client** — from `fdp-client/`:
   ```bash
   cp .env.example .env
   npm install
   npm run dev                                # → http://localhost:5173
   ```

5. **Open** <http://localhost:5173> and sign in with **`admin` / `admin`**.

That's a complete local FDP. For production (TLS, real credentials, hardening),
follow the [Deployment Guide](./deployment.md).

---

## 2. Signing in & roles

Click the avatar / **Sign in** in the top-right. You're redirected to the
identity provider (Keycloak), then back. What you can do depends on your **role**:

| Role | Can |
|---|---|
| **Anonymous** (not signed in) | Browse and search **published** records; run SPARQL queries; view metrics. |
| **Steward** | All of the above, **plus** create/edit/delete their own records, manage publication state, and use the "My data" dashboard. |
| **Admin** | Everything, **plus** manage SHACL schemas, resource types, ODRL policies, licenses, instance settings, users, and factory reset. |

Dev users: `admin/admin` (admin + steward), `alice/alice` (steward),
`bob/bob` (anonymous-equivalent).

Your identity, roles, and a **Manage account** link to the IdP are under
**avatar → Profile**. Passwords and email are managed in the identity provider,
not the FDP.

---

## 3. Browsing & searching (everyone)

- **Browse** from the home page: the catalog tree and record cards. Click any
  record to open its detail page — properties, links, breadcrumbs to its parent
  catalog, and (for stewards/admins) its publication state.
- **Search** (top bar or the Search page): free-text query plus **facets** (type,
  license, …) rendered from the live index. Results are policy- and
  publication-state-aware — anonymous users see only published records. Signed-in
  users can **save a search** and re-run it later; admins can mark a saved search
  **shared**.
- **SPARQL playground:** run SPARQL 1.1 queries directly against the metadata,
  with query history and result tables.

---

## 4. Publishing metadata (stewards & admins)

FDP metadata follows DCAT: a **Catalog** contains **Datasets**, which contain
**Distributions** (and a deployment may define more types). Records are created
top-down.

### Create a record

1. Click **+ Create** (top bar) to make a top-level **Catalog**, or open an
   existing record and use its **"new child"** link (e.g. a dataset under a
   catalog).
2. Fill the form. Fields are driven by the deployment's **SHACL schema** for that
   type (title, description, publisher, keywords, …). Required fields are marked.
3. Two managed-document pickers:
   - **Access policy** (`dct:rights`) — choose a published **ODRL policy** that
     governs who may read/modify the record (see [§6](#6-access-policies-odrl-admins)).
   - **License** (`dct:license`) — choose a published **license** or paste an IRI.
4. **Save.** The record is created as a **draft**.

### Publish / lifecycle

A record moves through **draft → published → archived**. Open the record and use
the state control (owner or admin) to publish it. Only **published** records are
visible to anonymous users and offered for assignment elsewhere.

### My data (stewards)

The **Dashboard** ("My data") lists records you own or may edit, with their
state, plus a *Recently updated* section — your working set at a glance.

---

## 5. Schemas (admins)

Open **avatar → Schemas**. Records are validated against **SHACL** shapes you
manage here.

- **List / author / publish** shapes as Turtle (text-first editor), with
  versioning shown as `v{n}` at a stable IRI.
- **Validate** a sample record against a saved shape before relying on it.
- The **visual SHACL editor** (node canvas + form builder) lets you author shapes
  graphically, with a live Turtle preview and round-trip import/export.
- **Resource types** (avatar → Resource types): register the deployment's record
  types and their child-link relationships, each pointing at a published shape.
  New types appear across the app (browse, create forms) without a rebuild.

---

## 6. Access policies — ODRL (admins)

Open **avatar → Policies**. An FDP controls access through **ODRL Offers**: a
record opts into a policy via `dct:rights`, and the server's policy decision
point enforces it.

- The **guided composer** builds an Offer from the FDP profile only: pick an
  **action** (read/modify/delete/distribute), add **permissions/prohibitions**,
  and attach **constraints** (e.g. role = `steward`, a party, or a time window).
  The editor cannot produce out-of-profile policies.
- A **live Turtle preview** and inline validation show exactly what will be
  stored; **Validate** runs the server's profile check.
- **Save / publish / delete** managed policies. Published policies appear in the
  record form's *Access policy* picker.

The system ships a default Offer (`system-default`) granting public read and
steward modify — the baseline until you author your own.

---

## 7. Licenses (admins)

Open **avatar → Licenses**. Curate reusable license documents (e.g. CC BY 4.0,
CC0) that records reference via `dct:license`. Each license has a title, an
optional canonical IRI (`dct:source`), and a description. Published licenses
appear in the record form's *License* picker. Licenses are descriptive only —
they are not access policy.

---

## 8. Users (admins, when enabled)

Open **avatar → Users** (visible only when the user-management facade is
configured — see [Deployment §6](./deployment.md#6-user-management-facade-optional)).

- **Search** the directory; see each user's email, roles, and enabled status.
- **Edit** roles (`steward`/`admin`) and enable/disable a user.
- **Invite** a new user — they receive an email to set a password and verify
  (no passwords pass through the FDP).
- **Delete** a user.

Guard rails prevent locking yourself out: you cannot delete yourself, remove your
own admin role, or disable your own account.

---

## 9. Instance settings & maintenance (admins)

- **Settings** (avatar → Settings): per-key configuration the server exposes —
  branding, search-filter config, form autocomplete sources, etc., edited as JSON
  and validated server-side.
- **Metrics dashboard:** anonymous, GDPR-safe usage metrics — summary, time
  series, top resources, and (if a GeoIP database is configured) geography.
- **Factory reset:** re-applies the deployment profile (also `POST /admin/reset`).
  Destructive — it restores schemas/policies to the profile baseline.

---

## 10. Personal access & API (everyone signed in)

- **Profile** (avatar → Profile): your identity and roles, with a deep link to
  the IdP account console for password/email changes.
- **Access tokens** (avatar → Access tokens): create personal API keys to call
  the FDP API from scripts; revoke them anytime.
- The full REST/LDP API is documented at the server's `…/docs` (OpenAPI). Records
  are dereferenceable Linked Data — a record's URL *is* its identifier.

---

## 11. Troubleshooting

| Symptom | Likely cause & fix |
|---|---|
| **"Server is unreachable" on save** | CORS/origin mismatch, or a server error without CORS headers. Confirm the [origin coupling](./deployment.md#7-the-origin-coupling-important); check the server logs / `GET /readyz`. |
| **Login loops or "invalid redirect"** | The Keycloak client redirect URI doesn't include your client origin. Add it in the realm. |
| **Search returns nothing / errors** | PostgreSQL is down or the index is empty. Check Postgres; run `uv run fdp search reindex`. |
| **"policy denies modify" when creating a record** | The root access policy isn't resolving. Ensure the profile is applied (`fdp profile apply`) and `GET /policies/system-default` returns 200 (PUBLISHED). |
| **Newly written record looks empty when fetched** | Drafts aren't served anonymously — fetch with a bearer token, or publish it. |
| **No "Users" menu** | The user-management facade isn't configured — set `FDP_IDP_ADMIN_*` ([Deployment §6](./deployment.md#6-user-management-facade-optional)). |

---

*See also: the [Deployment Guide](./deployment.md) for installation and
production hardening, and <https://specs.fairdatapoint.org> for the FDP
specifications.*
