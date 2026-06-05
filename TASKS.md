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

## Phase 0 — Foundations — ✅ done

### 0.1 Project hygiene — ✅ done
- Run `npm install` and confirm the smoke test passes: `npm run test:unit`.
- Confirm linting and type checking are green: `npm run lint && npm run typecheck`.
- Set up the recommended VS Code extensions (the workspace prompts you).
- Configure `.env` from `.env.example` and confirm `npm run dev` starts.

### 0.2 OpenAPI types generation — ✅ done
- With the server running locally (see fdp-server `compose.yaml`), run
  `npm run generate-api` to produce `src/api/schema.ts`.
- Verify the generated types compile (`npm run typecheck`).
- Commit the generated file so CI can run without the server up. (The
  alternative — generate-on-CI — is fine if you prefer; document the choice.)

### 0.3 HTTP client wrappers — ✅ done
- Implement `src/api/http.ts` token-attach interceptor wired to the auth
  store (task 1.1 produces the store).
- Implement `src/api/{records,schemas,policies,metrics}.ts` — thin typed
  wrappers around the generated types and the Axios instance.
- Each wrapper file exports query functions that TanStack Query composables
  will consume.
- Unit tests with `respx`-style mocking or Vitest's `vi.mock`.

References: CLAUDE.md, server architecture §10 (LDP endpoints), §11 (metrics API).

---

## Phase 1 — Authentication and shell — ✅ done

### 1.1 Auth store and route guard — ✅ done
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

### 1.2 Application shell polish — ✅ done
- Refine `src/App.vue`: user menu (login / logout / profile name), responsive
  navigation, breadcrumb area.
- Implement a global error boundary that surfaces FDP error envelopes
  cleanly (mapping `code` to user-friendly messages with the docs link
  preserved).

---

## Phase 2 — Metadata browsing — ✅ done

### 2.1 Catalog tree navigation — ✅ done
- `components/metadata/CatalogTree.vue` — recursive component fetching
  containers from the LDP API.
- Lazy-load children on expand.
- URL state: the route path mirrors the tree position.

### 2.2 Record detail view — ✅ done
- `views/RecordDetailView.vue` — fetch the record graph (Turtle preferred,
  JSON-LD also accepted), render title, description, properties, related
  records, available distributions, and the effective ODRL policy.
- "View as" selector for RDF serializations.
- Render the meta-metadata block (creator, dates, version) in a sidebar.

### 2.3 Search — ✅ done (now POST /search, 10.2)
- `views/MetadataBrowseView.vue` — facets (resource type, keywords, themes)
  + free-text search.
- Drives a TanStack Query that hits the server's search API.
- Search input is debounced; faceted state lives in the URL.

References: server architecture §5.3, §10.

---

## Phase 3 — SPARQL playground — ✅ done

### 3.1 Query editor — ✅ done
- `views/SparqlPlaygroundView.vue` — code editor (CodeMirror or Monaco;
  prefer Monaco for the better SPARQL grammar support if bundle size allows).
- Result rendering: table for SELECT / ASK, Turtle viewer for CONSTRUCT /
  DESCRIBE.
- Save query history to in-memory state only (per CLAUDE.md, no browser
  storage for app state).

### 3.2 Error handling — ✅ done
- 401 → login prompt.
- 403 → "your authorization does not cover graph X" with the graph URI.
- 400 with SERVICE rejection → explain federation is not supported.
- 400 with ambiguous update → show the suggested rewrite.

References: server architecture §9.

---

## Phase 4 — Visual SHACL editor — ⬜ OPEN (foundations in place; editor unbuilt)

**Status (2026-06-04):** the **text-first** schema lifecycle ships (9.5 /
`SchemaEditorView.vue`, 439 lines) and the read/parse/validate plumbing the
editor needs already exists — but the **visual editor and everything around it
is NOT built** (`src/components/shacl-editor/` does not exist). One of the two
heaviest surfaces (the other is Phase 5 ODRL). Build incrementally and keep the
text editor as the raw-RDF fallback (see Open questions).

**Design source of truth:** `docs/design_handoff_visual_schema_editor/`
(README + screenshots + a React/HTML prototype). It specifies a drag-and-drop
**DASH form designer** (palette → form-canvas of group/field cards → inspector),
three tabs (**SHACL** / **Visual Editor** / **Form Preview**) over one shared
model with bidirectional sync, and the model→Turtle serializer rules. **Caveat:
the handoff README describes a different/older client** (Vue 2 / `rdflib` /
`vue-prism-editor` / SCSS `$color-*` vars / Font Awesome). Translate everything
onto the real stack: Vue 3 `<script setup>`, **n3** (`rdf.ts`), **Monaco** (clone
the `SparqlEditor.vue` pattern), CSS-custom-prop tokens in `main.css` (dark-mode
aware — the handoff is light-only), and the inline-SVG `AppIcon` (add new glyphs;
there is no Font Awesome). The handoff's referenced files (`SchemaDetail`,
`ShaclForm/*`, `src/rdf/namespaces.ts`, `_variables.scss`) do **not** exist —
the real equivalents are mapped below.

**Scope decisions (2026-06-04, recorded):**

1. **Build BOTH the form designer and the Vue Flow node graph, merged.** The
   multi-shape Vue Flow canvas is the top-level overview (nodes = `sh:NodeShape`,
   edges = `sh:node`/`sh:class`); the handoff's 3-column palette/form-canvas/
   inspector is the **per-shape editor you drill into** from a node. The shared
   model is therefore **multi-shape** (`SchemaDocument { prefixes, shapes:
   ShapeModel[] }`), not the single-shape `SchemaModel` in the handoff README.
2. **Form Preview renders the full DASH widget set** (all editors at
   [datashapes.org/forms.html](https://datashapes.org/forms.html)), not the
   prototype's curated 12.
   `EntityForm.vue` only handles 5 field kinds, so Preview gets a dedicated
   `ShaclFormPreview.vue` that dispatches on `dash:editor`; `EntityForm` is left
   alone for metadata authoring.

### Already in place — ✅ reuse, don't rebuild
- **Vue Flow** installed (`@vue-flow/core` + `background`/`controls`/`minimap`)
  and code-split (`vendor-flow` chunk in `vite.config.ts`). Used by 4.1.
- **n3** + `rdf.ts` round-trip primitives: `parseTurtle` / `serializeTurtle` /
  `setLiteral` / `setIri` / `setIris` / `setLiterals` / `addType` / `one` /
  `many` / `typedSubjects`. (`serializeTurtle` uses the n3 `Writer` — **not**
  for 4.3; the serializer is hand-rolled for deterministic ordering.)
- **One-shape parser:** `fieldsFromShape(turtle, classIri)` (`entityForms.ts`)
  reads `sh:targetClass` + `sh:property` → `FieldSpec` (datatype / cardinality /
  nodeKind). **Lossy** (skips groups, `dash:editor`, `sh:in`, `sh:pattern`,
  lengths, order, labels, prefixes) — its n3 access patterns are the template,
  but 4.3 needs a richer lossless multi-shape parser, not an extension of this.
- **Schema API** (`schemas.ts` + `useSchemas`): list / get / `PUT` / delete +
  **`validateSample(id, turtle)` → `/schemas/{id}/validate`** — the 4.4
  validation endpoint is already wired.
- **`useResourceTypes`**: the type catalog + parent→child links — seeds the
  multi-node graph (which shapes exist and how they connect).
- **`useEntityShape`**: fetches `GET /{type}/spec` (a type's NodeShape).
- **Form renderer reference:** `EntityForm.vue` (config-driven, 5 field kinds) —
  pattern reference for `ShaclFormPreview.vue`, not reused directly (see scope 2).

### 4.0 Shared model + serializer + parser — ✅ DONE (foundation; 24 tests green)
The framework-independent core all three tabs sit on. `npm run typecheck` +
`eslint` clean; `npm run test:unit` 24/24 in `src/components/shacl-editor/`.

- `src/rdf/namespaces.ts` — `PREFIXES` / `DASH` / `SH` / `RDFS` / `XSD` /
  `DEFAULT_URI` (extends `rdf.ts`'s `NS`, which only had rdf/dct/dcat).
- `model.ts` — **multi-shape** `SchemaDocument → ShapeModel[] → Group[] →
  Field[]` (handoff §State Management lifted to multi-shape; client-only `id`s
  not serialized). The single source of truth.
- `serialize.ts` — hand-rolled, deterministic model→Turtle matching the
  prototype's `shacl.jsx` block/term order, multi-shape. **Not** the n3 `Writer`
  (round-trip needs a fixed order the Writer won't guarantee). Field carries the
  `dash:editor` IRI directly, so the serializer needs no widget table.
- `parse.ts` — n3-based Turtle→model, **lossless for the supported subset**
  across *all* `sh:NodeShape`s; re-compacts IRIs to prefixed names; reads
  everything `fieldsFromShape` drops (`sh:group` label/order, `sh:in`,
  `sh:pattern`, `sh:min/maxLength`, `sh:order`, `sh:defaultValue`, shape
  `rdfs:label`/`rdfs:comment`, shape IRI, `@prefix` set) and maps `dash:editor`
  (+ numeric heuristic) → `widgetId` via `widgetForEditor`. Uses n3's synchronous
  parse (the callback form is async and leaks errors) + a regex for `@prefix`.
- `widgets.ts` — the **full DASH editor set** (15 editors from
  datashapes.org/forms.html + synthetic `NumberFieldEditor`), `DATATYPES`,
  `NODE_KINDS`, and `widgetForEditor()` (the one editor⇄widget mapping).
- `factories.ts` — `newField` (seeds from a widget's defaults + auto
  `:lowercasename` path, per the DnD spec), `newGroup`, `emptyDocument`.
- **Round-trip proven** (CLAUDE.md gate): `parse(serialize(m)) ≡ m` (ignoring
  ids) and `serialize(parse(ttl))` idempotent over a two-shape seed.
- ⚠️ **Carried to 4.3:** true losslessness for *arbitrary* input (pass-through
  of unrecognised triples) and wiring into `SchemaEditorView` — both depend on
  the blank-node/determinism work below, so they are unsafe to do under 4.0
  (reserialising a real shape today would silently drop unmodeled triples).

### 4.1 Shape graph (Vue Flow overview) — ⬜
- New `src/components/shacl-editor/ShaclCanvas.vue` (Vue Flow). Each
  `sh:NodeShape` → a node card (target class + property count); multi-shape graph
  seeded from the loaded Turtle and/or `useResourceTypes`.
- Drag to position = **UI-only state** (new Pinia `shaclEditor` store; not
  persisted to the schema).
- Edges from `sh:node` (and `sh:class` pointing at another in-graph shape).
  Keyboard-navigable canvas (a11y per CLAUDE.md).
- Selecting/opening a node drills into its **form designer** (4.2). Graph⇄designer
  composition (drill-in vs. split-pane) is the one UX detail neither the handoff
  nor this plan fully pins down — validate during build.

### 4.2 Per-shape form designer (the handoff 3-column workbench) — ⬜
- **Palette** (`WidgetPalette.vue`): searchable, categorised full DASH widget
  list; drag onto the canvas.
- **Form canvas** (`FormCanvas.vue` + `GroupCard.vue` / `FieldCard.vue`):
  group cards (one per `sh:PropertyGroup`) holding field cards (one per
  `sh:property`); HTML5 drag-and-drop to create-from-palette, reorder within a
  group, and move across groups (renumber `sh:order`).
- **Inspector** (`Inspector.vue`): context-sensitive Field / Group / Schema
  panels — path, name, description, cardinality, nodeKind, datatype/class,
  min/maxLength, `sh:pattern`, `sh:in` chip editor, defaults/order; Schema panel
  has the shape IRI / target class / prefix-table editor.
- Every mutation runs `mutate(fn)` → re-serialize → update the SHACL tab.

### 4.3 Three-tab chrome + bidirectional sync — 🟡 STARTED (Monaco SHACL editor in)
- ✅ Landed: `TurtleEditor.vue` (Monaco + Turtle Monarch grammar, light/dark
  themes, slim API — clones `SparqlEditor.vue`) and `status.ts` (`shaclStatus`,
  pure/non-destructive parse status). Wired into `SchemaEditorView`: the Turtle
  textarea is now Monaco with a live status pill (✓ N shapes · M properties /
  ✕ Invalid SHACL), an error strip, and a Copy button. **Text in/out only — no
  reserialise**, so it's safe ahead of the pass-through work. +4 tests (28 total).
- ⬜ Still to do — the actual **3-tab chrome** (`SchemaTabs.vue`: SHACL / Visual
  Editor / Form Preview; NEW pill; red dot on parse fail), **Tidy** (reserialise —
  gated on the losslessness work below), and the bidirectional **`onShaclChange`
  → model** sync (the SHACL tab today only *reads* status, doesn't drive a model).
- **Sync (two one-way paths, no cycles):** Visual edit → model → serialize →
  Turtle; SHACL edit → parse → model (or error). Import existing `.ttl`
  (paste/upload) populates the editor.
- **Losslessness for arbitrary input (carried from 4.0):** the parser keeps only
  the supported subset; before a model→Turtle reserialise can be safe on a real
  server shape, unrecognised triples must pass through untouched. The hard part is
  blank nodes — SHACL property shapes are bnodes, so quad-diffing to find "extra"
  triples is unreliable, and deterministic serialize-from-scratch fights
  read-modify-write preservation. Settle this (e.g. carry a residual quad set keyed
  off stable subject/path identity) **before** wiring Tidy/reformat into the SHACL
  tab — until then, reserialising would silently drop triples.

### 4.4 Validation against sample RDF — ⬜
- Steward pastes sample data; send schema + sample to **`validateSample`**
  (already in `schemas.ts`); render violations **annotated on the relevant
  nodes/properties**, not just a list. Surface server messages with pointers;
  don't replicate validation client-side.
- **Form Preview tab:** `ShaclFormPreview.vue` (full DASH dispatch on
  `dash:editor`) fed the synced Turtle for the focused shape, plus a client-side
  "Validate record" required-fields banner (throwaway local values).

### 4.5 Undo/redo + wiring — ⬜
- Undo/redo over the editor model (command stack in the `shaclEditor` store).
- Fold the editor into `SchemaEditorView` (or a sub-route) so the **SHACL tab
  stays as the raw-RDF fallback** for power users (resolves an Open question);
  save via the existing schema `PUT`.

### Decisions to make first
- **SHACL subset:** curated to the FDP profile vs broader `sh:` (Open questions).
  The form designer covers the DASH widget constraints; widen the parser/
  serializer's recognised terms iteratively, passing unknown triples through.
- **Graph⇄designer composition** (see 4.1) — settle early; it shapes 4.1/4.2.

### Suggested order
4.0 (model/serializer/parser/round-trip, no UI) → 4.3 SHACL tab (Monaco) →
4.1 shape graph → 4.2 form designer → 4.4 preview + validation → 4.5 undo/redo.
4.0→SHACL-tab already delivers value (round-trip + better editor) before the
heavy canvas work.

References: CLAUDE.md (editors don't replicate server validation; round-trip
test), server architecture §13 (ProjectOak functional reference),
`docs/design_handoff_visual_schema_editor/` (design source of truth).

---

## Phase 5 — Visual ODRL editor — ⬜ OPEN (PolicyEditorView is a stub; not built)

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

## Phase 6 — Metrics dashboard — ✅ done

### 6.1 Overview widgets — ✅ done
- `views/MetricsDashboardView.vue` — top-level widgets: total views over
  time, top resources, geographic distribution, unique visitors per day.
- All data from the server's anonymous metrics API.

### 6.2 Per-resource drill-down — ✅ done
- Steward can click a resource to see per-resource trends.
- Admin sees system-wide; stewards see only their own.

### 6.3 Charts — ✅ done
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

## Phase 9 — Collaboration, accounts & instance admin (mostly UNBLOCKED — see Phase 10)

> **Status update (2026-06-03).** The `fdp-server` parity build is essentially
> complete: server Phases 6–13 shipped, including search, publication state,
> API keys, runtime settings, schema/resource-definition admin, bootstrap
> config, operational endpoints, and factory reset. **Most of the items below
> are no longer blocked.** Phase 10 (next section) is the authoritative,
> endpoint-by-endpoint integration plan. The Phase 9 entries are kept for the
> legacy mapping but their "BLOCKED" framing is superseded by Phase 10.

These legacy-client features were listed when the matching `fdp-server`
endpoints did not exist. Each one's *current* server status is corrected in
the Phase 10 table.

### 9.1 Publication state & versioning — ✅ state done (10.3, verified live); ⬜ record versioning still open
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

### 9.4 API keys / personal access tokens — ✅ done (10.4, verified live)
- Legacy `ApiKeys`. Server: no token-issuing endpoint.

### 9.5 Metadata-schema lifecycle — DONE (text-first; visual canvas still Phase 4)

Server Phase 10.1 shipped `/schemas` (list/get public; PUT/DELETE admin;
`POST /schemas/{id}/validate`), so this is now wired:

- `src/api/schemas.ts` + `useSchemas` — list/get/put/delete/validate, with
  snake→camel response mapping (tested in `schemas.spec.ts`).
- `SchemaEditorView` (route `/schemas`, was a placeholder) is now a functional
  manager: lists published shapes, authors them as **Turtle** (text-first),
  publishes (`PUT`, admin), tests a sample record against the saved shape
  (`validate`), and deletes. Versioning is the server's `owl:versionInfo` at a
  stable IRI (shown as `v{n}`).
- The resource-type admin (9.6b) `schema` field is now a **picker**: a
  `<datalist>` of published shape IRIs (from `useSchemas`) + a link to
  `/schemas`. Two-step flow is guided: publish a shape → register a type
  pointing at it. Admin menu gained **Schemas** + **Resource types** entries.

Still future (Phase 4): the **visual** node-based SHACL canvas. Turtle is the
source of truth, so the text editor stays compatible with a later visual layer.
Also deferred (server-side, Phase 12 overlap): draft/release lifecycle and
version-history browsing.

### 9.6 Resource-definition configuration — ✅ done (9.6a dynamic type catalog + 9.6b admin UI)

The server is gaining runtime-mutable resource definitions (stored as RDF,
fronted by a `GET /resource-definitions` read catalog and an admin-gated
`/resource-definitions` CRUD surface; see fdp-server ADR-0009 and its task
list). This unblocks 9.6 and changes a foundational assumption in the client.
Coordinated work, in dependency order:

- **9.6a Dynamic type catalog — DONE.** `EntityType` is now an open `string`;
  the runtime catalog loads from `GET /resource-definitions` via
  `src/api/resourceDefinitions.ts` + `useResourceTypes` (TanStack Query,
  5-min staleTime). The composable exposes catalog-aware `specFor` /
  `typeForId` / `childSpecs` that prefer server defs and fall back to the
  static `ENTITY_SPECS` (now the offline-only fallback, still covering the
  DCAT types). `useEntityShape` now takes the resolved base spec (not a bare
  type) so runtime types resolve their `/spec` fields. `EntityCreateView`,
  `EntityEditView`, and `RecordDetailView` (its "new child" links) all resolve
  types through the composable, so a runtime-added type — and a child link
  added to an existing type at runtime — surfaces with no rebuild.
  `useInvalidateResourceTypes()` is exported for 9.6b to call after mutations.
  Known limitation: `classIri` is taken as the schema IRI (the FDP convention
  that the shape is stored at and targets the class IRI); a deployment whose
  shape IRI differs from its `sh:targetClass` would need the create form to
  read the target class from `/spec`.
- **9.6b Resource-definition admin UI — DONE.** `ResourceDefinitionAdminView`
  (route `/admin/resource-definitions`, admin-gated, linked from `UserMenu`)
  lists the deployment's types and their child links, and creates / edits /
  deletes them via the admin endpoints in `src/api/resourceDefinitions.ts`
  (`createResourceType` / `replaceResourceType` / `deleteResourceType`).
  Editing replaces the whole definition incl. child links — the
  "Catalog → Ontology" scenario is a child-link add on the Catalog type (a
  datalist offers existing prefixes as targets). Create validates url_prefix
  presence, reserved-path collisions, and uniqueness client-side for fast
  feedback (the server re-validates incl. schema existence). On edit, the
  prefix/name are locked (slug-stable; rename = create). Every mutation calls
  `useInvalidateResourceTypes()`, so new types appear across the app (browse,
  create forms, child links) without a reload. Root deletion is hidden (the
  server rejects it anyway).
- **9.6c Regenerate OpenAPI types — N/A for this surface.** The UI is driven
  by the runtime catalog (9.6a), not generated types — deliberately, since the
  per-type LDP paths are injected server-side per deployment. A future
  `npm run generate-api` would still pick up the static `/resource-definitions`
  request/response models, but nothing here depends on it.

### 9.7 Instance settings & branding — ✅ done (10.5; branding only per server-defined keys)
- Deployment title, theme, custom forms, links (legacy `FdpSettings`). Server:
  no settings endpoint.

### 9.8 FDP Index
- Registry of connected FAIR Data Points: ping, list, per-FDP detail, settings
  (legacy `IndexDetail`, `IndexPing`, `IndexSettings`). Server: no endpoint;
  the Index is typically a separate service.

### 9.9 Reset to defaults — ✅ done (10.7, verified live)
- Legacy `ResetToDefaults`. Server: no endpoint.

### 9.10 User profile page
- View/edit the signed-in user's profile (legacy `Profile`). Mostly IdP-backed;
  scope depends on 9.3.

---

## Phase 10 — Full server integration (server parity is done; wire it up)

The `fdp-server` repo finished its reference-implementation parity work. Almost
everything Phase 9 was "blocked" on now exists, and several places where the
client worked around a missing endpoint with **SPARQL** (search, the steward
dashboard, child listing) should migrate to the dedicated endpoints — they are
faster, paginated, faceted, and (critically) **publication-state-aware**, which
the SPARQL workarounds are not.

### Current server status of the legacy gaps

| Capability | Server endpoint (now) | Client today | Task |
| --- | --- | --- | --- |
| Publication state (draft/published/archived) | ✅ `POST /{record}/state`; state in `/me/dashboard` | ❌ inert placeholder | **10.3** |
| API keys / personal tokens | ✅ `GET/POST /me/api-keys`, `DELETE /me/api-keys/{id}` | ❌ none | **10.4** |
| Instance settings & branding | ✅ `GET /settings`, `PUT /settings/{key}` (admin) | ❌ none | **10.5** |
| Form autocomplete sources (admin) | ✅ `/settings/forms/autocomplete-sources`; `GET /forms/autocomplete` | ❌ none | **10.5 / 10.6** |
| Search filter config | ✅ `search.filters` settings key (drives facets) | ❌ none | **10.5** |
| Reset to factory defaults | ✅ `POST /admin/reset` (token-confirmed) | ❌ none | **10.7** |
| Bootstrap config | ✅ `GET /config` (oidc, features, profile) | ❌ hardcoded `.env` | **10.1** |
| Labels (IRI → human text) | ✅ `GET /labels?iri=…` | ❌ none (last-segment hack) | **10.6** |
| Steward "My data" | ✅ `GET /me/dashboard` (owned/editable/recent + state) | ⚠️ SPARQL (`useStewardRecords`) | **10.2** |
| Faceted/free-text search | ✅ `POST /search` + `/me/saved-queries` | ⚠️ SPARQL (`useSearch`) | **10.2** |
| Build/app info | ✅ `GET /info`; readiness `GET /readyz` | ❌ none | **10.8** |
| Membership / sharing | ❌ replaced by ODRL Offers (`dct:rights`) — use the Phase 5 ODRL editor, not a `/members` API | n/a | 9.2 stays out |
| User management | ❌ identities live in the IdP (ADR-0001); no `/users` | n/a | 9.3 stays out (IdP admin) |
| FDP Index | ❌ server Phase 8 deferred; separate service | n/a | 9.8 stays out (for now) |

### 10.0 Regenerate the OpenAPI contract (do this first) — ✅ done (2026-06-02)
- With the server running, `npm run generate-api` → refresh `src/api/schema.ts`.
  The spec now includes models for search, saved queries, API keys, state
  transitions, settings, `/config`, `/info`, and `/me/dashboard`. Everything
  below should use the regenerated types, not hand-written ones.
- **Done:** regenerated `src/api/schema.ts` against the running server (FDP
  v0.1.0, 26 paths). Gate green: typecheck, lint, and unit tests (86) all pass —
  no existing code broke against the new contract.
- **⚠️ Contract gap — the running server does not yet expose all of Phase 10.**
  Present now: `/config`, `/info`, `/readyz`, `/healthz`, `/labels`,
  `/me/dashboard`, `/settings`, `/settings/{key}`, `/forms/autocomplete`,
  `/spec`, `/expanded`, `/page/{child_prefix}`, `/resource-definitions`, metrics.
  **Missing:** `POST /search` + `/me/saved-queries` (10.2), `POST /{record}/state`
  (10.3), `/me/api-keys` (10.4), `POST /admin/reset` (10.7). Those tasks are
  **blocked on the server** until it ships these endpoints; re-run
  `npm run generate-api` once it does. 10.1 (`/config`), 10.5 (`/settings`),
  10.6 (`/labels` + `/forms/autocomplete`), 10.8 (`/info`,`/readyz`), and 10.9
  (`/expanded`,`/page`) are unblocked by the current contract.

### 10.1 Bootstrap config (`GET /config`) — ✅ done (2026-06-03)
- Read `/config` once at app start (before the router/OIDC init) and feed it
  into `userManager.ts` instead of the hardcoded `VITE_OIDC_*` values: the
  server returns `{ oidc: { issuer, audience, client_id_hint }, profile, features }`.
  Keep `.env` only for the API base URL and a local dev fallback.
- Gate optional UI on `features` (e.g. hide search if `features.search` is false,
  metrics if `features.metrics` is false).
- **Done:** new `src/api/config.ts` (`fetchBootstrapConfig`) + `src/stores/config.ts`
  (Pinia: `features`/`oidc`/`profile`/`loaded`/`available` + `isEnabled`). `main.ts`
  bootstrap now `config.load()` → `configureOidc(config.oidc)` → `auth.loadStoredUser()`
  → mount. `userManager.ts` gained `configureOidc` (issuer→authority,
  client_id_hint→client_id, env fallback). Routes carry `meta.feature`
  (search/sparql/metrics) gated in `beforeEach` via the pure `routeFeatureBlocked`
  helper; `AppHeader` hides the search box when `search` is off. `.env.example`
  documents `VITE_OIDC_*` as fallback. Tests: `config.spec.ts` (3),
  `userManager.spec.ts` (4), `featureGate.spec.ts` (3); full suite 111 green.
- **Design notes / deviations from the assumed shape:**
  - Real `FeatureFlags` = `{ metrics, sparql, data_provider, search, index }`
    (server defaults `search` + `index` **false**) — not the assumed set. Gated
    routes: search/sparql/metrics.
  - **Permissive fallback:** features default all-on and a feature is hidden only
    when the server *explicitly* returns `false`. If `/config` fails (it currently
    **500s on this box — Postgres down**, env-specific not a contract bug) the app
    still boots on `.env` OIDC + all features visible.
  - `oidc.audience` is **not** injected into the auth request (IdP-specific:
    Auth0 wants `extraQueryParams.audience`, Keycloak doesn't); only
    `authority`/`client_id` are wired. Revisit if a deployment needs it.

### 10.2 Migrate search + steward dashboard off SPARQL onto the real endpoints — ✅ done (2026-06-03)
- ✅ **Steward dashboard:** new `src/api/dashboard.ts` (`fetchDashboard`);
  `useStewardRecords` now reads `GET /me/dashboard` instead of SPARQL — main `rows`
  = owned ∪ editable (deduped by IRI, owned wins), `recent` surfaced as a
  "Recently updated" section in `StewardDashboardView`. `type_iri` mapped to
  kind/label via the catalog. Tests: `useStewardRecords.spec.ts` (2).
  - **Publication-state column (corrected 2026-06-03):** `DashboardItem` **does**
    carry `state` (verified live — `/me/dashboard` returns it, and the regenerated
    schema types it). `DashboardRow.state` is now surfaced as a draft/published/
    archived badge in `StewardDashboardView`, closing the 7.6 status-column
    follow-up **without** needing 10.3's transition endpoint. (An earlier note here
    wrongly said the field was absent — caught by live-stack verification.)
- ✅ **Search:** server `/search` shipped; regenerated the contract (`npm run
  generate-api`) and replaced `useSearch`'s SPARQL with `POST /search`. New
  `src/api/search.ts` (`runSearch` + types). `useSearch` builds the request from
  facet selections (`type` → `types[]`, `license` → `license`), paginates
  (offset/limit, `keepPreviousData`), and maps result `typeIri` → kind/label via
  the catalog; `SearchItem.state` is available. `SearchView` rebuilt: facet groups
  now render from the **response facet dimensions** (hardcoded type/theme/modified
  lists dropped), with prev/next paging and a result range from `total`.
- ✅ **Saved queries:** new `src/api/savedQueries.ts` + `useSavedQueries`
  (list/create/delete + admin `shared` toggle, cache-invalidating). `SearchView`
  gained a "Saved searches" panel (auth-gated): name + save the current query/facets,
  list, run (restores q+facets into the URL), delete own, admins toggle `shared`.
- Tests: `search.spec.ts` (4, search + saved-query clients); `dynamicTypeCatalog.spec.ts`
  useSearch cases rewritten to assert the `POST /search` request + result mapping.
  Full suite 137 green; typecheck+lint clean.
- **Live verification pending datastore:** `POST /search` 500s on this box because
  the index lives in **Postgres (:5432 down)**; `/me/saved-queries` → 401 (route
  live, auth-gated). Contract is complete and unit-tested with mocks; happy-path
  verify once Postgres is up. Facet *value* labels are best-effort
  (`license`→`licenseLabel`, IRI→`shortLabel`); refine with `/labels` (10.6) after
  seeing real values. (`FacetValue` carries no label; dimension `label` is server-set.)
- **Search** — replace the SPARQL body in `useSearch.ts` with `POST /search`
  `{ query, types[], license?, from?, to?, offset, limit }` → `{ items, total,
  facets: { type, license } }`. Render facet counts from the response (drop the
  hardcoded facet list in `SearchView.vue`); paginate with `offset`/`limit`;
  the result set is already policy- **and** state-gated server-side (anonymous
  sees only published). Facet *dimensions/labels* come from the server config,
  so don't hardcode them.
- **Saved queries** — new `src/api/savedQueries.ts` + a small UI (save the
  current search, list `GET /me/saved-queries`, run/delete; admins can toggle
  `shared`). CRUD: `GET/POST /me/saved-queries`, `PUT/DELETE /me/saved-queries/{id}`.
- **Steward dashboard** — point `useStewardRecords`/`StewardDashboardView` at
  `GET /me/dashboard` (`{ owned, editable, recent }`, each item carrying
  `record_iri`, `type_iri`, `title`, `state`, `last_modified`). This removes the
  SPARQL enumeration and gives you the **publication state** the dashboard's
  "status" column was waiting on (closes the 7.6 follow-up).

### 10.3 Publication state (unblocks legacy 9.1) — ✅ done + verified live (2026-06-04)
- **Done:** `src/api/state.ts` (`transitionState` POST `/{record}/state` `{to}`;
  `fetchRecordState` reads `fdp:metadataState` from `<record>/meta`;
  `allowedTransitions(current,isAdmin)` mirrors the server state machine —
  DRAFT→PUBLISHED, PUBLISHED→DRAFT/ARCHIVED owner-or-admin, ARCHIVED→DRAFT
  admin-only, else 409). `useRecordState` composable (state query + transition
  mutation; on success caches new state + invalidates record/dashboard/search/tree).
  Shared `StateBadge.vue` (green/grey/signal) used on **record detail**, the
  **steward dashboard** (replaced the inline chip), and the **browse/search card**
  (`SearchResult.state` + `useSearch` maps `SearchItem.state`). RecordDetailView
  gained owner/admin transition controls (Publish/Unpublish/Archive/Restore) with
  the 409/403 envelope surfaced inline, and its 404 copy now says a record "may be
  unpublished". EntityCreateView hints "saved as a draft — publish when ready".
  Tests: `state.spec.ts` (8) + `StateBadge.spec.ts` (3); suite 148 green;
  typecheck+lint clean.
- **✅ Verified live (2026-06-04, write path fixed):** server configured
  `FDP_TRIPLESTORE_GRAPH_STORE_ENDPOINT`. Round-trip PUBLISHED→DRAFT→PUBLISHED both
  200 with `{record, from_state, to_state}` (matches the client); `/meta` tracked
  each change; restored cleanly. State-hidden reads confirmed: while DRAFT,
  anonymous `GET` → 404 (the "may be unpublished" copy is exactly right), owner →
  200, and anonymous `/search` excluded it. The earlier 500 (graph-store endpoint
  unset) is resolved — record create/edit + repo edit are unblocked too.
- New `src/api/state.ts`: `POST /{record}/state` `{ to: "PUBLISHED" | "DRAFT" |
  "ARCHIVED" }` → `{ record, from_state, to_state }`. Surface the server's
  state machine in the UI (allowed: DRAFT→PUBLISHED, PUBLISHED→DRAFT (unpublish),
  PUBLISHED→ARCHIVED; ARCHIVED→DRAFT is **admin-only**; anything else → 409).
- Show a **state badge** (draft/published/archived) on record detail, the browse
  list, and the steward dashboard, and a publish/unpublish/archive control gated
  on owner-or-admin. Newly created records are `DRAFT` server-side, so the create
  flow should hint "saved as draft — publish when ready".
- Note: anonymous/non-owner reads of a non-published record now return **404**
  (state-hidden), and the SPARQL playground projection also excludes drafts for
  anonymous — adjust copy accordingly (a missing record may be an unpublished one).

### 10.4 API keys / personal access tokens (unblocks legacy 9.4) — ✅ done + verified live (2026-06-04)
- **Done:** `src/api/apiKeys.ts` (`listApiKeys`/`createApiKey`/`revokeApiKey`) +
  `useApiKeys` (list auth-gated + create/revoke mutations, cache-invalidating). New
  `ApiKeysView.vue` at `/account/tokens` (route `api-keys`, requiresAuth; UserMenu
  "Access tokens" item visible to all signed-in users). Create form (label +
  optional expiry) → **copy-once panel** showing the plaintext `key` once
  (never re-fetchable); list shows metadata only (`display_prefix`, dates,
  Active/Revoked chip) with per-key Revoke. 409/403 surfaced inline.
  Tests: `apiKeys.spec.ts` (3) + `ApiKeysView.spec.ts` (2, incl. the reveal-on-
  success). Suite 153 green; typecheck+lint clean.
- **Verified live (Postgres-backed, unaffected by the 10.3 write gap):** create →
  201 with `fdpk_…` key + `display_prefix`; list → 1; DELETE → 204; post-revoke the
  key stays listed as `active:false` (audit trail — UI shows "Revoked", hides the
  button). NB left one inert revoked test token (`verify-temp`) in admin's list.

Long-lived `fdpk_…` bearer credentials for scripts/CI, bound to the signed-in
subject. The **lowest-hanging Phase 10 item**: purely additive, no migration,
no cross-cutting state, no auth-interceptor change. Mirror the existing
`schemas.ts` / `useSchemas` patterns.

**Server contract** (fdp-server Phase 11.1 / ADR-0011 — already shipped). All
routes require auth (anonymous → 401). Bodies/responses are **snake_case, no
aliases** — map to camelCase in the client.

| Call | Request | Success | Errors |
| --- | --- | --- | --- |
| `POST /me/api-keys` | `{ "label": string, "expires_at"?: string\|null }` (ISO-8601 or null = non-expiring) | `201` `ApiKeyCreated` (= `ApiKeyInfo` + `key`) | `400 fdp.bad_request` (max reached → `details.max_per_user`; past/over-cap expiry → `details.max_ttl_days`); `404` if feature disabled |
| `GET /me/api-keys` | — | `200` `{ "keys": ApiKeyInfo[] }` (no `key`; includes revoked rows) | `404` if disabled |
| `DELETE /me/api-keys/{id}` | — | `204` | `403 fdp.forbidden` (not owner/admin); `404` not found / disabled |

`ApiKeyInfo` JSON: `{ id, label, display_prefix, roles[], groups[], created_at,
expires_at, last_used_at, revoked_at, active }`.
- `display_prefix` = `fdpk_Ab3dEf12…wxyz` — the **only** way to recognise a key
  later; render monospace.
- `key` (plaintext `fdpk_…`) appears **only** on `POST`, **once**, and is never
  re-fetchable.
- `active` = not revoked and not expired. `last_used_at` is throttled
  server-side (~60 s granularity).
- Keys are a credential for **any authenticated subject**, not a role-gated
  admin feature — the surface is for every logged-in user; an admin may *also*
  revoke anyone's key via the same `DELETE`.

**`src/api/apiKeys.ts`** (JSON endpoints — the axios interceptor already yields a
parsed envelope, so no `responseType:text`/`normaliseError` dance):

```ts
import { http } from "./http";

export interface ApiKey {
  id: string; label: string; displayPrefix: string;
  roles: string[]; groups: string[];
  createdAt: string; expiresAt: string | null;
  lastUsedAt: string | null; revokedAt: string | null; active: boolean;
}
/** A freshly minted key — carries the one-time plaintext `token`. */
export interface NewApiKey extends ApiKey { token: string; }  // server field `key`
export interface CreateApiKeyInput { label: string; expiresAt?: string | null; }

interface RawApiKey {
  id?: string; label?: string; display_prefix?: string;
  roles?: string[]; groups?: string[];
  created_at?: string; expires_at?: string | null;
  last_used_at?: string | null; revoked_at?: string | null; active?: boolean;
}
function toApiKey(raw: RawApiKey): ApiKey {
  return {
    id: raw.id ?? "", label: raw.label ?? "", displayPrefix: raw.display_prefix ?? "",
    roles: raw.roles ?? [], groups: raw.groups ?? [],
    createdAt: raw.created_at ?? "", expiresAt: raw.expires_at ?? null,
    lastUsedAt: raw.last_used_at ?? null, revokedAt: raw.revoked_at ?? null,
    active: Boolean(raw.active),
  };
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const res = await http.get<{ keys?: RawApiKey[] }>("/me/api-keys");
  return (res.data.keys ?? []).map(toApiKey);
}
export async function createApiKey(input: CreateApiKeyInput): Promise<NewApiKey> {
  const res = await http.post<RawApiKey & { key?: string }>("/me/api-keys", {
    label: input.label, expires_at: input.expiresAt ?? null,
  });
  return { ...toApiKey(res.data), token: res.data.key ?? "" };
}
export async function revokeApiKey(id: string): Promise<void> {
  await http.delete(`/me/api-keys/${encodeURIComponent(id)}`);
}
```

**`src/composables/useApiKeys.ts`** (mirror `useSchemas` + mutation helpers).
The created `token` is handed to the copy-once dialog by the caller and **MUST
NOT** be written into any cache or store:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type ComputedRef } from "vue";
import { listApiKeys, createApiKey, revokeApiKey,
         type ApiKey, type CreateApiKeyInput, type NewApiKey } from "@/api/apiKeys";

export const API_KEYS_KEY = ["api-keys"] as const;

export function useApiKeys(): {
  keys: ComputedRef<ApiKey[]>; isLoading: ComputedRef<boolean>; isError: ComputedRef<boolean>;
} {
  const query = useQuery({ queryKey: API_KEYS_KEY, queryFn: listApiKeys, staleTime: 60_000, retry: 1 });
  return {
    keys: computed(() => query.data.value ?? []),
    isLoading: computed(() => query.isLoading.value),
    isError: computed(() => query.isError.value),
  };
}
export function useCreateApiKey() {
  const client = useQueryClient();
  return useMutation<NewApiKey, unknown, CreateApiKeyInput>({
    mutationFn: createApiKey,
    onSuccess: () => client.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}
export function useRevokeApiKey() {
  const client = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: revokeApiKey,
    onSuccess: () => client.invalidateQueries({ queryKey: API_KEYS_KEY }),
  });
}
```

**`src/views/ApiKeysView.vue`** (`<script setup lang="ts">`, PrimeVue):
- **List** (`DataTable` of `useApiKeys().keys`) — columns: Label, Prefix
  (`displayPrefix`, monospace), Status badge, Created, Expires (`—` if null),
  Last used (`Never` if null), Actions (Revoke). Empty state: "No access tokens yet."
- **Status badge** derived from the row so the user sees *why* a key is inactive:
  `revokedAt` → grey "Revoked"; else expired (`expiresAt < now`) → amber
  "Expired"; else green "Active". Keep revoked/expired rows visible as history;
  sort active first.
- **"New token"** → create dialog: `label` (required, ≤256) + optional
  `expiresAt` (`DatePicker`, "Never expires" when blank) → `useCreateApiKey()`.
  Map errors with `parseFdpError`: `details.max_per_user` → "You've reached the
  maximum of N active tokens — revoke one to free a slot." (revoking frees a
  slot; revoked keys don't count); `details.max_ttl_days` → "Expiry can be at
  most N days out." On success → close create dialog, open the **copy-once dialog**.

**Copy-once dialog** (the one subtle part):
- Shows the full plaintext token + a **Copy** button + a clear "this is the only
  time you'll see it" warning, plus the `Authorization: Bearer fdpk_…` hint.
- The token lives **only** in a local `ref<string|null>` — never Pinia, TanStack
  cache, `localStorage`/`sessionStorage` (CLAUDE.md), or the URL.
- **Copy** → `navigator.clipboard.writeText` + Toast; provide a readonly,
  selectable `InputText` fallback for denied/non-secure-context clipboard.
- **Non-dismissible** (`:closable="false"`, no Escape/overlay close) so the token
  can't vanish before it's copied; only **Done** closes it. On Done → set the ref
  to `null` (drop the secret) and reset the form. The list already refreshed via
  the mutation's `invalidateQueries`, so the new key appears as metadata.
- A11y: focus the token field on open; `aria-live="polite"` warning; labelled Copy.

**Routing + nav:**
- Route: `{ path: "/account/tokens", name: "api-keys", component: () =>
  import("@/views/ApiKeysView.vue"), meta: { title: "Access tokens",
  requiresAuth: true } }` (no role — every authenticated user; the guard handles
  anonymous, the server enforces too).
- `UserMenu.vue` entry gated on **`auth.isAuthenticated`** (broader than the
  existing `isAdmin`/`isSteward` items): an "Access tokens" `@click="gotoTokens"`.

**Tests:**
- `apiKeys.spec.ts` (vi.mock `./http`): `listApiKeys` maps snake→camel;
  `createApiKey` sends `expires_at` and surfaces `key` as `token`; `revokeApiKey`
  hits the URL-encoded `DELETE`.
- `ApiKeysView.spec.ts`: create → copy-once dialog shows the token; **Done**
  clears it from the DOM; revoke calls the mutation; status badge reflects
  revoked/expired/active; the `max_per_user` 400 renders the friendly message.

**Acceptance:** (1) create shows the token **once** in a non-dismissible dialog,
copied, then absent from app state; (2) list shows it Active with its
`displayPrefix`, never the secret; (3) revoke → Revoked, freeing a capped slot;
(4) anonymous blocked by guard (+ 401); (5) `npm run lint && type-check &&
test:run` green.

**Out of scope:** no rotate (= revoke + create), no post-create editing (server
is create/list/revoke only), no change to the SPA's OIDC auth interceptor (an
`fdpk_` token is what a *user's script* sends, not the SPA).

### 10.5 Instance settings & admin config (unblocks legacy 9.7 + search-filter config) — ✅ done (2026-06-03)
- New `src/api/settings.ts`: `GET /settings` (public, returns all keys merged
  with defaults) and `PUT /settings/{key}` (admin, per-key Pydantic-validated).
- Admin **Settings** view to edit the runtime keys the server exposes:
  `forms.autocomplete-sources` (the autocomplete source list — see 10.6) and
  `search.filters` (which facet dimensions + labels the search page shows — this
  is what 10.2's facets read). Surface server 422 validation inline.
- (Branding/theme keys only as far as the server defines settings keys for them;
  don't invent keys the server doesn't validate.)
- **Done:** `src/api/settings.ts` (`fetchSettings`/`putSetting`/`resetSetting`) +
  `src/composables/useSettings.ts` (query + `useInvalidateSettings`). New
  `SettingsView.vue` at `/admin/settings` (route `instance-settings`, link in
  UserMenu, admin-gated; `cog` icon added to `AppIcon`). It renders **whatever keys
  the server reports** (sorted) rather than a hardcoded list, so new server-defined
  keys appear automatically. Each key edited via `SettingEditor.vue` — a JSON
  editor: the OpenAPI types each value only as an open object and the server
  validates the shape per key, so we parse + object-check client-side and surface
  the server **422 inline** (`parseFdpError` → title/message/violations); non-admins
  get read-only. `DELETE` resets a key to default.
- Tests: `settings.spec.ts` (4) + `SettingEditor.spec.ts` (4, incl. invalid-JSON /
  non-object rejection without hitting the server). Full suite 131 green;
  typecheck+lint clean.
- **Notes:** values are free-form objects in the contract, so no per-field forms
  were invented (per the "don't invent keys" guidance) — a JSON editor is the
  faithful surface; `search.filters`/`forms.autocomplete-sources` edit cleanly this
  way. `/settings` **500s on this box** (Postgres down — env, not contract); the
  view shows the error state until the stack is up. When `search.filters` lands its
  real shape, 10.2 reads it for facets; 10.6 autocomplete source names live under
  `forms.autocomplete-sources`.

### 10.6 Labels + form autocomplete (polish the existing forms) — ✅ done (2026-06-03)
- `GET /labels?iri=<…>&iri=<…>` → `{ labels: { iri: text } }`. Batch-resolve
  `dct:license`, publisher, and theme IRIs in record detail + search facets so
  users see "Creative Commons Attribution 4.0", not a URL. Replace the
  last-IRI-segment hack in `rdf.ts`.
- `GET /forms/autocomplete?source=license&prefix=cc` → suggestion list. Wire it
  into `EntityForm.vue` for license/publisher/MIME pickers (the sources are the
  ones managed in 10.5).
- **Done — labels:** new `src/api/labels.ts` (`fetchLabels`, batches into repeated
  `iri` params, dedupes, skips empty) + `src/composables/useLabels.ts` (keyed on
  sorted IRI set, `retry:false`, `labelFor` falls back to `shortLabel`). `mapRecord`
  now also emits raw `themeUris`; `PropList.vue` resolves publisher/license/theme
  IRIs via `useLabels` and renders the resolved text, **falling back** to the
  mapper's short labels (so it degrades gracefully — the `rdf.ts` hack stays only
  as that fallback, no longer the primary display).
- **Done — autocomplete:** new `src/api/autocomplete.ts` + `useAutocomplete.ts`
  (reactive source+prefix, `keepPreviousData`, `retry:false`). `FieldSpec` gained an
  optional `autocomplete` source; set on publisher→`publisher`, license→`license`,
  theme→`theme`, format→`mime`. New `AutocompleteInput.vue` (native `<datalist>`,
  200ms-debounced prefix, IRI as option value + label as hint) wired into
  `EntityForm.vue` for single-value text/iri fields. Field stays free-text;
  failed/missing source → no suggestions.
- Tests: `labels.spec.ts` (3) + `autocomplete.spec.ts` (3); `RecordDetailView.spec`
  exercises the PropList label fallback. Full suite 117 green; typecheck + lint clean.
- **Notes:** `/labels` + `/forms/autocomplete` currently **500 on this box**
  (Postgres/triplestore down — env, not contract); the graceful fallbacks are what
  let the UI keep working. Autocomplete **source names** (`publisher`/`license`/
  `theme`/`mime`) must match the server's configured sources (10.5) to return data.
  Search-**facet** label resolution is deferred to **10.2** (facets are still
  hardcoded placeholders until `POST /search` returns real facet dimensions).

### 10.7 Reset to factory defaults (unblocks legacy 9.9) — ✅ done + verified live (2026-06-04)
- Admin-only destructive action: `POST /admin/reset` with body
  `{ "confirmation": "reset-to-factory-defaults" }` (the server requires the
  literal token; surface a "type this to confirm" field). Truncates runtime
  settings and re-applies the bundled profile. Put it behind a clear double
  confirm in the admin area; invalidate **all** TanStack Query caches on success.
- **Done:** `src/api/admin.ts` (`resetToFactoryDefaults` + exported
  `RESET_CONFIRMATION_TOKEN` = `"reset-to-factory-defaults"`, confirmed against
  server `metadata/admin.py`). New `ResetPanel.vue` — a "danger zone" embedded in
  the admin `SettingsView` (admin-only): the Reset button is disabled until the
  admin types the exact token (the "type this to confirm" gate); on success it
  invalidates **all** query caches (`queryClient.invalidateQueries()`) and reports
  the re-applied counts (profile name/version, settings cleared, schemas, offers,
  resource definitions, seed records). 409/validation surfaced inline.
- Tests: `admin.spec.ts` (2) + `ResetPanel.spec.ts` (3: button gated on the exact
  phrase; runs + reports on success; no-op on a wrong phrase). Suite 158 green;
  typecheck+lint clean.
- **✅ Executed live (2026-06-04):** `POST /admin/reset` → 200
  `{profileName:default, profileVersion:0.1.0, settingsCleared:0, schemas:5,
  offers:1, resourceDefinitions:5, seedRecords:0}`. Post-reset healthy: readyz
  ready, search total 6 (records intact), 5 resource types, config 200. Re-applied
  the profile + cleared runtime settings; existing records survived (seedRecords:0).

### 10.8 Operational surfaces (small) — ✅ done (2026-06-02)
- Footer build info from `GET /info` (commit, version, profile name+version,
  features). Optional: a readiness indicator from `GET /readyz` (checks triple
  store / Postgres / OIDC) for an admin status strip.
- **Done:** new `src/api/info.ts` (typed `fetchAppInfo`/`fetchReadiness` +
  `buildLabel`/`failedChecks` helpers) and `src/composables/useAppInfo.ts`
  (`useAppInfo` cached for the session; `useReadiness` admin-gated, polled 60s).
  `AppFooter.vue` now shows the connected server's build live (`{name} v{version}
  · {short-commit|environment}`, full detail in the hover `title`); admin-only
  `ReadinessStrip.vue` renders an ok/degraded chip on the right. Query keys
  `appInfo`/`readiness` added. Tests: `info.spec.ts` (8) + `ReadinessStrip.spec.ts`
  (4); full suite 98 green; typecheck + lint clean.
- **Contract note:** the server's `/info` carries `name/version/environment/
  build{commit,built_at}/runtime{python_version}` — **no** `profile`/`features`
  (those live in `/config`, task 10.1), so the footer shows what `/info` actually
  returns. `/readyz` answers **503** with a full `ReadinessReport` body when
  degraded; the fetcher accepts 503 instead of throwing.

### 10.9 Use the LDP read-extensions instead of SPARQL where they exist — ✅ done (2026-06-03)
- Child listing: the catalog tree / children currently lean on SPARQL
  `GRAPH ?g`. Prefer `GET /{prefix}/{id}/page/{childPrefix}` (paginated, gated)
  and `GET /{prefix}/{id}/expanded` (record + ancestors in one call) — these
  remove the named-graph-name coupling and respect publication state. `/spec`
  is already in use (7.5); fold `/page`/`/expanded` in the same way.
- **Done:** new `src/api/extensions.ts` — `fetchChildrenPage(parentId, childPrefix,
  {limit,offset})` and `fetchExpanded(path)`. Both endpoints return **negotiated
  RDF (Turtle), not JSON** (the OpenAPI advertises `application/json` but the
  handlers serialize RDF — verified in server `metadata/extensions.py`), so they're
  parsed with `rdf.ts`, **no hand-written response types** (CLAUDE.md). `/page` reads
  each child's `dct:title`+`rdf:type` from the graph and `X-FDP-Page-Total` from the
  header (added `typedSubjects` to `rdf.ts`).
- **`useTree` rewritten off SPARQL onto `/page`:** catalog-driven (top types =
  root def's children; members = their children, via `useResourceTypes`), eager two
  levels keeping the existing `TreeNode` shape; per-branch failures degrade to empty
  rather than failing the whole tree; root title via LDP `readGraph("")`. DCAT
  fallback retained.
- **Breadcrumbs now real via `/expanded`:** new `useAncestors(id)` composable walks
  `dct:isPartOf` in the expanded graph (root→current); `RecordDetailView` replaced
  its **hardcoded** `["Cohort studies", …]` placeholder with it.
- Tests: `extensions.spec.ts` (6); `dynamicTypeCatalog.spec.ts` useTree case updated
  to assert `/page` paging by catalog prefixes. Full suite 123 green; typecheck+lint clean.
- **Notes:** `/page`+`/expanded` **500 on this box** (Postgres/triplestore down — env,
  not contract); graceful fallbacks cover it. **Not migrated (deliberately):**
  `useCatalogs` still uses SPARQL — the browse list reports a per-catalog child
  *count* that `/page` only gives via a header per call (N+1); revisit with 10.2
  or when a count is exposed. `useRecord`'s distribution fetch (SPARQL `VALUES`) is
  record-detail, not child-listing — left as-is.

### Stays out of scope (server deliberately omits — do not build against absent APIs)
- **Membership / sharing (9.2):** there is no `/members` API by design —
  per-record access is ODRL Offers on `dct:rights`. The path is the **Phase 5
  ODRL editor**, not a members CRUD.
- **User management (9.3):** identities are owned by the IdP (Keycloak); manage
  users there. Only revisit if the server grows a deliberate users facade.
- **FDP Index (9.8):** server Phase 8 is deferred and is a separate service.

---

## Phase 11 — Integration audit & cleanup (2026-06-02)

Findings from an audit of how the client actually talks to the live server
(running FDP **v0.1.0**). Two items below are **new** (not covered by Phase 10);
the rest are a prioritised cross-reference so the audit is captured in one place.
Sequencing recommendation at the end.

### 11.1 Resolve the dev-networking half-state (NEW — ✅ done 2026-06-03, Option A / CORS-only)
- **Decision: Option A (CORS-only).** Removed the dev proxy from `vite.config.ts`
  (the SPA talks to the API directly at `VITE_FDP_API_URL`); rewrote the config
  docstring to state the model and the same-origin requirement.
- `src/main.ts` now warns in dev when `window.location.origin !==
  VITE_PUBLIC_ORIGIN` (the localhost-vs-127.0.0.1 trap behind the historical
  "server unreachable" reports), pointing at the three things that must agree:
  `VITE_PUBLIC_ORIGIN`, the server `FDP_CORS_allow_origins`, and the Keycloak
  redirect URI.
- `.env.example` documents the CORS-only model and the origin coupling.
- Gate green (typecheck/lint/101 tests).

(historical plan kept below for context)

#### Original 11.1 plan
**Problem.** `vite.config.ts` defines a dev proxy ("so the SPA can use relative
URLs without CORS") for `/api`, `/sparql`, `/openapi.json`, but `.env` sets
`VITE_FDP_API_URL=http://localhost:8000` and `src/api/http.ts` uses it as an
**absolute** `baseURL` — so every request goes cross-origin and **bypasses the
proxy entirely**. Consequences:
- The proxy only lists three prefixes; it does **not** cover the LDP write paths
  the client actually `PUT`s to (`/`, `/{type}/{id}`, `/meta` in
  `src/api/records.ts`). So the proxy couldn't carry writes even if used.
- Working writes depend entirely on the server CORS allow-list matching the
  **exact** origin spelling. `localhost` ≠ `127.0.0.1` to the browser (the
  server 400s the mismatch); the OIDC `redirect_uri` (`userManager.ts`) and the
  Keycloak-registered URI must agree too. This is the root of the historical
  "server unreachable" incidents (see the CORS memory note).

**Plan — pick ONE model and make it coherent:**
- **Option A (CORS-only, recommended):** delete the dev proxy from
  `vite.config.ts`; keep `baseURL` absolute; document the hard requirement that
  the SPA origin, the server `FDP_CORS_allow_origins`, and the Keycloak redirect
  URI use the **same** host spelling. Add a startup console warning in dev when
  `window.location.origin` is not the configured `VITE_PUBLIC_ORIGIN`.
- **Option B (proxy-everything):** set `baseURL` relative (`"/"`) in dev; widen
  the proxy to forward all server routes the client uses (root LDP paths,
  `/config`, `/labels`, `/me/*`, `/settings`, `/info`, `/readyz`, `/resource-
  definitions`, …). Tricky because root LDP paths (`/{type}/{id}`) collide with
  the SPA router paths — would need a path-prefix discriminator, so Option A is
  cleaner.
- Decision needed from maintainer (A vs B). Either way: a short `docs/`/README
  note on the localhost-vs-127.0.0.1 origin coupling.
- Test: a unit assertion that `http` `baseURL` matches the chosen model; manual
  verify of a record edit round-trip (the historical failure case).

### 11.2 Finish adopting the dynamic type catalog in the read composables (NEW — ✅ done 2026-06-03)
All three read composables now derive their `rdf:type` filters and labels from
`useResourceTypes` instead of hardcoded DCAT maps; a type registered in the admin
UI is now visible to search, the tree, and the steward dashboard. Gate green
(typecheck/lint/101 tests).
- ✅ **Steward dashboard (2026-06-02):** `useStewardRecords` — uses the catalog
  `classIri` and `label`; DCAT `kind` kept only for TypeTag colour; `enabled`
  once the catalog loads, re-keyed on it.
- ✅ **Search (2026-06-03):** `useSearch` builds the `?type IN (…)` list from the
  catalog and resolves selected facet prefixes → class IRIs (the facet `value`s
  turned out to be type *prefixes*, not RecordKinds, so they map straight through
  `specFor`); unfiltered search now spans every registered type; result rows
  labelled from the catalog. Note: `SearchView.vue`'s facet *list* + counts stay
  hardcoded placeholders until 10.2 wires `POST /search` facets.
- ✅ **Tree (2026-06-03):** `useTree` derives container classes from the root
  definition's children and member classes from *their* children; falls back to
  DCAT (Catalog → Dataset/DataService) when the catalog is empty so it works
  pre-load/offline.
- Tests: `src/composables/dynamicTypeCatalog.spec.ts` (3) — custom `biobank` type
  is searchable and appears in the tree query.
**Problem.** `useResourceTypes` (from `GET /resource-definitions`, added in
"Dynamic API endpoint support") drives create/edit/detail/admin, but the **read**
composables still hardcode the DCAT class maps: `TYPE_IRI`/`TYPE_LABEL` in
`useSearch.ts`, `CLASS_MAP` in `useStewardRecords.ts`, and the
`dcat:Catalog`/`dcat:Dataset` literals in `useTree.ts`. A custom resource type
created in the admin UI is therefore **editable but invisible** to search, the
tree, and the steward dashboard. This is a user-visible correctness bug and is
independent of the Phase-10 SPARQL→endpoint migration (it applies to the SPARQL
fallback too).

**Plan:**
- Derive the type→{kind,label,iri} map from `useResourceTypes` (the resource
  definitions carry `urlPrefix`, `name`, and the target class) instead of the
  hardcoded constants. Keep the built-in DCAT entries as the fallback when the
  catalog hasn't loaded, mirroring `staticSpec` fallback in `useResourceTypes`.
- `useSearch`/`useStewardRecords`: build the `?type IN (…)` list and the
  display-label lookup from the resolved catalog; map unknown classes to a
  neutral "Resource" label rather than defaulting to `dataset`.
- `useTree`: enumerate container/child types from the catalog's parent→child
  relations rather than the fixed Catalog→Dataset assumption.
- Tests: extend `useSearch`/`useStewardRecords` specs with a custom resource
  type fixture; assert it classifies and is returned. (When 10.2 lands the real
  `/search`, the server returns types directly and this client-side map shrinks
  to label resolution — write 11.2 so it composes with that, not against it.)

### 11.3 Cross-reference — already planned under Phase 10
The remaining audit findings map onto existing tasks; recorded here so the audit
is complete. Status reflects the live v0.1.0 contract (see 10.0).

| Finding | Task | Server endpoint present on live v0.1.0? |
| --- | --- | --- |
| OIDC config + feature flags hardcoded in `.env`, ignore `GET /config` | **10.1** | ✅ yes — unblocked |
| Last-IRI-segment label hack (`rdf.ts shortLabel`) instead of `GET /labels` | **10.6** | ✅ yes — unblocked |
| Free-text inputs instead of `GET /forms/autocomplete` | **10.6** | ✅ yes — unblocked |
| Tree/children via `GRAPH ?g` SPARQL instead of `/expanded` + `/page` | **10.9** | ✅ yes — unblocked |
| Search via hand-rolled SPARQL (no paging/facets/state-gating) → `POST /search` | **10.2** | ❌ no — blocked on server |
| Steward dashboard lists all records, no state → `GET /me/dashboard` | **10.2** | ❌ no — blocked on server |
| No publication-state badge/controls; 404-as-unpublished copy → `POST /{record}/state` | **10.3** | ❌ no — blocked on server |

- **Client-doable prep while 10.3 is server-blocked:** soften the record-detail
  404 copy to "this record may not exist *or* may be unpublished", and add a
  "saved as draft — publish when ready" hint to the create flow. Pull these into
  10.3's scope or do as a tiny standalone.

### Recommended sequencing
1. **11.2** (dynamic type catalog) — self-contained, testable now, fixes a real
   correctness bug. No maintainer decision needed.
2. **10.1** (`/config`) then **10.6** (`/labels` + autocomplete) then **10.9**
   (`/expanded`/`/page`) — all unblocked against live v0.1.0, high leverage.
3. **11.1** (networking) — needs a maintainer A-vs-B decision first.
4. **10.2 / 10.3 / 10.4 / 10.5 / 10.7** — gated on the server shipping
   `/search`, `/me/dashboard`, `/{record}/state`, `/me/api-keys`, `/settings`,
   `/admin/reset`; re-run `npm run generate-api` when it does.

---

## Open items

- Theme tokens and final design system (likely arrives via Claude Design
  handoff; see UX-DESIGN-BRIEF.md).
- Accessibility audit pass once visual surfaces stabilize.
- Internationalization — not in scope for v1 but the messaging layer should
  not block it.
