# Initial implementation tasks — fdp-client

Suggested order for building the client. Each task ends in something testable
and keeps the codebase in a working state.

Read [`CLAUDE.md`](CLAUDE.md) and [`UX-DESIGN-BRIEF.md`](UX-DESIGN-BRIEF.md)
before starting anything substantive. The architecture for the whole system
lives in the server repository under `docs/architecture/`; **Section 13**
covers the client specifically, and the relevant ADRs (ODRL profile, LDP, full
auth model) are also there.

## How to use this list

- Tasks are roughly ordered. Each phase unblocks later ones.
- A task is done when the code is merged, tests pass, and the surface is
  documented (either in the component's docstring or in `docs/`).
- If something seems underspecified, surface the ambiguity rather than
  improvising. Most decisions are already documented somewhere.

---

## Phase 0 — Foundations

### 0.1 Project hygiene
- Run `npm install` and confirm the smoke test passes: `npm run test:unit`.
- Confirm linting and type checking are green: `npm run lint && npm run typecheck`.
- Set up the recommended VS Code extensions (the workspace prompts you).
- Configure `.env` from `.env.example` and confirm `npm run dev` starts.

### 0.2 OpenAPI types generation
- With the server running locally (see fdp-server `compose.yaml`), run
  `npm run generate-api` to produce `src/api/schema.ts`.
- Verify the generated types compile (`npm run typecheck`).
- Commit the generated file so CI can run without the server up. (The
  alternative — generate-on-CI — is fine if you prefer; document the choice.)

### 0.3 HTTP client wrappers
- Implement `src/api/http.ts` token-attach interceptor wired to the auth
  store (task 1.1 produces the store).
- Implement `src/api/{records,schemas,policies,metrics}.ts` — thin typed
  wrappers around the generated types and the Axios instance.
- Each wrapper file exports query functions that TanStack Query composables
  will consume.
- Unit tests with `respx`-style mocking or Vitest's `vi.mock`.

References: CLAUDE.md, server architecture §10 (LDP endpoints), §11 (metrics API).

---

## Phase 1 — Authentication and shell

### 1.1 Auth store and route guard
- Finish `src/stores/auth.ts` — currently scaffolded. Implement:
  - `login()`, `logout()`, `handleCallback()`, `silentRenew()`, `loadStoredUser()`.
  - `roles` computed from the configured claim path.
- Implement the router guard in `src/router/index.ts` so routes marked
  `requiresAuth` redirect anonymous users to login.
- Implement the `/auth/callback` view (`src/views/AuthCallbackView.vue`) so
  it completes the redirect and routes to the user's intended destination.
- Wire the HTTP interceptor in `src/api/http.ts` to read the access token
  from the store and to attempt silent renewal on 401.

References: CLAUDE.md (OIDC happens directly between client and IdP), server
architecture §7.

### 1.2 Application shell polish
- Refine `src/App.vue`: user menu (login / logout / profile name), responsive
  navigation, breadcrumb area.
- Implement a global error boundary that surfaces FDP error envelopes
  cleanly (mapping `code` to user-friendly messages with the docs link
  preserved).

---

## Phase 2 — Metadata browsing

### 2.1 Catalog tree navigation
- `components/metadata/CatalogTree.vue` — recursive component fetching
  containers from the LDP API.
- Lazy-load children on expand.
- URL state: the route path mirrors the tree position.

### 2.2 Record detail view
- `views/RecordDetailView.vue` — fetch the record graph (Turtle preferred,
  JSON-LD also accepted), render title, description, properties, related
  records, available distributions, and the effective ODRL policy.
- "View as" selector for RDF serializations.
- Render the meta-metadata block (creator, dates, version) in a sidebar.

### 2.3 Search
- `views/MetadataBrowseView.vue` — facets (resource type, keywords, themes)
  + free-text search.
- Drives a TanStack Query that hits the server's search API.
- Search input is debounced; faceted state lives in the URL.

References: server architecture §5.3, §10.

---

## Phase 3 — SPARQL playground

### 3.1 Query editor
- `views/SparqlPlaygroundView.vue` — code editor (CodeMirror or Monaco;
  prefer Monaco for the better SPARQL grammar support if bundle size allows).
- Result rendering: table for SELECT / ASK, Turtle viewer for CONSTRUCT /
  DESCRIBE.
- Save query history to in-memory state only (per CLAUDE.md, no browser
  storage for app state).

### 3.2 Error handling
- 401 → login prompt.
- 403 → "your authorization does not cover graph X" with the graph URI.
- 400 with SERVICE rejection → explain federation is not supported.
- 400 with ambiguous update → show the suggested rewrite.

References: server architecture §9.

---

## Phase 4 — Visual SHACL editor

This is one of the two heaviest surfaces. Build it incrementally.

### 4.1 Canvas with shapes as nodes
- `components/shacl-editor/ShaclCanvas.vue` using Vue Flow.
- Each `sh:NodeShape` is a node; the node card shows the target class and
  the count of properties.
- Drag to position; positions are local UI state only (not persisted to
  the schema).
- Connect node-shape-to-node-shape via `sh:node` constraints (edge).

### 4.2 Property pane
- Click a node to open a side panel listing its `sh:property` constraints.
- Add / remove / reorder properties.
- Per-property form: path, datatype, cardinality, value range, validation
  pattern.

### 4.3 Serialization round-trip
- Parse incoming SHACL Turtle into the editor's internal representation
  using the `n3` library.
- Serialize back to Turtle. Round-trip must be lossless for the subset of
  SHACL the editor supports.
- Show a live Turtle preview pane next to the canvas.

### 4.4 Validation against test data
- Steward can paste sample data; the editor sends it plus the current
  schema to the server's validation endpoint and renders violations
  inline on the relevant nodes.

References: CLAUDE.md (editors don't replicate server validation), server
architecture §13 (ProjectOak functional reference).

---

## Phase 5 — Visual ODRL editor

### 5.1 Offer composer
- `components/odrl-editor/OdrlComposer.vue` — guided form.
- Action selector limited to the FDP profile (`odrl:read`, `odrl:modify`,
  `odrl:delete`, `odrl:distribute`).
- Constraint builder: party, role, organization, time window. Constraints
  outside the FDP profile are not offered.
- Conflict strategy picker with deny-wins as the explicit default.

### 5.2 Offer preview and save
- Live Turtle preview.
- Save sends the Offer to the server, which validates against the FDP
  profile and rejects non-conforming policies with a structured error
  the editor surfaces inline.

### 5.3 Agreement history view
- Read-only display of materialized Agreements against a given Offer.
- Steward-visible; not part of the editing flow but useful for audit.

References: server architecture §8, ADR-0006.

---

## Phase 6 — Metrics dashboard

### 6.1 Overview widgets
- `views/MetricsDashboardView.vue` — top-level widgets: total views over
  time, top resources, geographic distribution, unique visitors per day.
- All data from the server's anonymous metrics API.

### 6.2 Per-resource drill-down
- Steward can click a resource to see per-resource trends.
- Admin sees system-wide; stewards see only their own.

### 6.3 Charts
- Chart.js via vue-chartjs.
- No raw data export — the privacy design rules out per-event export.

References: ADR-0002, server architecture §11.

---

## Gap analysis vs. the legacy client

The phases above cover browsing, querying, the visual editors, and metrics —
all essentially **read** surfaces (plus the standalone editors). Comparing
against the legacy reference client
([FAIRDataTeam/FAIRDataPoint-client](https://github.com/FAIRDataTeam/FAIRDataPoint-client))
surfaced a large missing area: **metadata authoring and administration**. The
new client today has *no write path at all* — `RecordEditView` holds local
draft refs that never save, the steward dashboard is fixture-backed, and there
are zero create/update/delete mutations. This is why a logged-in admin sees no
way to edit the repository metadata or create catalogs/datasets.

Each task below notes whether the **new server already supports it**. Endpoints
that don't exist yet are coordination items for `fdp-server`, not client-only
work — don't fake them client-side.

| Legacy feature | New server support | Task |
| --- | --- | --- |
| Create / edit / delete entities | ✅ POST/PUT/PATCH/DELETE + per-type SHACL `/spec` | Phase 7 |
| Edit repository (root) metadata | ✅ PUT/PATCH on `/` | Phase 7 |
| SHACL-driven entity forms (`ShaclForm`) | ⚠️ shapes exist; `/spec` endpoint not yet reliably served | 7.5 |
| "My metadata" tree, publication state | ⚠️ listing via SPARQL; no `/meta/state` | 7.6, 9.1 |
| Membership / sharing (`/members`) | ❌ deferred to server v1.x | 9.2 |
| User management | ❌ no `/users` (identities live in the IdP) | 9.3 |
| API keys / personal tokens | ❌ no endpoint | 9.4 |
| Metadata-schema lifecycle (import/release/version) | ❌ profile-bundle driven, no mgmt API | 9.5 |
| Resource-definition admin | ❌ profile-driven, no API | 9.6 |
| Instance settings / branding | ❌ no endpoint | 9.7 |
| FDP Index (registry of connected FDPs) | ❌ no endpoint (separate service) | 9.8 |
| Reset to defaults | ❌ no endpoint | 9.9 |

---

## Phase 7 — Metadata authoring (CRUD)  ✅ COMPLETE (2026-05-30)

This is the functionality a steward/admin most obviously expects and the new
client entirely lacked. The server speaks LDP: a record's path id *is* its URL
(`dataset/ad-cohort-2024` → `/dataset/ad-cohort-2024`).

**Delivered (7.1–7.4): record-level create / edit / delete works end-to-end.**
- `src/api/entityForms.ts` — config-driven field specs per type (catalog / dataset
  / distribution / data-service) mirroring the DCAT profile, with RDF ↔ model
  mapping and create/edit Turtle builders.
- `src/components/metadata/EntityForm.vue` — generic spec-driven form.
- `src/views/EntityCreateView.vue` (`/create/:type?parent=`) and
  `EntityEditView.vue` (replaces the old placeholder `RecordEditView`); delete with
  confirmation. Mutations via `useRecordMutations` (`useCreate/Update/DeleteRecord`,
  cache-invalidating).
- "New …" affordances on the browse view (new catalog) and record detail (new
  child + Edit), role-gated via `auth.isSteward`.
- Create uses **PUT to a client-chosen slug** (not POST) — the server returns 201,
  or 428 if the id exists (can't clobber). Edit/delete carry the ETag → 412 on
  conflict. Verified live: create 201 / collision 428 / edit 200 / delete 204.
- **Server fix (fdp-server):** on restart the profile is `already_applied`, so the
  runtime caches (system-default offer, resource definitions, SHACL warm-up) were
  never repopulated → the offer-resolver fallback was unset and **creating any new
  record was default-denied**. Added `resolve_runtime_state` (pure, profile-derived)
  and a shared `_publish_runtime_state`, now invoked on the already-applied path
  too (+ regression test). Note: the PDP caches decisions in Postgres, so denials
  recorded before the fix persist per id — use a fresh id or invalidate.

### 7.1 Write layer in the API client — ✅ done (PATCH wrapper still optional)
- `src/api/records.ts` provides `readGraph`/`putGraph`/`deleteGraph`/`recordExists`
  with ETag/`If-Match` + error normalisation; `serializeTurtle`/`setLiteral`/
  `setIri`/`setLiterals` in `rdf.ts`; `useRecordMutations` exposes cache-invalidating
  `useMutation` wrappers. Still optional: a `PATCH` (SPARQL-update) wrapper for
  field-level edits (PUT-replace covers editing today).
- Original notes (for reference):
  - **Create**: `POST /{containerType}` (e.g. `POST /catalog`) with the new
    record's RDF body; the server mints the IRI and returns `Location`.
  - **Replace**: `PUT /{id}` with the full RDF graph.
  - **Patch**: `PATCH /{id}` with a SPARQL `application/sparql-update` body
    (the LDP router's PATCH path) for field-level edits.
  - **Delete**: `DELETE /{id}`.
- Expose these as TanStack `useMutation` composables that invalidate the
  relevant query keys (`record`, `catalogs`, `tree`, `steward-records`).
- **Concurrency**: reads return an `ETag`; `PUT`/`PATCH`/`DELETE` require
  `If-Match`. Capture the ETag on read and send it back; surface `412`
  (precondition failed) as a "this record changed since you opened it" prompt.
- Serialize the editor model → Turtle with `n3` (mirror the read mapper in
  `src/api/rdf.ts`; keep the round-trip lossless for supported fields).

References: server LDP router (`fdp.metadata.ldp.router`), `If-Match`/ETag
semantics; CLAUDE.md (OpenAPI types are the contract).

### 7.2 Create flow — ✅ done
- "New…" affordance on the repository and catalog views to create a child of
  the right type (catalog under repo; dataset/data-service under catalog;
  distribution under dataset), gated on the steward/admin role.
- `views/EntityCreateView.vue` + a form built from the DCAT profile fields
  (title, description, publisher, license, keywords, theme, isPartOf, …);
  set `dct:isPartOf` to the parent automatically.
- On submit: serialize → `POST` → follow `Location` → route to the new record.
- Surface server SHACL / profile validation errors (`fdp.validation.*`
  envelope with `violations[]`) inline on the offending fields — do not
  replicate validation client-side (CLAUDE.md).

### 7.3 Edit flow — ✅ done
- `EntityEditView.vue` reads the record graph + ETag, edits the spec fields via
  read-modify-write (preserving rdf:type/isPartOf/unmanaged triples), PUTs with
  `If-Match`; invalidate-on-success; `412` conflict surfaced. Role-gated.

### 7.4 Delete flow — ✅ done
- Delete from the edit view with a confirmation dialog; ETag-guarded; server
  errors (e.g. non-empty container) surfaced via the parsed envelope.

### 7.5 SHACL-driven dynamic forms (supersedes the hardcoded 7.2 form) — ✅ done
- Built on **fdp-server task 2.6** (`GET /{type}/spec`, now implemented).
- `useEntityShape(type)` fetches the type's SHACL NodeShape; `fieldsFromShape`
  (in `entityForms.ts`) parses `sh:property` constraints into `FieldSpec[]`:
  `sh:datatype` → text/textarea/keywords, `sh:nodeKind sh:IRI` → iri/iris,
  `sh:maxCount 1` → single vs repeatable, `sh:minCount ≥ 1` → required, `sh:name`/
  `sh:description` → label/help. Excludes structural/managed/policy predicates
  (`isPartOf`, `rights`, `issued`, `modified`) and skips non-simple nodes
  (`contactPoint`).
- `EntityCreateView`/`EntityEditView` now drive `EntityForm` from the shape, with
  the static `EntitySpec.fields` as a fallback if `/spec` is unavailable. Forms now
  expose the full per-type field set (e.g. dataset gains creator, identifier,
  language, landingPage, theme, distribution) instead of the static six.
- Remaining niceties (not blocking): datatype-specific inputs (number/date) and
  `sh:in` → select (no enums in the bundled profile yet).
- Render create/edit forms from the resource type's SHACL shape instead of
  hardcoded field lists — the legacy client's `ShaclForm`/`FormGenerator`
  pattern (datatype → input, `sh:minCount`/`maxCount` → required/repeatable,
  `sh:in` → select, `sh:nodeKind IRI` → IRI picker).
- **Server dependency**: needs a reliable "shape for type X" response. The
  documented `/{type}/{id}/spec` and `/spec` are currently served by the LDP
  catch-all (401/404) rather than a real handler — coordinate with the server
  to expose member shapes, or read the bundled profile shapes. Until then,
  7.2's typed forms stand in.

### 7.6 Steward "My metadata" — ✅ done
- `useStewardRecords` now lists all authorable records via SPARQL (the server has
  no per-record ownership, and every steward can modify all — so "records I can
  edit" is the full set, policy-filtered to what the caller may read).
- `StewardDashboardView` rebuilt: real per-type counts, a client-side title/type
  filter, and per-row View / Edit links into the Phase 7 CRUD flows, plus a
  "New catalog" action. The fixture KPIs and the status/version/views columns are
  gone (the server exposes none of that yet); the sidebar's secondary sections are
  inert "Coming soon" placeholders for Phase 9.
- Publication state per row still pending 9.1 (`/meta/state`).

---

## Phase 8 — Repository (root) administration  ✅ COMPLETED (2026-05-29)

### 8.1 Edit the repository metadata — ✅ done
- The admin's first expectation (and former dead-end) is editing the FDP /
  repository node itself (title, description, publisher, rights/offer link).
- `/` supports `GET`/`PUT`/`PATCH`/`DELETE` — wired an admin/steward-gated edit
  form for the root resource.

**Delivered:**
- Write layer `src/api/records.ts` (`readGraph` with ETag, `putGraph`/`deleteGraph`
  with `If-Match`, error-envelope normalisation) — this is the core of task 7.1,
  reusable by Phase 7.
- RDF write helpers in `src/api/rdf.ts` (`setLiteral`/`setIri`/`serializeTurtle`)
  for lossless read-modify-write.
- `RepositoryEditView.vue` at `/repository/edit` (gated; server enforces too) —
  read root + ETag → edit title/description/publisher → PUT with `If-Match`;
  preserves type + rights triples; surfaces `412` conflicts and validation errors.
- Auth role helpers (`hasRole`/`isSteward`/`isAdmin`); browse hero now shows the
  real repository title/description (`useRepository`) + an admin "Edit repository"
  link instead of the fixture name.
- **Server fix (fdp-server):** authorization keyed on the raw request IRI, so the
  repository root (addressed as `.../` but stored at the no-slash IRI) failed to
  resolve its own `dct:rights` and writes were default-denied even for stewards.
  `_enforce` now normalises via `record_graph_uri` (+ regression test).
- Verified end-to-end: steward PUT to `/` → 200 with type/rights preserved; stale
  ETag → 412. Client gate green; server router/policy tests pass.

---

## Phase 9 — Collaboration, accounts & instance admin (BLOCKED on server)

These legacy-client features depend on `fdp-server` endpoints that **do not
exist in the current OpenAPI**. Each needs a coordinated server change first;
listed so they aren't forgotten. Do not stub them against absent endpoints.

### 9.1 Publication state & versioning
- Draft → published workflow and version history (legacy `EntityView` state +
  `VersionInfoTable`). Server: `/meta`, `/meta/state` are noted as deferred to
  v1.x in `fdp.metadata.openapi`.

### 9.2 Record membership / sharing
- Per-record user roles (legacy `EntitySettings` + `memberships` API). Server:
  `/members`, `/members/{userUuid}` deferred to v1.x.

### 9.3 User management (admin)
- List / create / edit users and roles (legacy `Users`, `UserCreate`,
  `UserDetail`). Server: no `/users` API — identities live in the IdP
  (Keycloak). Decide whether this belongs in the client at all or stays an IdP
  admin task; if in-client, the server needs a users facade.

### 9.4 API keys / personal access tokens
- Legacy `ApiKeys`. Server: no token-issuing endpoint.

### 9.5 Metadata-schema lifecycle
- Import / version / release / update SHACL schemas (legacy `Schemas`,
  `SchemaDetail`, `SchemaRelease`, `SchemasImport`). Server: shapes come from
  the deployment profile bundle; no management API. Distinct from Phase 4
  (which *authors* a schema) — this is the schema *lifecycle*. Resolve the
  overlap when both are scheduled.

### 9.6 Resource-definition configuration — UNBLOCKED (server work in progress)

The server is gaining runtime-mutable resource definitions (stored as RDF,
fronted by a `GET /resource-definitions` read catalog and an admin-gated
`/resource-definitions` CRUD surface; see fdp-server ADR-0009 and its task
list). This unblocks 9.6 and changes a foundational assumption in the client.
Coordinated work, in dependency order:

- **9.6a Dynamic type catalog (PREREQUISITE — do first).** Today
  `src/api/entityForms.ts` hardcodes the universe of types
  (`EntityType = "catalog" | "dataset" | "distribution" | "data-service"` and
  the static `ENTITY_SPECS` map with its `childTypes`). A runtime-added type
  (e.g. `ontology`) is therefore invisible to the browse tree, create forms,
  child listings, and `typeForId`. Replace the hardcoded catalog with one
  loaded at runtime from `GET /resource-definitions`: derive the type list,
  display names, schema IRIs, and child links from the server response; keep
  the static map only as an offline fallback. `EntityType` becomes a runtime
  `string`, not a compile-time union. Routes are already generic
  (`/create/:type`, `/records/:id+`) so routing needs little change; the work
  is in `entityForms.ts`, `useEntityShape.ts`, the browse tree, and the create
  picker. Cache the catalog (TanStack Query) and invalidate it after an admin
  mutation in 9.6b.
- **9.6b Resource-definition admin UI (Option A — explicit two-step).** A
  steward-facing surface to manage the type hierarchy. Flow matching the
  server's chosen UX: (1) author/select a SHACL shape (ties into Phase 4 and
  9.5), then (2) register a resource definition that points at that shape
  (url_prefix, name) and wire it under a parent via a child link — the
  driving scenario is "Catalog now also contains Ontology metadata", i.e. add
  a `dcat:`-style child link from the Catalog RD to a new Ontology RD. Support
  editing an existing RD's child links, not just creating new types. CRUD
  against the admin `/resource-definitions` endpoints; validate url_prefix
  uniqueness and reserved-path collisions client-side too for fast feedback.
  After any mutation, invalidate the 9.6a catalog query so new types appear
  without reload. Gate the surface on the admin/steward role.
- **9.6c Regenerate OpenAPI types.** After the server endpoints land, re-run
  `npm run generate-api` and adapt to the new `/resource-definitions` schema.
  Note the per-type LDP paths are injected dynamically server-side (tagged
  `x-fdp-resource-definition`), so the generated `schema.ts` surface for a
  given deployment depends on its registered types — prefer driving the UI
  from the runtime catalog (9.6a), not from the generated union.

### 9.7 Instance settings & branding
- Deployment title, theme, custom forms, links (legacy `FdpSettings`). Server:
  no settings endpoint.

### 9.8 FDP Index
- Registry of connected FAIR Data Points: ping, list, per-FDP detail, settings
  (legacy `IndexDetail`, `IndexPing`, `IndexSettings`). Server: no endpoint;
  the Index is typically a separate service.

### 9.9 Reset to defaults
- Legacy `ResetToDefaults`. Server: no endpoint.

### 9.10 User profile page
- View/edit the signed-in user's profile (legacy `Profile`). Mostly IdP-backed;
  scope depends on 9.3.

---

## Open items

- Theme tokens and final design system (likely arrives via Claude Design
  handoff; see UX-DESIGN-BRIEF.md).
- Accessibility audit pass once visual surfaces stabilize.
- Internationalization — not in scope for v1 but the messaging layer should
  not block it.
