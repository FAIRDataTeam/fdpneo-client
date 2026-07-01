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

## Phase 4 — Visual SHACL editor — ✅ DONE (4.0–4.5 built & verified; only minor polish left)

**Status (2026-06-05):** the visual editor ships end-to-end under
`src/components/shacl-editor/` + the `shaclEditor` store, folded into
`SchemaEditorView` as SHACL / Visual Editor / Form Preview tabs. All sub-tasks
(4.0 model/serializer/parser/widgets, 4.1 Vue Flow graph, 4.2 form designer +
DnD + inspectors + keyboard a11y, 4.3 Monaco SHACL tab + sync, 4.4 Form Preview +
annotated server validation, 4.5 undo/redo) are done and verified live
(Playwright + real Keycloak/server). ~216 unit tests; typecheck/lint/build green.
Non-blocking polish remains (noted per task): the field inspector's read-only
"group" line, a richer DnD drag image, and seeding the graph from
`useResourceTypes`. Original pre-build status retained below for history.

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

### 4.0 Shared model + serializer + parser — ✅ DONE (foundation; lossless round-trip)
The framework-independent core all three tabs sit on. `npm run typecheck` +
`eslint` clean; the `src/components/shacl-editor/` suite (model/serialize/parse/
widgets/factories/graph/violations/preview/status) is green, incl. lossless
round-trip over arbitrary input.

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
- ✅ **Lossless for *arbitrary* input** (the original core risk): the parser
  captures every triple the model doesn't read as residual Turtle fragments —
  per field (inside the `sh:property [ … ]` block), per shape, per group, and
  whole other subjects as a document block — re-emitted verbatim on serialize. A
  recursive term serializer inlines blank-node subtrees (`sh:or` lists, nested
  shapes) so references stay intact. Also made `sh:order` nullable so an
  unordered property round-trips exactly. +3 tests (`sh:closed`, `sh:or`, extra
  `rdf:type`, `sh:hasValue`, separate subject → zero triples dropped, idempotent).
  **Verified live**: added a field in the designer to a shape using those features
  → all preserved on save. So editing never silently drops unmodeled triples.
- ✅ Wired into `SchemaEditorView` (the Visual Editor / SHACL / Preview tabs).

### 4.1 Shape graph (Vue Flow overview) — ✅ DONE (verified live)
- ✅ Landed: `ShaclCanvas.vue` (Vue Flow) + `ShapeNodeCard.vue` (node card:
  label · target class · property count, with edge handles) + `graph.ts`
  (`buildShapeGraph` — pure model → nodes/edges) + Pinia `shaclEditor` store
  (positions + selection, keyed by **stable `shapeIri`**, UI-only). Edges from
  `sh:node` (by shape IRI) and `sh:class` (by target class), `sh:node` preferred.
- ✅ Model extended losslessly with `sh:node` (model/serialize/parse/factories),
  needed for the edges. +8 tests (graph 5, store 3 → 194 total green).
- ✅ Mounted behind a minimal 2-tab chrome (SHACL / Visual Editor) in
  `SchemaEditorView`; the canvas reads the live-parsed `docModel`. **Verified in
  the running app** (Playwright + real Keycloak login): a 2-shape schema renders
  two draggable node cards + the `dcat:distribution` `sh:node` edge, 0 console
  errors. Vue Flow's deeply-generic `Node` type needs a cast at assignment (TS2589).
- ✅ **Seed from `useResourceTypes`**: registered types this schema has no shape
  for render as muted/dashed **ghost** nodes ("no shape yet"), non-interactive; a
  `sh:class` can link to one. `buildShapeGraph` gained `key`/`ghost` + a `types`
  arg; new `compactIri` (in `namespaces.ts`) reconciles full type-class IRIs with
  the model's prefixed `targetClass`. +5 tests. **Verified live** (Dataset-only
  schema → 1 real + 4 ghosts, ghosts don't drill in, real does, 0 console errors).
- ✅ Keyboard-navigable canvas + drill-into-designer landed in the a11y pass / 4.2.
  Graph⇄designer composition settled (drill-in; back to the graph from the bar).

### 4.2 Per-shape form designer (the handoff 3-column workbench) — ✅ DONE (verified, incl. a11y + polish)
- ✅ Landed: the 3-column `FormDesigner.vue` (drill-in from a graph node) +
  `WidgetPalette.vue` (searchable, categorised **full DASH** set) + `FieldCard.vue`
  (glyph · name · required ● · multi badge · mono meta · duplicate/delete) +
  `FieldInspector.vue` (name/description/path, min/max count, nodeKind, datatype
  for Literal / class for IRI, `sh:in`). Group add/rename/delete and schema
  name/target-class inline in the canvas header.
- ✅ Pure `mutations.ts` (add/update/delete/duplicate field, move across groups,
  add/update/delete group, update shape — clone + renumber `sh:order`). Clones
  via **JSON** not `structuredClone` (callers pass a Vue reactive proxy). +9 tests.
- ✅ Wiring: the Visual Editor holds a **persistent `model`** (parsed once on tab
  entry, mutated in place so client ids — hence field selection — stay stable),
  re-serialised to Turtle on every edit. Serializer now always declares its own
  vocab prefixes (sh/dash/rdf/rdfs/xsd) so emitting `dash:editor` never produces
  undeclared-prefix Turtle.
- ✅ **Verified live** (Playwright + Keycloak): drilled into a shape, added a
  Boolean widget, edited its label in the inspector → SHACL tab showed valid
  "✓ 2 shapes · 4 properties", 0 console errors. (Two real bugs found & fixed in
  the process: structuredClone-on-proxy; undeclared `dash:` prefix.)
- ✅ **Drag-and-drop** (HTML5): palette→canvas drop creates a field at the drop
  index; field cards have a grip and drag to reorder within a group or move across
  groups; a 3px insertion bar + empty-group highlight show the drop point.
  Click-to-add is kept as the fallback. **Verified live** (drag adds the correct
  widget at the drop index; reorder last→top works; 0 console errors). New `grip`
  AppIcon. +`moveField` already covered by mutation tests.
- ✅ Inspector polish (verified live): field inspector now has the `sh:in`
  **chip** editor (Enter to add, × to remove), `sh:pattern` + min/max-length, and
  a Defaults & order section. New **`GroupInspector`** (label/order/delete) and
  **`SchemaInspector`** (identity, shape IRI/target class, **`@prefix` table**
  editor via `setPrefixes`); the inspector is now context-sensitive
  (field/group/schema) with a `Selection` model. +1 mutation test (204 total).
- ✅ **Keyboard a11y** (4.1 + 4.2): graph nodes are focusable (`tabindex`/role/
  aria-label) with Enter/Space to drill in; field cards are focusable with
  Enter/Space to select and **Alt+↑/↓ to reorder** (the accessible alternative to
  drag); focus-visible rings; `role="region"`+aria-label on the canvas and the
  three workbench panels. **Verified live** (Playwright keyboard-only): focus a
  node → Enter drills in; focus a field → Enter selects → Alt+↓ reorders
  (Title moved below Description), valid Turtle, 0 console errors.
- ✅ Polish done (verified live): the field inspector's **read-only "Group" line**
  (shows the field's group + "move by dragging into another group") and a **custom
  drag image** (`dragImage.ts` — an accent chip with grip glyph + label, for both
  palette drags and field-card reorders). DnD unaffected (drag-add still works).

### 4.3 Three-tab chrome + bidirectional sync — ✅ DONE (verified live)
- ✅ Landed: `TurtleEditor.vue` (Monaco + Turtle Monarch grammar, light/dark
  themes, slim API — clones `SparqlEditor.vue`) and `status.ts` (`shaclStatus`,
  pure/non-destructive parse status). Wired into `SchemaEditorView`: the Turtle
  textarea is now Monaco with a live status pill (✓ N shapes · M properties /
  ✕ Invalid SHACL), an error strip, and a Copy button. **Text in/out only — no
  reserialise**, so it's safe ahead of the pass-through work. +4 tests (28 total).
- ✅ **3-tab chrome** done (built inline in `SchemaEditorView`, not a separate
  `SchemaTabs.vue`): SHACL / Visual Editor / Form Preview, with the **NEW pill** on
  Visual Editor and a **red dot** on the SHACL tab when the Turtle fails to parse.
- ✅ **Tidy** — a **lossless n3 reformat** (`tidyTurtle`), not a model reserialise:
  model reserialise would drop SHACL features the model doesn't capture (and the
  count-based lossless check fails for any shape without explicit groups, since
  the serializer adds group structure). Disabled while the Turtle is invalid. +3
  tests. **Verified live** (reformats a messy shape, keeps `sh:closed`, stays valid).
- ✅ **Bidirectional sync**: Visual edit → model → serialize → Turtle (live);
  SHACL edit → parse → model on entering the Visual/Preview tab (the right
  granularity for a tabbed UI — you never see two tabs at once). NEW/red-dot +
  Tidy **verified live**, 0 console errors.
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

### 4.4 Validation against sample RDF — ✅ DONE (Form Preview + annotated violations; verified end-to-end)
- ✅ **Form Preview tab** (third tab): `ShaclFormPreview.vue` renders a fillable
  form from the focused shape, dispatching on the **full DASH** widget set via a
  pure `preview.ts` (`previewKind` keys off SHACL constraints first, widget hints
  second — so it works for parsed shapes with no `dash:editor`). Throwaway local
  values; a **"Validate record"** button runs the client-side required-fields
  check (`sh:minCount ≥ 1`) → green/red banner + red border on empty required
  inputs; **Clear** resets. Shape picker when the doc has several. +5 tests.
- ✅ **Verified live** (Playwright + Keycloak): 3 fields render (date picker for
  `xsd:date`, `<select>` for `sh:in`), validating with the required Title empty →
  "1 required field still needs a value" + invalid highlight; filling it → green
  banner; 0 console errors. New `eye` AppIcon.
- ✅ **Server violations annotated on the canvas**: `validateSample` results are
  stored in the `shaclEditor` store; a pure `violations.ts` (`fieldViolations` /
  `shapeViolationCounts`, expanding each field's prefixed path to a full IRI to
  match the server's `resultPath`) maps them onto fields. Field cards show a ⚠
  marker + red border; shape nodes show a ⚠ count badge; edits to the Turtle clear
  them. +8 tests. **Verified end-to-end** (publish a shape → validate a sample
  missing a required `dct:title` → server "Less than 1 values" → Title field +
  Dataset node annotated), 0 console errors.

### 4.5 Undo/redo + wiring — ✅ DONE (verified live)
- ✅ Undo/redo over the editor model — a snapshot stack in the `shaclEditor`
  store (`record`/`undo`/`redo`/`resetHistory` + `canUndo`/`canRedo`, capped at
  100). The view records the pre-edit document on every Visual Editor change;
  Undo/Redo toolbar buttons + **Cmd/Ctrl+Z / +Shift+Z** (scoped to the Visual tab
  so Monaco keeps its own undo on the SHACL tab). History resets per editing
  session (on entering the tab). +3 store tests. **Verified live**: add field →
  Undo → Redo → keyboard-Undo all step the model and Turtle correctly.
- ✅ Editor folded into `SchemaEditorView` as the SHACL / Visual Editor / Form
  Preview tabs, with the **SHACL tab as the raw-RDF fallback**; save via the
  existing schema `PUT` (proven by the 4.4 publish round-trip).

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

## Phase 5 — Visual ODRL editor — ✅ MOSTLY DONE (5.0–5.2, 5.4, 5.5 built & verified live 2026-06-06/07; only 5.3 Agreement history is server-blocked)

A **guided** Offer composer (not a canvas) at `/policies` →
`PolicyEditorView.vue`, under `src/components/odrl-editor/`. Much smaller than
Phase 4: no Vue Flow, no DnD — typed forms + a live Turtle preview. Because
offers are now first-class managed records (below), the view is a **full
lifecycle surface** like `SchemaEditorView`: list → load → compose → validate →
save → delete.

**✅ Server `/policies` + `/licenses` are now LIVE** (verified on the running
server 2026-06-06; server ADR-0012 / Phase 14). ODRL is first-class — the
earlier "server gap" is closed. Both subsystems are symmetric with `/schemas`
(JSON list/validate, `text/turtle` get/put; snake_case raw + camelCase mappers):

- **`/policies`** — `odrl:Offer` docs, profile-validated **on every write** and
  **PDP-enforced** via `dct:rights`. `GET /policies` → `{ policies: PolicyInfo[] }`
  (`PolicyInfo = { id, iri, title?, assigner?, permissions, prohibitions, state?,
  version? }`); `GET /policies/{id}` → Turtle (dereferenceable);
  `PUT /policies/{id}` (admin, body Turtle, returns `PolicyInfo`);
  `DELETE /policies/{id}` (admin, 409 if a record still references it);
  `POST /policies/{id}/validate` → `{ conforms, violations[] }` (auth, dry-run).
  Stored at `{base}/policies/{id}` with `dct:title` + `owl:versionInfo` (bumped
  per write) + draft/published/archived state (Phase 12). **→ 5.2 save unblocked.**
- **`/licenses`** — descriptive license docs (PEP never evaluates), referenced via
  `dct:license`, SHACL-validated against a server license shape; same CRUD shape.
  Adjacent to the ODRL composer (see 5.4).
- **No `/agreements` endpoint** — Agreements are still PDP-materialized into the
  record's audit graph; **5.3 stays deferred.**

**Decisions:** (1, updated 2026-06-06) **build the real save** against
`PUT /policies/{id}` + `POST …/validate` — the earlier "defer save / stub
Publish" decision is obsolete now the endpoint is live; keep Copy/Download too.
(2) **Hardcode the ADR-0006 closed vocabulary** in `vocab.ts` (the server
validates against the same profile, so the client mirrors it for guidance but
isn't the authority — surface server violations inline). (3) Guided composer is
primary with a **read-only** Turtle preview, not a raw editable tab (out-of-
profile authoring is exactly what the guided UI exists to prevent).

### The profile contract (server `policy/model.py` + `parser.py`; ADR-0006) — don't invent
- `<iri> a odrl:Offer`; optional `odrl:assigner <iri>`; optional `odrl:conflict`
  (`odrl:deny` = deny-wins **default**, `odrl:perm`, `odrl:invalid`).
- Rules: `odrl:permission`/`odrl:prohibition` → bnode `a odrl:Permission|Prohibition`,
  exactly one `odrl:action` ∈ {`odrl:read`, `odrl:modify`, `odrl:delete`,
  `odrl:distribute`}.
- Constraints (`odrl:constraint` bnode): `odrl:leftOperand` + `odrl:operator`
  (`odrl:eq/neq/lt/gt/lteq/gteq`) + `odrl:rightOperand`, with **per-operand rules
  the client must enforce**:
  - `odrl:assignee` → operator **eq/neq only**, rightOperand an **IRI**.
  - `fdp-pol:role` / `fdp-pol:group` → operator **eq/neq only**, rightOperand a literal.
  - `odrl:dateTime` → comparison operators, rightOperand an `xsd:dateTime` literal.
- Namespaces: `odrl: <http://www.w3.org/ns/odrl/2/>`,
  `fdp-pol: <https://specs.fairdatapoint.org/odrl-profile#>`.

### Reuse from Phase 4 (why this goes fast)
Model→Turtle **serializer pattern** (`shacl-editor/serialize.ts` — hand-rolled,
escaping, `[ … ]` bnodes, always-declared prefixes); **n3** parse for round-trip
import; **`TurtleEditor`** (Monaco, read-only) for the live preview; CSS tokens,
`AppIcon`, view chrome, the `validateSample`-style wiring for when the endpoint
lands. Validation oracle to mirror: `server/src/fdp/policy/parser.py`.

### 5.0 Vocab + model + serializer + parser + round-trip — ✅ DONE (verified)
- `vocab.ts` (actions/operators/leftOperands/conflict — the ADR-0006 closed sets,
  with per-operand operator + rightOperand-kind metadata), `model.ts`
  (`OfferModel { iri, assigner, conflict, rules, prefixes }`, `Rule { kind,
  action, constraints }`, `Constraint { leftOperand, operator, rightOperand,
  rightIsIri }`), `serialize.ts` (hand-rolled deterministic, always declares
  odrl/fdp-pol/xsd; dateTime gets `^^xsd:dateTime`, IRIs vs literals via
  `rightIsIri`), `parse.ts` (n3-based, compacts to prefixed names).
- ✅ **6 round-trip tests** seeded with the real bundled
  `public-read-steward-modify.ttl`: parses the 4 permissions + steward-role
  constraints; serialize is valid, drops no triples, idempotent;
  `parse(serialize(m)) ≡ m`; a rich offer (assigner, conflict, prohibition,
  `odrl:assignee` IRI + `odrl:dateTime` constraints) round-trips with the
  datatype preserved. typecheck/lint/build green (234 tests total).

### 5.1 Offer composer + client-side validation — ✅ DONE (verified live)
- ✅ `factories.ts` + `mutations.ts` (pure, JSON-clone — add/delete/update rules
  & constraints, updateOffer) + `validate.ts` (mirrors `parser.py`: action set,
  per-operand operator/value/IRI rules, empty-offer warning). +8 tests.
- ✅ `OdrlComposer.vue` — guided form: id/assigner/conflict-picker; +Permission/
  +Prohibition; per rule an action select (4 actions) + constraint builder
  (leftOperand → operator filtered per operand → value input typed per operand,
  datetime gets a date-time picker) + inline errors. Structurally can't emit
  out-of-profile constructs.
- ✅ `OdrlPreview.vue` — live Turtle preview (reuses the Monaco `TurtleEditor`,
  read-only) + validation banner. Wired into `PolicyEditorView` (replaces the
  stub) as a composer | preview layout with Copy Turtle.
- ✅ **Verified live** (Playwright + Keycloak): composed a Permit-Modify rule
  with a role=steward constraint → empty value showed "✕ Role needs a value"
  (banner + inline) → filled → "✓ Valid"; Copied Turtle had the correct
  `odrl:Offer`/`permission`/`action odrl:modify`/`fdp-pol:role`/`"steward"`,
  0 console errors.

### 5.2 Save + lifecycle — ✅ DONE (verified live against the server)
- ✅ `api/policies.ts` (mirrors `schemas.ts`): `listPolicies`, `getPolicyTurtle`,
  `putPolicy`, `deletePolicy`, `validatePolicy` → `{ conforms, violations }`
  (violation detail flattened); raw mappers + `normaliseError`. `usePolicies` +
  `useInvalidatePolicies` composables. +4 tests.
- ✅ `PolicyEditorView` is a lifecycle surface (mirrors `SchemaEditorView`):
  managed-policy list (title/id · `nP·nX` · state) + New; load (`GET` → parse →
  model); slug → derived Offer IRI `{base}/policies/{id}` (serialized as the
  subject so the server stores it there); **Save** = `PUT` (server profile
  violations surface inline via `parseFdpError`); **Validate** = `POST …/validate`
  dry-run; **Delete** (confirm, handles 409); Copy. Composer's Id field hidden
  (`:show-id="false"`) since the slug owns the IRI.
- ✅ **Verified live** (Playwright + Keycloak, real server): composed a
  permit-modify+role=steward offer → Validate "Conforms ✓" → Publish (`PUT`) →
  appears in the managed list at `<{base}/policies/{slug}>` → Delete removes it;
  0 console errors. Publication-state transitions (draft→published) left as a
  thin follow-up — the write persists as a draft and is fully functional.

### 5.3 Agreement history view — 🚫 server-blocked (deferred)
- No `/agreements` endpoint exists; Agreements are PDP-materialized into the
  record's audit graph (hidden `/meta`, not in anonymous SPARQL). Defer until the
  server exposes steward-scoped audit access. Policy **version** history
  (`owl:versionInfo` on the policy record) is available now and is a cheaper
  partial substitute if wanted.

### 5.4 License manager — ✅ DONE (verified live, full lifecycle)
- ✅ `api/licenses.ts` (list/get/put/delete/validate, mirrors `policies.ts`) +
  `useLicenses` + `components/license-editor/licenseDoc.ts` (serialize/parse the
  tiny `dct:title`/`source`/`description` doc) + `LicensesView.vue` (lifecycle:
  list + simple form + live preview). New `/licenses` route; **added the missing
  nav links for Policies *and* Licenses** in `UserMenu` (Policies had no menu
  entry either). +7 tests; 253 total green.
- ✅ **Verified live** (Playwright + Keycloak, real server): compose →
  Validate "Valid ✓" → Publish (`PUT /licenses/{id}`) → appears in the managed
  list → Delete removes it; 0 console errors. (The earlier server 500
  `UnknownShapeError: …#LicenseDocumentShape` was fixed server-side 2026-06-06 —
  `PUT`/`validate` now return 200; re-verified directly + via the UI.)

### 5.5 Record pickers (`dct:rights` / `dct:license`) — ✅ DONE (full round-trip verified live)
- ✅ New `FieldKind: "ref"` + `FieldSpec.source` ("policies"|"licenses") in
  `entityForms.ts`; `F.rights` (dct:rights → policies) added to the static DCAT
  specs, `F.license` switched to ref(licenses); `applyModel` routes `ref` through
  `setIri`. `EntityForm.vue` renders a `ref` as a free-text IRI `<input>` +
  `<datalist>` of managed docs from `usePolicies`/`useLicenses`.
- ✅ **The fix that mattered:** the live form is **SHACL-shape-driven**
  (`fieldsFromShape`), not the static `ENTITY_SPECS`, so the first cut never
  appeared. `fieldsFromShape` now maps `dct:license` → ref(licenses) and **appends
  a `dct:rights` ref(policies) field** (it's `SHACL_EXCLUDED`, so it never comes
  from the shape, but any record can opt into a policy). Spec updated.
- ✅ +1 unit test (`dct:rights`/`dct:license` round-trip as IRIs);
  typecheck/lint/build green (254 total).
- ✅ **Pickers request published-only** (`listPolicies(true)`/`listLicenses(true)`
  → `?published=true`; `usePublishedPolicies`/`usePublishedLicenses` with their
  own cache keys; `EntityForm` uses them — managers still show all incl. drafts).
  +1 test. (ADR-0012 §4: only PUBLISHED is assignable.) 255 total green.
- ✅ **Save round-trip verified live (2026-06-07, after the server re-seed):**
  created a catalog through the form with Access policy = the published
  `…/policies/system-default` (shown in the picker) + License = a CC BY 4.0 IRI →
  saved → an **authenticated** GET of the record shows `dcterms:rights
  <…/policies/system-default>` and `dcterms:license <…/by/4.0/>` persisted. (NB:
  records save as drafts, so an *anonymous* GET returns nothing — verify with a
  token.) The earlier modify-deny is gone — `system-default` is back at its
  managed IRI as PUBLISHED. See [[pdp-modify-denied]] (resolved).

### Risks
- **Lower than before** — the save path is no longer blocked. Main risk is the
  client profile-validation (`validate.ts`) drifting from `parser.py`; mitigate
  by treating the server `POST …/validate` as the authority and surfacing its
  violations, with `validate.ts` only as fast inline guidance.

References: server ADR-0006 + **ADR-0012**
(`server/docs/adr/0012-first-class-odrl-policy-and-license-documents.md`),
`server/src/fdp/policy/parser.py` (validation oracle),
`server/src/fdp/metadata/policies.py` (the `/policies` API to mirror),
`server/profiles/default/offers/public-read-steward-modify.ttl` (round-trip seed).

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

### 9.3 User management (admin) — ✅ DONE (2026-06-07, verified live)
- Built on the server `/users` facade (ADR-0013): `api/users.ts` + `useUsers` +
  `UsersAdminView` (`/admin/users`, admin + `user_management`-feature gated).
  See the completion plan in §9.11 for details and the live-verification result.

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

### 9.10 User profile page — ✅ DONE (verified live)
- `ProfileView.vue` (route `/account/profile`, in `UserMenu`): read-only identity
  from the OIDC token claims (name, username, email, `sub`, role chips) + a
  "Manage account" deep link to the Keycloak account console (`{iss}/account`).
  No server endpoint. Verified live: shows Admin User / admin@fdp.local /
  STEWARD·ADMIN, link → `…/realms/fdp-dev/account`; typecheck/lint/build, 255 tests.

### 9.11 Phase 9 completion plan (2026-06-07)
Re-probed the live server: still **no** `/users`, `/members`, or version-history
endpoints; only publication `/state` (already done). Dispositions (decided w/ user):

**Build now — no server dependency:**
- **9.10 User profile — ✅ DONE (verified live).** Read-only profile at `/account/profile`, sourced
  from the OIDC token claims via the auth store (`user.profile`: name, email,
  preferred_username, `sub`; plus `roles`). A "Manage account" button deep-links to
  the Keycloak **account console** (`{oidc-authority}/account`) for editing — the
  IdP owns identity. Linked from `UserMenu`. Pure client; gate + live-verify.

**Coordinated — ✅ DONE (server facade shipped + client built, verified live):**
- **9.3 User management — ✅ DONE.** Server shipped the `/users` facade
  (ADR-0013) to the spec at
  [docs/server-requests/users-facade.md](docs/server-requests/users-facade.md).
  Client built: regenerated `schema.ts` (`npm run generate-api` — adds
  `features.user_management`, `/users*`, `UserInfo`); `api/users.ts`
  (list/search+paging, roles, create/invite, patch, delete; snake↔camel) +
  `useUsers`/`useAssignableRoles`/`useInvalidateUsers` + `UsersAdminView`
  (route `/admin/users`, **feature-gated** via `meta.feature: user_management`
  + admin-gated; in `UserMenu` behind `canManageUsers`). Searchable table, inline
  role/enabled editor, invite-create, delete, **self-lockout guards** (can't
  delete self / drop own admin / disable self). +5 tests; PERMISSIVE +
  featureGate.spec updated for the new flag.
- ✅ **Verified live** (real server + Keycloak facade configured): listed
  admin/alice; self-delete disabled; created+invited a user (appears); edited it
  to add `admin` (persisted server-side: `['steward','admin']`); deleted (204);
  0 console errors.

**Server-blocked — deferred to v1.x (precise blockers):**
- **9.1 record version history.** Needs a server endpoint for per-record versions
  (`/{path}/versions`, or `/meta` exposing `owl:versionInfo` history);
  `versionInfo` isn't on the public record graph today. State half ✅ done.
- **9.2 record membership / sharing.** Needs `/members` CRUD. Defer.
- **9.8 FDP Index.** Kept deferred (separate service); revisit if an index
  endpoint appears.

**Already done:** 9.1-state, 9.4, 9.5, 9.6, 9.7, 9.9.

**Net (updated 2026-06-07):** **9.10 and 9.3 are now DONE & verified live.** The
only Phase-9 items left are genuinely server-blocked: **9.1 record version
history**, **9.2 membership**, **9.8 FDP Index** — all deferred to v1.x pending
their endpoints. Everything else in Phase 9 is complete.

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
- **Live verification — ✅ DONE 2026-06-07 (datastore healthy).** `POST /search`
  returns results (6 records, `type`+`license` facets); `SearchView` renders the
  result cards + facet groups from the live index; saved-query create → list →
  delete works end-to-end via `/me/saved-queries`. (Earlier this was deferred
  because Postgres was down.) 0 console errors. Facet *value* labels remain
  best-effort (`license`→`licenseLabel`, IRI→`shortLabel`).
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

## Phase 12 — Interface refinements (from `docs/interfacenotes.md`, 2026-06-10)

GUI refinements raised after live runs against the dev stack, from
`docs/interfacenotes.md`. **12.1–12.6 are done** (first batch, 2026-06-10; gate
green; 12.5 needed a coordinated `fdp-server` change that shipped the same day).
**12.7–12.10 are a second batch (notes 7–10, added 2026-06-11) — planned below,
not yet implemented.**

### 12.1 Header title from FDP metadata, not sample data — ✅ done (2026-06-10)
- [`AppHeader.vue:48-50`](src/components/shared/AppHeader.vue#L48-L50) renders
  `sampleDeployment.name` / `.host` — the hardcoded "Erasmus MC · Research data"
  from [`src/data/sampleRecord.ts`](src/data/sampleRecord.ts#L105).
- Source the name from the **repository root record's `dct:title`** via the
  existing [`useRepository()`](src/composables/useRepository.ts) composable (it
  already returns `title` + `iri`). Keep the host line, derived from `apiBase()`
  (display host without scheme).
- Loading/error fallback: a neutral label (host, or "FAIR Data Point") until the
  record resolves — don't flash the sample string.
- Drop the `sampleDeployment` import from the header; update
  [`App.spec.ts`](src/App.spec.ts#L36) which asserts "Erasmus MC".
- **Done:** header shows the live FDP title (`default` on the dev stack); no
  sample text remains in the shell.

### 12.2 Footer "API" link opens the OpenAPI UI — ✅ done (2026-06-10; corrected to /fdp-api/docs — caveat resolved, the path is public)
- [`AppFooter.vue:46`](src/components/shared/AppFooter.vue#L46) `<a href="#">API</a>`
  is dead. Point it at the server OpenAPI UI (`{API base}/docs`),
  `target="_blank" rel="noopener"`. Derive the base from `runtimeApiUrl()`/
  `apiBase()`, not a literal.
- **Caveat (server):** on the current profile `/docs` and `/openapi.json` return
  **401** — the authz layer covers them. Either the server exempts the docs routes
  from auth, or we accept that the user authenticates in the new tab. The link
  itself is client-only; the gating is a server call. See [[12.5]].
- **Done:** clicking API opens the server docs in a new tab.

### 12.3 Footer "About" link — small pop-up — ✅ done (2026-06-10)
- **Decision (maintainer, 2026-06-10):** About opens a small pop-up showing the
  client version, the server version, and a "© FAIR Data Team" copyright.
- Built [`AboutDialog.vue`](src/components/shared/AboutDialog.vue) (centred modal;
  Escape + backdrop-close, mirrors the ContainerBrowser overlay pattern). Client
  version is inlined from `package.json` as `__APP_VERSION__` (`define` in both
  [`vite.config.ts`](vite.config.ts) and [`vitest.config.ts`](vitest.config.ts),
  declared in [`env.d.ts`](env.d.ts)); server name+version come from `useAppInfo`
  (`GET /info`). Wired to the footer "About" trigger in
  [`AppFooter.vue`](src/components/shared/AppFooter.vue).

### 12.4 Footer "Specification" link → specs.fairdatapoint.org — ✅ done (2026-06-10)
- [`AppFooter.vue:48`](src/components/shared/AppFooter.vue#L48) `<a href="#">Specification</a>`.
  Set `href="https://specs.fairdatapoint.org"`, `target="_blank" rel="noopener"`.
- **Done:** opens the spec site in a new tab. (Trivial — bundle with 12.2.)

### 12.5 Schemas page shows the profile's DCAT shapes — ✅ done (2026-06-10; server shipped the fix, client wired against it)

**Server resolution (2026-06-10):** `fdp-server` now stores profile-applied shapes
in the managed namespace (`{base}/fdp-api/schemas/{slug}`), so the default DCAT
shapes (catalog, dataset, data-service, distribution, repository) appear in
`GET /fdp-api/schemas` and are editable. The list response gained
`deletable: boolean`; the FDP root schema (`repository`) returns `deletable: false`.

**Client work done:**
- Regenerated API types — the spec lives at `/fdp-api/openapi.json` (not the
  default `/openapi.json`, which the authz catch-all 404s/401s); fixed the
  [`generate-api`](package.json) script path accordingly. `SchemaInfo` now carries
  `deletable`.
- Added `deletable` to [`SchemaSummary`](src/api/schemas.ts) + snake_case mapping
  (defaults to `true` when absent).
- [`SchemaEditorView.vue`](src/views/SchemaEditorView.vue): the default shapes now
  render in the list (verified live: catalog/data-service/dataset/distribution/
  repository); a lock icon marks protected shapes; the **Delete** action is
  suppressed for `deletable === false` and replaced with a "protected — editing
  allowed" note. Editing (PUT) of the root schema is still allowed.
- Friendly error copy for `fdp.schema_protected` (403) and `fdp.conflict` (409,
  schema still referenced by a resource definition) in
  [`errorMessages.ts`](src/api/errorMessages.ts).
- Bonus: corrected the 12.2 footer "API" link to the real `/fdp-api/docs` path
  (both `/fdp-api/docs` and `/fdp-api/openapi.json` are public — the earlier 401
  was the wrong default path, so the docs-auth caveat is resolved).

Gate green (lint + typecheck + 266 unit tests, incl. a `deletable: false` mapping case).

<details><summary>Original diagnosis (for the record)</summary>
- User menu → **Schemas** ([`SchemaEditorView.vue`](src/views/SchemaEditorView.vue))
  lists nothing on a default deployment, though the profile ships shapes for
  Repository, Catalog, Dataset, Distribution, DataService, and more.
- **Root cause (verified in GraphDB):** the client list comes from
  `GET /fdp-api/schemas` → `{"schemas":[]}`. The server's `SchemaService.list_schemas`
  (`fdp-server` `src/fdp/metadata/schemas.py:181`) only enumerates named graphs
  whose IRI starts with `{base}/fdp-api/schemas/`. Profile-bootstrapped shapes are
  stored under their **canonical IRIs** instead (`http://www.w3.org/ns/dcat#Catalog`,
  `https://w3id.org/fdp/o#Repository`, …), so the `STRSTARTS` filter excludes them.
- **Fix (coordinate with `fdp-server` — CLAUDE.md "API contract"):** the server
  should surface the bootstrapped shapes through the schema listing — either
  register profile shapes under the managed namespace on apply, or extend the
  listing/endpoint to include profile + resource-definition shapes with a
  `source` marker (profile vs published). Re-run `npm run generate-api` after.
- **Client scope once the server returns them:** render the extra entries, tag
  origin, let the user open an existing shape to **edit or clone** and **add a
  new** one; guard edit/delete on origin + admin role (profile shapes likely
  clone-to-edit, since editing writes under the managed namespace).
- **Done:** the default DCAT-based shapes appear under Schemas; a user can open/
  clone an existing one or add a new one.
</details>

### 12.6 Schema editor should use the browser width — ✅ done (2026-06-10)
- [`SchemaEditorView.vue:469-475`](src/views/SchemaEditorView.vue#L469-L475) caps
  `.page` at `max-width: 1000px; margin: 0 auto`, so the three-column workbench +
  Monaco editor are cramped on a wide window.
- Raise/remove the cap for this authoring surface (full width with the existing
  ~80px side padding, or a much larger max e.g. 1600px), keeping the 900px
  responsive single-column collapse. Verify Monaco and the Vue Flow canvas reflow.
- **Done:** the Schemas editor fills the available width; no horizontal cramping
  at common widths.

---

## Phase 12 (second batch) — interface notes 7–10 (added 2026-06-11) — ⬜ planned

Diagnosed live on 2026-06-11; **not yet implemented**. All client-only unless
noted.

### 12.7 Settings UI — friendlier titles + structured editors — ✅ done (titles 2026-06-11; structured editors 2026-06-11)
- **(a) Titles + help:** [`SettingEditor`](src/components/admin/SettingEditor.vue)
  shows a human title + help line for known keys (`search.filters` → "Search
  facets", `forms.autocomplete-sources` → "Form autocomplete sources"), raw key
  kept as a secondary label; unknown keys fall back to the raw key.
- **(b) Structured editors:** [`SearchFiltersEditor`](src/components/admin/SearchFiltersEditor.vue)
  (facet rows: name/label/predicate/type_filter, add+remove) and
  [`AutocompleteSourcesEditor`](src/components/admin/AutocompleteSourcesEditor.vue)
  (sources with a kind selector; inline items table with IRI/label/aliases, or a
  SPARQL query field) replace the JSON textarea for those two keys, matching the
  server `SearchFilters` / `AutocompleteSources` shapes. An **"Edit as JSON"**
  toggle keeps the raw textarea as an escape hatch; unknown keys still use JSON.
  Save assembles the same JSON the server validates (422s surface inline). Two
  new unit tests cover the form-assembly + JSON-fallback paths.
- [`SettingsView.vue`](src/views/SettingsView.vue) renders every server settings
  key via [`SettingEditor.vue`](src/components/admin/SettingEditor.vue) as a **raw
  JSON textarea**. The two notable keys are `forms.autocomplete-sources` and
  `search.filters` (the view deliberately doesn't hardcode the key list — new
  server keys still appear).
- **(a) Readable titles + help.** Add a small key→metadata map (title + one-line
  description), e.g. `forms.autocomplete-sources` → "Form autocomplete sources",
  `search.filters` → "Search facets". Render the friendly title instead of the
  dotted key; fall back to the raw key for unknown settings.
- **(b) Structured editors** instead of JSON textareas for the two known keys.
  Live shapes (from `GET /fdp-api/settings`):
  - `forms.autocomplete-sources`: `{ sources: [{ name, kind: "inline"|"sparql",
    description, items: [{ iri, label, aliases: [] }], sparql }] }` → a
    list-of-sources editor: add/remove sources; per source a name + kind selector
    + description, an items table (IRI / label / aliases) for `inline`, a query
    field for `sparql`.
  - `search.filters`: a list of facet dimensions (label + predicate/operands) —
    add/remove rows. Confirm exact shape from the live payload before building.
- Keep the raw-JSON editor as the fallback for unknown keys. PUT contract is
  unchanged (`PUT /fdp-api/settings/{key}` with the same JSON object); the
  structured editor just assembles that JSON, and 422 validation still surfaces
  inline.
- **Done:** the two keys edit through friendly forms that round-trip to identical
  JSON; unknown keys still render as JSON.

### 12.8 RDF/API box — make it consistent, record-scoped, and wired — ✅ done (2026-06-11)
- **Implemented:** [`RdfPreviewPanel`](src/components/metadata/RdfPreviewPanel.vue)
  is now the single "View as RDF" component (Turtle / JSON-LD / RDF/XML /
  N-Triples + **API**), taking a `recordId` ("" = root). Each RDF button fetches
  the record via `Accept`-header content negotiation and opens the result in a
  new tab (blob URL); "API" opens `/fdp-api/docs`. Used by both the record
  sidecar ([`AboutSidecar`](src/components/metadata/AboutSidecar.vue), scoped to
  the record) and the repository hero ([`MetadataBrowseView`](src/views/MetadataBrowseView.vue),
  scoped to the root) — the divergent "Catalogs"/3-button variant is gone.
  *API target = OpenAPI UI root (`/fdp-api/docs`); deep-linking to the record-read
  operation is a possible later refinement.*
- Two inconsistent, **non-functional** boxes:
  - Repository hero ([`MetadataBrowseView.vue:48-59`](src/views/MetadataBrowseView.vue#L48-L59)):
    a "Catalogs" card with dead `Turtle` / `JSON-LD` / `API` `<button>`s.
  - Record sidecar ([`RdfPreviewPanel.vue`](src/components/metadata/RdfPreviewPanel.vue)):
    "View as RDF" with dead `Turtle` / `JSON-LD` / `RDF/XML` / `N-Triples` buttons.
- **Unify into one shared component** ("View as RDF") used by both, always about
  **the current record on display** (the repository hero passes the root record;
  record pages pass their own). Keep the four RDF syntaxes and **add an "API"
  entry**. Drop the divergent 3-button "Catalogs" variant.
- **Wire the syntax buttons** via content negotiation — verified working on the
  server: `Accept: text/turtle | application/ld+json | application/rdf+xml |
  application/n-triples` all return the right media type. A plain `href` can't set
  Accept, and `?format=`/`.ext` are **not** honored, so fetch the record with the
  chosen Accept header and open the result in a new tab (blob URL).
  - *Optional server enhancement:* honor a `?format=` query param so the buttons
    can become plain links instead of fetch+blob. Not required.
- **"API"** opens the OpenAPI UI (`/fdp-api/docs`), ideally deep-linked to the LDP
  record-read operation. **Confirm intended target** with the maintainer (the
  OpenAPI UI documents endpoints, not instances).
- **Done:** both boxes are the same component, scoped to the current record, and
  every button opens the correct serialization / the API UI in a new tab.

### 12.9 "Container" shows the real parent, not a hardcoded value — ✅ done (2026-06-11)
- [`AboutSidecar.vue:17`](src/components/metadata/AboutSidecar.vue#L17) hardcodes
  `Container: Cohort studies → AD`.
- Render the record's **actual container** — the immediate parent via
  `dct:isPartOf`, already available from [`useAncestors`](src/composables/useAncestors.ts)
  in [`RecordDetailView.vue`](src/views/RecordDetailView.vue) (the crumb directly
  above the current record). Pass it into `AboutSidecar` and render it as a link
  to the parent record; show "FDP root" / "—" when the parent is the repository
  root or absent.
- While here, confirm `Issued` / `Last modified` are live (`record.issued` /
  `record.modified`) and not sample-derived; fix if needed.
- **Done:** Container reflects the displayed record's real parent and links to it.

### 12.10 Surface the SPARQL playground via "Advanced search" — ✅ done (2026-06-11)
- [`SparqlPlaygroundView.vue`](src/views/SparqlPlaygroundView.vue) (`/sparql`,
  feature-gated `sparql`) exists but is **linked nowhere**.
- Add an **"Advanced search"** link beneath the header search field
  ([`AppHeader.vue`](src/components/shared/AppHeader.vue)) → a page with two tabs:
  **Text** (the existing search experience) and **SPARQL** (the existing
  playground). Gate the SPARQL tab on the `sparql` feature flag.
- Implementation: a thin wrapper view (e.g. `/search` gains a tabs UI, or a new
  `/advanced-search`) that hosts the existing search + playground components
  unchanged; the wrapper only toggles tabs.
- **Done:** SPARQL is reachable from the main UI via "Advanced search"; text and
  SPARQL live behind one tabbed entry.
- **Implemented (2026-06-11):** new [`AdvancedSearchView`](src/views/AdvancedSearchView.vue)
  with Text | SPARQL tabs (SPARQL tab gated on the `sparql` flag), `/advanced-search`
  route, and an "Advanced search" link under the header search box. `SearchView`
  gained an optional `routeName` prop so its URL-synced state stays on the
  advanced page instead of bouncing to `/search`.

### 12.12 Breadcrumbs (and the Container value) are clickable — ✅ done (2026-06-11; notes #12 + 12.9-link)
- [`useAncestors`](src/composables/useAncestors.ts) now returns `Crumb { label, to }`
  (root → `/`, ancestors → `/records/:id`, current record → no link).
  [`AppBreadcrumbs`](src/components/shared/AppBreadcrumbs.vue) renders a RouterLink
  per crumb that has a target (back-compatible: still accepts plain strings, so
  [`StewardSubnav`](src/components/metadata/StewardSubnav.vue) is unchanged);
  [`SecondaryNav`](src/components/metadata/SecondaryNav.vue) prop retyped to `Crumb[]`.
- **Done:** every ancestor crumb navigates; the current record stays plain text.

### 12.13 Container child records show under the record — ✅ done (2026-06-11; note #13)
- **Diagnosis (verified live):** the dataset *was* created and wired correctly
  (`dcat:Dataset`, `dct:isPartOf` the catalog, catalog has `dcat:dataset` +
  `ldp:contains` forward links). The bug was client-side: [`RecordDetailView`](src/views/RecordDetailView.vue)
  only rendered a "Distributions" section and never listed a container's child
  records.
- **Fix:** new [`useChildRecords`](src/composables/useChildRecords.ts) fetches one
  LDP page per child type (`fetchChildrenPage`) and merges them; the detail view
  gained a **"Contents"** section listing child records as links (and now hides
  the Distributions section when empty).
- **Done:** datasets/data-services show under their catalog (and catalogs under
  the repository).

### 12.11 Metrics dashboard shows no data — aggregation lag + empty state — ✅ done (server fixed the pipeline; client empty-state added 2026-06-11)
- **Client (done):** [`MetricsDashboardView`](src/views/MetricsDashboardView.vue)
  now shows an explanatory empty-state when a range has no activity (requests 0
  and no series), instead of silent zeros — notes that metrics aggregate on a
  schedule and recent activity may lag.
- Original diagnosis + server ask kept below for the record.

User report: the metrics dashboard shows nothing and never changes on refresh.

- **Diagnosis (verified live 2026-06-11).** Events *are* recorded — `metrics_raw`
  had 464 rows — but the dashboard read endpoints (`/fdp-api/metrics/summary`,
  `/timeseries/daily`, `/geography`, `/top-resources`, via
  [`metrics.ts`](src/api/metrics.ts)) return all-zero/empty. Root cause is the
  rollup pipeline:
  - In this dev stack **nothing runs `fdp metrics rollup`**, so raw never
    aggregates. (`metrics_hourly`/`metrics_daily` were both 0.)
  - Running `fdp metrics rollup` manually moved raw → **hourly** (107 rows) but
    **daily stayed 0** — hourly→daily only rolls buckets older than the retention
    cutoff (~2 days; `FDP_METRICS_DISCARD_HOURLY_AFTER_DAYS=2`). Today's activity
    lives in hourly.
  - The dashboard endpoints read **only `metrics_daily`** — after the rollup,
    `summary` still returned `request_count: 0` despite 107 hourly rows. So recent
    activity (the last ~2 days) is never shown, and a freshly-used deployment
    looks permanently empty.
- **Server/ops (the substantive fix — coordinate with `fdp-server`/deploy):**
  1. Schedule `fdp metrics rollup` in the dev stack (a cron/sidecar) so
     raw→hourly→daily happens automatically.
  2. Decide + confirm: should the read endpoints union **hourly (and recent raw)**
     for the recent window so today's/last-2-days activity is visible, rather than
     daily-only? As-is the dashboard structurally cannot show recent metrics.
     Either widen the endpoints, or document the lag as intended.
- **Client (what we own):** the dashboard currently renders blank zeros for an
  empty period, which reads as a bug (this is exactly what confused the user).
  Add an informative **empty state** in [`MetricsDashboardView`](src/views/MetricsDashboardView.vue)
  / [`useMetrics`](src/composables/useMetrics.ts): distinguish "metrics enabled,
  no aggregated data for this period yet" from genuine zeros, and note that
  aggregated metrics may lag recent activity (≈ up to 2 days). Optionally surface
  the period freshness.
- **Done:** with rollups running, the dashboard shows data for the covered period;
  for an empty/lagging period it explains *why* rather than showing silent zeros.

### 12.14 Rename "Privacy posture" → "Privacy disclaimer" — ✅ done (2026-06-11; note #14)
- Renamed the disclosure trigger in [`PrivacyDisclosure`](src/components/metrics/PrivacyDisclosure.vue)
  and the lede reference in [`MetricsDashboardView`](src/views/MetricsDashboardView.vue).

### 12.15 Advanced-search tabs didn't switch — ✅ done (2026-06-11; note #15)
- **Cause:** [`AdvancedSearchView`](src/views/AdvancedSearchView.vue) put `v-show`
  directly on `SearchView`/`SparqlPlaygroundView`, which are multi-root
  components — `v-show` can't toggle them, so the text search showed on both tabs.
- **Fix:** wrap each tab panel in a single-root `<div role="tabpanel" v-show=…>`.
  Now Text and SPARQL are mutually exclusive.

### 12.16 Metrics "Resource Detail" panel was empty — ✅ done (2026-06-11; note #16)
- **Cause:** [`MetricsDashboardView`](src/views/MetricsDashboardView.vue) pinned the
  panel to a hardcoded, non-existent `…/dataset/ad-cohort-2024`.
- **Fix:** the panel now offers a dropdown of the most-requested resources
  (rebuilding the full IRI from each top-resource's path id) and defaults to the
  top one; hidden when there are no resources.

### 12.17 Per-resource "API" button removed from the RDF box — ✅ done (2026-06-11; note #17)
- The ask was to deep-link the box's API button to the resource's GET operation
  in the OpenAPI UI. The spec documents **no** per-resource GET operation (records
  are served by an undocumented catch-all), so there's nothing to deep-link to.
- Per the stated fallback, removed the "API" button from
  [`RdfPreviewPanel`](src/components/metadata/RdfPreviewPanel.vue) (both the record
  sidecar and the repo hero); the footer's OpenAPI link remains. RDF-syntax
  buttons unchanged.

### 12.18 SHACL Visual Editor blank-node artefacts (`n3-482`) — ✅ done (2026-06-11; note #18)
- **Root cause:** [`parse.ts`](src/components/shacl-editor/parse.ts) collected
  *every* `sh:NodeShape` subject as an editor shape — including the **anonymous
  blank-node NodeShapes** nested in the Distribution shape's `sh:or`. Each got its
  n3 blank-node label (`n3-482`) as `shapeIri` → junk canvas boxes, and on
  serialize [`serialize.ts`](src/components/shacl-editor/serialize.ts) wrote it as
  a subject (`n3-482 a sh:NodeShape …`) → invalid Turtle that breaks validation.
- **Fix:** skip non-`NamedNode` shapes in the collection loop. Anonymous shapes
  round-trip intact through the parent shape's residual (termToTtl inlines them).
  Regression tests added (parse → only the named shape; serialize → valid, no
  `n3-` labels, `sh:or` preserved).

### 12.19 Distribution schema edits "saved" but didn't persist — ✅ done (2026-06-11; note #19)
- **Same root cause as 12.18:** editing the Distribution in the Visual Editor
  serialized the junk blank-node shapes into invalid Turtle, corrupting the
  round-trip so the saved shape didn't reflect the edit (and the `/spec`-driven
  entry form didn't match). Fixed by the parser change — the round-trip is now
  valid + lossless.
- **Recommend** a live edit→save→reopen re-test of the Distribution shape to
  confirm end-to-end (the unit tests cover the parse/serialize mechanism).

### 12.20 SHACL Visual Editor — first-class `sh:or` support — ✅ done (2026-06-11)

**Implemented** the agreed "Either/or" element end-to-end:
- [`model.ts`](src/components/shacl-editor/model.ts) — `ShapeModel.orGroups: { id; label; paths[] }[]`.
- [`parse.ts`](src/components/shacl-editor/parse.ts) — models a node-level `sh:or`
  whose branches are each a single required property (`[ (a sh:NodeShape)? ; sh:property [ sh:path P ; … ] ]`)
  into an `orGroup`; `sh:or` shapes that don't fit stay in residual. Branches are
  normalised to `sh:minCount 1` on the captured path.
- [`serialize.ts`](src/components/shacl-editor/serialize.ts) — emits each orGroup as
  `sh:or ( [ sh:property [ sh:path P ; sh:minCount 1 ] ] … )` (serializeShape refactored
  to a head-terms list for correct `;`/`.` punctuation).
- [`mutations.ts`](src/components/shacl-editor/mutations.ts) — add/delete OR element, add/update/remove path.
- [`FormDesigner.vue`](src/components/shacl-editor/FormDesigner.vue) — an "Either/or requirements"
  section (label + path rows with a datalist of the shape's existing paths; add/remove).
- [`ShaclFormPreview.vue`](src/components/shacl-editor/ShaclFormPreview.vue) — an "at least one required" hint.
- Tests: parse captures branch paths; serialize → valid `sh:or`, idempotent; non-matching `sh:or` stays residual.

Gate green (typecheck + lint + 276 unit tests). The bundled DCAT Distribution's
`downloadURL`/`accessURL` rule now appears as an editable Either/or element.

**Adjustment (2026-06-11, follow-up):** reworked from a separate paths-only box to
a **`Group` with `kind: "or"`** so the Either/or is *inline* with the other groups,
its properties are real fields (so they order with `sh:order` and render in Form
Preview), and it reuses all the group/field drag-drop + inspector machinery.
`parse.ts` marks the group whose field paths equal an `sh:or`'s branch paths as
`kind:"or"` (or pulls those properties into a new one, synthesising a minimal
field for any path with no property); `serialize.ts` emits `sh:or` from `kind:"or"`
groups; the FormDesigner shows an "Either/or" badge + a per-group kind toggle and
an "+ Either/or" add button.

<details><summary>Original plan</summary>
- Today node-level `sh:or` is **preserved losslessly** (residual pass-through, so
  it's not lost and is editable via the SHACL text tab) but **not visually
  editable**. The DCAT Distribution needs "either `dcat:downloadURL` or
  `dcat:accessURL`" — `sh:or` is required because SHACL ANDs properties by default.
- **Agreed UX (2026-06-11):** a group-like **"Either / or" element** in the
  FormDesigner. The user adds property paths into it; semantics = **at least one
  of these paths is required**. Serializes to
  `sh:or ( [ sh:property [ sh:path A ; sh:minCount 1 ] ] [ sh:property [ sh:path B ; sh:minCount 1 ] ] )`.
  The properties still live in their normal groups for the form; the OR element
  is the *constraint* over their paths.
- Build scope:
  - **model.ts** — `ShapeModel.orGroups?: { id; label; paths: string[] }[]`.
  - **parse.ts** — detect the node-level `sh:or` of single-property branches
    `[ (a sh:NodeShape)? ; sh:property [ sh:path P ; … ] ]` → `orGroups` (capture
    the path; the branch's other constraints are enforced by the main property).
    `sh:or` shapes that don't fit the pattern stay in residual (current behaviour).
    Note: round-trip **normalises** matched branches to `sh:minCount 1` (drops
    e.g. a branch-local `sh:nodeKind`), which is semantically equivalent.
  - **serialize.ts** — emit `orGroups` as the `sh:or` list.
  - **mutations.ts** — add/delete an OR element, add/remove a path.
  - **FormDesigner.vue** — an "Either/or requirements" section (label + path rows,
    add/remove; paths suggested from the shape's existing properties).
  - **Form Preview** — surface the "one of these required" hint.
- Until built, the text tab remains the way to author `sh:or`.
</details>

### 12.28 Graph view in the RDF sidecar (note #28) — ✅ done (2026-06-12)
- New [`RdfGraphView`](src/components/metadata/RdfGraphView.vue): a one-hop
  node-link view of the record's RDF — the resource instance is the central
  node, each predicate an edge, the object at the far end. Parses the cached
  Turtle payload with `n3` (no extra request), centering on the resource IRI and
  falling back to the best-connected named subject when the request path differs
  from the record's IRI (the repository root). Object IRIs under the API base
  become `RouterLink`s to that record; other IRIs open in a new tab; literals
  show their language tag / datatype. Exposed as a **Graph** chip in
  [`RdfPreviewPanel`](src/components/metadata/RdfPreviewPanel.vue). Added a
  `graph` icon to [`AppIcon`](src/components/shared/AppIcon.vue) + `IconName`.
  Unit tests cover centering/fallback, own-triples-only, internal-vs-external
  links, literal annotations, and parse-error handling.

### 12.27 Inline reveal for the RDF sidecar (note #27) — ✅ done (2026-06-12)
- [`RdfPreviewPanel`](src/components/metadata/RdfPreviewPanel.vue) reworked: the
  four RDF syntaxes are now chips and the chosen one **stretches out inline**
  beneath them (scrollable code block) instead of opening a new browser tab —
  with Copy / Save (download) / Open-in-tab actions. Payloads are cached per
  `Accept` header so re-opening is instant; clicking the active chip collapses
  the panel. Used by both the record sidecar and the repository hero, so the box
  stays consistent.

### 12.26 Language dropdown for the lang editor (note #26) — ✅ done (2026-06-12)
- The lang-tagged literal editor's free-text tag input is now an ISO 639-1
  `<select>` ([`languages.ts`](src/api/languages.ts) `orderedLanguages()`):
  the browser's language first, then English (when the browser isn't English),
  then the rest. Any pre-existing tag on a record stays selectable.
  [`EntityForm`](src/components/metadata/EntityForm.vue) renders it; test covers
  the browser-first ordering.

### 12.24 SHACL constraint coverage — editor + record form (from the §4 audit, 2026-06-12) — ✅ done (2026-06-12)

Audit of the client against **W3C SHACL Core §4** constraint components. Nothing is *lost*
(the editor round-trips every constraint via residual; the server validates on save) — these
close UX gaps so authors aren't surprised by server rejections.

- **(a) `sh:in` in the record form — ✅ done** [`fieldsFromShape`](src/api/entityForms.ts) reads
  `sh:in` into `FieldSpec.options`; `FieldKind` gained `enum`; [`EntityForm`](src/components/metadata/EntityForm.vue)
  renders a `<select>` (so the value is always a valid option). Tests added.
- **(b) Typed inputs from `sh:datatype` in the record form — ✅ done** `fieldsFromShape` maps
  `xsd:date|dateTime|integer/decimal/…|boolean` → `date`/`datetime`/`number`/`boolean` kinds,
  carries the datatype on `FieldSpec`, and `setLiteral` now writes **datatype-tagged** literals
  (`setLiteral(…, datatype)`), so typed values pass server validation (verified live:
  `xsd:dateTime` distribution → `conforms: true`). `EntityForm` renders date/datetime/number/
  boolean controls (datetime padded to seconds for valid `xsd:dateTime`). Tests added.
- **(c) Value-range constraints in the editor — ✅ done** `sh:minInclusive`/`sh:minExclusive`/
  `sh:maxInclusive`/`sh:maxExclusive` added to the editor model (optional), parser `FIELD_KNOWN`
  + `readField` (carried only when present), serializer, and `FieldInspector` (numeric inputs).
  Round-trip test added (no residual duplication; idempotent).
- **(d) Client hints + pre-validation — ✅ done** `fieldsFromShape` reads `sh:pattern` /
  `sh:minLength` / `sh:maxLength` / value range onto `FieldSpec`; [`constraintHint`](src/api/entityForms.ts)
  renders a help line (e.g. "3–50 chars · pattern ^…$ · ≤ 100") in [`EntityForm`](src/components/metadata/EntityForm.vue);
  [`validateConstraints`](src/api/entityForms.ts) pre-checks length/pattern/range on create &
  edit (the form uses `@submit.prevent`, so native HTML validation wouldn't fire). Server stays
  the authority. Tests added.
- **Out of scope (leave to the SHACL text tab + server):** `sh:not`/`sh:and`/`sh:xone`,
  property-pair (`sh:equals`/`disjoint`/`lessThan`/`lessThanOrEquals`), `sh:qualifiedValueShape`,
  `sh:closed`/`sh:ignoredProperties`, `sh:hasValue`, `sh:languageIn`/`sh:uniqueLang` — rare for
  FDP metadata; all still round-trip losslessly.

### 12.25 DASH widget rendering coverage (datashapes.org/forms.html, 2026-06-12) — ✅ done (record authoring form + editor Form Preview)

**Done (2026-06-12):** the record form now honors an explicit `dash:editor` for the widgets it
can render — [`fieldsFromShape`](src/api/entityForms.ts) maps `dash:TextAreaEditor` /
`RichTextEditor` / `*WithLangEditor` → textarea, `dash:BooleanSelectEditor` → boolean,
`dash:DatePickerEditor`/`DateTimePickerEditor` → date/datetime, `dash:TextFieldEditor` → text
(via `DASH_EDITOR_KIND`), so a steward's widget choice drives the control. Test added.

**Deferred (need infrastructure the client lacks):**

**Finding:** all **15** DASH `dash:…Editor` widgets are already in the editor *palette/model*
([`widgets.ts`](src/components/shacl-editor/widgets.ts)) and round-trip losslessly via the
`dash:editor` predicate — so no widget *identifier* is missing. The gap is **rendering**:
several render as a generic text/IRI control instead of their intended widget, in both the
editor's Form Preview and (more so) the record authoring form.

- **(a) Editor Form Preview — distinct rendering — ✅ done (2026-06-12)**
  Lang-tagged fields show a language selector ([`ShaclFormPreview`](src/components/shacl-editor/ShaclFormPreview.vue),
  reuses `orderedLanguages`). The remaining reference/nested gap is now closed:
  [`previewKind`](src/components/shacl-editor/preview.ts) gained `ref`/`details`/`blanknode`
  kinds and a `refWidget` map, so `AutoCompleteEditor`/`InstancesSelectEditor`/`SubClassEditor`
  render the same [`ReferencePicker`](src/components/metadata/ReferencePicker.vue) curators see
  (the prefixed `sh:class` is expanded to a full IRI via `expandPath`, with the doc prefixes
  threaded in as a `prefixes` prop), and `DetailsEditor`/`BlankNodeEditor` render a labelled
  note rather than a generic text input. `widgetKey` also reads the `dash:editor` IRI when a
  field carries no `widgetId` (parsed-from-arbitrary-SHACL). Covered by `preview.spec.ts`
  (dispatch + `refWidget`) and a new `ShaclFormPreview.spec.ts` mount test.
- **(b) Record authoring form — honor `dash:editor` — 🟡 partial (most done)**
  **Done:**
  - Literal widgets — textarea / rich-text→textarea / `*WithLang`, boolean, date, datetime,
    text (`DASH_EDITOR_KIND` in `fieldsFromShape`). With 12.24a/b the record form renders
    text/textarea/iri/iris/keywords/ref/enum/boolean/date/datetime/number.
  - **`rdf:langString` / `*WithLangEditor`** (2026-06-12) — `FieldSpec.lang`; value + a BCP47
    language tag (sibling model key via `langKey`); [`setLangLiteral`](src/api/rdf.ts) writes
    `"…"@lang`, `oneLang` reads it back; `EntityForm` renders value + language input. Round-trip
    test.
  - **`dash:DetailsEditor` / nested `sh:node`** (2026-06-12) — one-level inline sub-form via
    flat keys (`detailKey`, so the flat `EntityModel` is untouched); `fieldsFromShape` resolves
    the nested shape's scalar fields (depth-guarded against cycles); `applyDetails` writes a
    nested blank node (typed from `sh:class`) and `modelFromTurtle` reads it back. Round-trip
    test. (Limits: one level deep, scalar nested fields.)
  - **Reference widgets** (`AutoComplete`/`InstancesSelect`/`SubClass`) — ✅ done (2026-06-12).
    Server shipped `GET /fdp-api/instances?class&q&limit&offset` + `GET /fdp-api/subclasses?class`.
    Client: regenerated types, [`api/instances.ts`](src/api/instances.ts) (`fetchInstances`/`fetchSubclasses`),
    [`useInstances`](src/composables/useInstances.ts), and [`ReferencePicker`](src/components/metadata/ReferencePicker.vue)
    (dropdown for instances/subclass; search box + dropdown for autocomplete, server-filtered by `q`).
    `fieldsFromShape` captures `sh:class` + the widget for IRI fields; `EntityForm` renders the
    picker. Verified live (q-filter matches/excludes; subclasses returns empty gracefully). Test added.

### 12.23 "At least one of" (sh:or) — canonical form + editor & form-validator support — ✅ done (2026-06-11)
- **Verified vs W3C SHACL** (spec §4.6.2, `sh:or`): "at least one of two properties"
  is `sh:or ( [ sh:path A ; sh:minCount 1 ] [ sh:path B ; sh:minCount 1 ] )` — each
  branch a **property shape**. `sh:or` = "conforms to at least one" (both fine,
  neither not). (Exactly-one-not-both would be `sh:xone` — not wanted here.)
- **Editor:** [`serialize.ts`](src/components/shacl-editor/serialize.ts) now emits
  the canonical property-shape branch; [`parse.ts`](src/components/shacl-editor/parse.ts)
  accepts both the canonical and the node-shape (`[ sh:property [ … ] ]`) forms.
- **Form validator:** [`orGroupsFromShape`](src/api/entityForms.ts) reads the
  shape's node-level `sh:or` into `EntitySpec.orGroups`; [`missingOrGroups`](src/api/entityForms.ts)
  enforces "at least one" on create ([`EntityCreateView`](src/views/EntityCreateView.vue))
  and edit ([`EntityEditView`](src/views/EntityEditView.vue)); [`EntityForm`](src/components/metadata/EntityForm.vue)
  shows an "At least one required: A or B" hint.
- **Server-verified:** neither URL → rejected (`sh:or`), one or both → conforms.
- Gate green (typecheck + lint + 281 unit tests).

### 12.22 Either/or members were each required (record couldn't save) — ✅ done (2026-06-11)
- **Verified vs SHACL (server validator):** a Distribution with only `dcat:downloadURL`
  reported `conforms: false` — "Less than 1 values on `dcat:accessURL`". The saved
  shape had a redundant top-level `sh:minCount 1` on **both** `downloadURL` and
  `accessURL`; top-level property shapes are ANDed, so both were required and the
  `sh:or` was moot. The entry form ([`fieldsFromShape`](src/api/entityForms.ts))
  reads required from top-level `sh:minCount`, so it (correctly, given the shape)
  required both.
- **Editor fix:** [`serialize.ts`](src/components/shacl-editor/serialize.ts) now
  omits per-member `sh:minCount` for fields in a `kind:"or"` group (`inOr`) — the
  requirement lives in the `sh:or` branches, not on each member. Regression test
  asserts or-group members serialize with no top-level `sh:minCount`.
- **Data fix (this deployment):** corrected the saved Distribution shape — dropped
  the redundant top-level minCounts and an **unsatisfiable** `sh:datatype xsd:anyURI`
  that contradicted `sh:nodeKind sh:IRI` on the same IRI properties. A download-only
  distribution now validates (`conforms: true`).
- **Server follow-up:** these defects originate in the bundled default-profile
  Distribution shape (`profiles/default/schemas/`); fix them at source so fresh
  deployments aren't malformed.
- *Lesser, not done:* the entry form doesn't yet enforce "at least one" client-side
  (the server does), so it would currently allow submitting neither URL and let the
  server reject it.

### 12.21 Removing a property's `sh:group` didn't stick — ✅ done (2026-06-11; this message)
- **Cause:** [`serialize.ts`](src/components/shacl-editor/serialize.ts) assigned
  *every* field to a group and always emitted `sh:group` — so a property whose
  group was removed (it lands in the synthetic empty-label bucket) got `sh:group`
  re-added on the next serialize (e.g. after any visual-editor edit + save).
- **Fix:** treat an empty-label group as "ungrouped" — emit neither its
  `PropertyGroup` block nor `sh:group` on its fields. Regression test added
  (a property with no `sh:group` round-trips without one).

---

## Phase 13 — "Specimen Archive" redesign + white-labeling (2026-06-15)

Sharpen the existing warm-paper design rather than replacing it: characterful
typography, atmosphere, the linked-data lineage as the signature motif, and —
first-class — deployer white-labeling (colors, logo, org name) through the
runtime-config path so one image serves any organisation. Full design rationale
and a working mockup: `design/proposal-specimen-archive.html`; the approved plan
covers each phase in detail. Sequence below is dependency-ordered: each task
leaves the app working and is independently shippable.

### 13.1 Token foundation + font swap — ✅ done (2026-06-15)
- Extracted the `:root` + `.theme-dark` variable blocks from `src/styles/main.css`
  into new [`src/styles/tokens.css`](src/styles/tokens.css); `main.css` now
  `@import`s it and keeps only base/utility rules. `main.ts` import unchanged.
- Repointed the Google Fonts `<link>` in [`index.html`](index.html) to Fraunces
  (display, variable opsz/ital) + Hanken Grotesk (UI) + Spline Sans Mono (RDF);
  `--font-sans`/`--font-serif`/`--font-mono` updated to match. No component edits —
  all font usage was already tokenized.
- Added `--paper-deep` (both themes) and a richer `--shadow-2`. Held off on
  retuning `--surface`/`--line` — that warmer-paper shift belongs with the
  atmosphere work in 13.3.
- **Gate green:** lint clean, `npm run typecheck` clean, `npm run test:unit` =
  315 passed (60 files). NOTE: actual scripts are `typecheck` / `test:unit`, not
  the `type-check` / `test:run` names in CLAUDE.md — that doc is stale.

### 13.2 Typography fit — ✅ done (2026-06-15)
- Reality check: ~30 serif display titles exist (all `font-weight: 400`, 20–44px),
  not the ~8–10 first estimated. Rather than 30 risky inline edits, used a single
  global source + targeted lifts:
  - Added a global `h1,h2,h3,h4 { font-optical-sizing: auto }` rule in
    [`main.css`](src/styles/main.css) (+ `-webkit-font-smoothing: antialiased` on
    body) so Fraunces' optical-size axis engages on every heading from one place.
  - Lifted the two flagship 44px public headlines — [`RecordHero.vue`](src/components/metadata/RecordHero.vue)
    h1 and [`MetadataBrowseView.vue`](src/views/MetadataBrowseView.vue) hero h1 — to
    `font-weight: 500`, tightened tracking/leading, explicit optical sizing.
- **Deliberately left at 400:** the ~32px admin/view titles (Steward, Entity edit,
  Schema/Policy editors, etc.) — Fraunces at 32/400 with opsz reads fine, and a
  blanket bump wasn't worth the churn/regression risk. Revisit after a real visual
  pass (run `npm run dev`) if any look light.
- **Gate green:** lint + `typecheck` clean, `test:unit` = 315 passed.

### 13.3 Atmosphere — ✅ done (2026-06-15)
- Added grain + vignette as global fixed pseudo-elements in [`main.css`](src/styles/main.css):
  `body::before` = SVG `feTurbulence` grain (opacity .035 multiply light / .05 screen
  dark, `pointer-events:none`); `body::after` = faint top accent vignette (`z-index:-1`).
- Added a `@media (prefers-reduced-motion: reduce)` guard disabling `.btn` hover
  transitions.
- **Not re-gated:** change is additive CSS only (no JS/TS), so typecheck/unit tests
  are unaffected. **Needs a visual check** at `localhost:5173` in both themes —
  confirm grain is subtle and the `z-index:9999` grain overlay doesn't sit over
  interactive layers awkwardly (it's `pointer-events:none`, so clicks pass through,
  but watch modals/menus); drop the grain z-index below overlays if it tints them.

### 13.4 Type-color system promoted — ✅ done (2026-06-15)
- Promoted the six record-kind colors to first-class tokens
  (`--t-fdp/-catalog/-dataset/-distribution/-biobank/-publication`) in
  [`tokens.css`](src/styles/tokens.css). fdp/catalog/dataset/distribution follow the
  semantic tokens (auto dark-adjust); biobank/publication get explicit dark lifts.
  Rewired `.type-tag .sq.*` in [`main.css`](src/styles/main.css) to consume them.
- Added type-colored left **spines** (3px inset `::before`, vertically inset so they
  never clip rounded corners / focus rings): [`CatalogCard.vue`](src/components/metadata/CatalogCard.vue)
  (static `--t-catalog`), [`DistributionRow.vue`](src/components/metadata/DistributionRow.vue)
  (static `--t-distribution`), and [`RecordCard.vue`](src/components/metadata/RecordCard.vue)
  (per-kind via a `--spine` var bound from `record.type` in the template).
- **Gate green:** lint + typecheck clean, `test:unit` = 315 passed (60 files).

### 13.5 Lineage rail (signature motif) — ✅ done (2026-06-15)
- Extended `Crumb` in [`useAncestors.ts`](src/composables/useAncestors.ts) with a
  `type: RecordKind` field. Reused the existing store-based classifier in
  [`rdf.ts`](src/api/rdf.ts) — exported `classify()` — and map the root (the API
  base) explicitly to `fdp`; other hops classify from `rdf:type`.
- New [`LineageRail.vue`](src/components/metadata/LineageRail.vue): type-colored
  node per hop + hairline connectors, current record emphasized, node color bound
  from `--t-<kind>`, `aria-label="Lineage"` / `aria-current="page"`.
- **Integration nuance:** rendered as a *horizontal* lineage inside the existing
  [`SecondaryNav.vue`](src/components/metadata/SecondaryNav.vue) bar (replacing the
  plain breadcrumb), not the vertical sidebar from the mockup — `RecordDetailView`
  is a centered single-column layout with no left rail, so a vertical version would
  mean restructuring the page (worth revisiting in 13.8 if a sidebar layout lands).
  `AppBreadcrumbs` left intact (still used by `StewardSubnav.vue`).
- **Gate green:** lint + typecheck clean; `test:unit` = 320 passed (62 files),
  incl. new `LineageRail.spec.ts` + `useAncestors.spec.ts`.

### 13.6 Deployer white-labeling — ✅ done (2026-06-15)
- Extended `FdpRuntimeConfig` with a `BrandingConfig` block (`orgName`, `logoUrl`,
  `logoUrlDark`, `theme`, `themeDark`) + a `runtimeBranding()` reader in
  [`runtimeConfig.ts`](src/runtimeConfig.ts).
- New [`useBranding.ts`](src/composables/useBranding.ts): `applyBranding()` (boot
  step in [`main.ts`](src/main.ts), before mount) injects an **allowlisted** token
  stylesheet — `BRANDABLE_TOKENS` = `--accent*`/`--signal*`/`--paper*`/`--surface`/
  `--ink`. **Design note:** overrides go in an injected `<style>` as a `:root` rule
  + a later `.theme-dark` rule (mirroring tokens.css layering) — NOT inline styles
  on the root, which would beat the `.theme-dark` selector and leak light values
  into dark mode. Unknown keys ignored; in-memory only.
- [`AppLogo.vue`](src/components/shared/AppLogo.vue) renders `branding.logoUrl`
  (dark variant via `resolvedTheme`) as an `<img>` when set, else the built-in
  lockup; [`AppHeader.vue`](src/components/shared/AppHeader.vue) `deploymentName`
  now prefers `branding.orgName` over the repository title.
- Documented the `branding` shape + allowlist in [`public/config.js`](public/config.js);
  added the `img-src` CSP note for remote logos in [`index.html`](index.html).
- **Gate green:** lint + typecheck clean; `test:unit` = 324 passed (63 files),
  incl. new `useBranding.spec.ts` (allowlist filtering, dark-leak-safe injection,
  theme-aware logo, no-op when unset).
- **Still wants a manual check:** drop a real `branding` block in `public/config.js`
  + reload (verify recolor + custom logo + removal restores default), per the plan's
  verification step 2.

### 13.7 RDF panel as first-class artifact — ✅ done (2026-06-15)
- The panel already had format tabs + copy/save/open + graph view; this pass made
  the serialization *read* as an artifact: paper-deep ground, surface-2 action bar,
  larger line-height, and **syntax tinting**.
- New [`rdfHighlight.ts`](src/components/metadata/rdfHighlight.ts): a small,
  dependency-free Turtle/N-Triples tokenizer returning plain-data segments
  (comment/iri/str/kw/pname). **XSS-safe** — rendered as Vue-escaped `<span>`s in
  [`RdfPreviewPanel.vue`](src/components/metadata/RdfPreviewPanel.vue), never
  `v-html`, even though the input is server RDF. Tinting applies to turtle/ntriples;
  JSON-LD / RDF-XML render plain. No change to what's fetched (content negotiation
  untouched).
- **Gate green:** lint + typecheck clean; `test:unit` = 329 passed (64 files), incl.
  new `rdfHighlight.spec.ts` (token classes, exact round-trip, `#`-in-IRI and
  punctuation-in-literal edge cases). Note: fixed an `exactOptionalPropertyTypes`
  slip (don't pass `cls: undefined`).

### 13.8 Roll across surfaces & polish — ✅ done (2026-06-15)
- **Warmed the light palette** to true "archive paper" in [`tokens.css`](src/styles/tokens.css)
  (`--paper #f5f1e8`, `--surface #fffdf7`, warmer `--line`/`--paper-deep`/`--surface-2`)
  and bumped light grain 0.035 → 0.05 in [`main.css`](src/styles/main.css). This was
  deferred from 13.1 and is the change that makes the editorial direction read at a
  glance (prompted by "I don't see the difference" — the prior passes kept the near-
  white grounds). Accent/signal unchanged (FAIR brand).
- Surface consistency: spines already cover catalog grid (`CatalogCard`) + search
  rows (`RecordCard`) + distributions; atmosphere is global; `RecordHero` Fraunces
  from 13.2. `AboutSidecar` dual identifier/sameAs/exactMatch block (ADR-0014) was
  already complete (commit 544fb75) — left as-is.
- **Gate green:** lint + typecheck clean; `test:unit` = 329 passed (64 files).
- **Still wants human eyes (visual, can't gate):** full dark-mode sweep and
  focus-visible ring contrast on the warmed palette; optional Playwright smoke on
  `/` + a record route. Everything is token-driven so dark mode should be coherent,
  but confirm at `localhost:5173`.

---

### 13.9 Prominence fix for lineage rail + RDF panel — ✅ done (2026-06-15)
- Feedback: on a record page both features rendered but read as "invisible" — the
  lineage rail looked like a plain breadcrumb (9px nodes) and the RDF panel was a
  collapsed sidecar widget. Verified via headless browser they *were* live on 5173
  (fonts/paper too); the issue was prominence, not a stale build.
- [LineageRail.vue](src/components/metadata/LineageRail.vue): larger 13px type-colored
  nodes + a per-hop uppercase **kind label** (FDP / CATALOG / DATASET) above the title,
  stronger connectors — now reads as a labeled lineage, not a breadcrumb. Spec updated
  for the new markup.
- [RdfPreviewPanel.vue](src/components/metadata/RdfPreviewPanel.vue): new `autoOpen` prop;
  [AboutSidecar.vue](src/components/metadata/AboutSidecar.vue) sets it so the record
  page reveals syntax-tinted Turtle on mount (header relabelled "Metadata source · RDF").
  **Behavior change:** one extra RDF GET per record-detail view (the landing hero is
  unchanged — still click-to-open). Easy to revert if the auto-fetch is unwanted.
- **Gate green:** lint + typecheck clean; `test:unit` = 334 passed (64 files). Verified
  visually with the headless browser on `/records/dataset/test-bmi-dataset`.

**Phase 13 complete (13.1–13.8).** Remaining is human visual QA in both themes +
the white-label manual check (drop a `branding` block in `public/config.js`). The
vertical lineage-rail layout (vs the horizontal one shipped in 13.5) is noted there
as a future option if a sidebar layout is introduced.

---

## 14. Authoring form unions inherited property shapes (schema composition) — ✅ done (2026-06-15)

The create/edit form for a type showed only that type's own properties, not the
ones it inherits — e.g. a Catalog form omitted the Dataset/Resource fields it
composes. `GET /{type}/spec` already returns the full shape **closure** (target
shape + everything it composes via `sh:node`/`sh:and`), but the client builder
[`fieldsFromShape`](src/api/entityForms.ts) only read the target shape's own
`sh:property`. (Confirmed with the server agent — no server change needed.)

- Added a `shapeClosure()` walk (shape-level `sh:node` + `sh:and` list members,
  BFS target-first, cycle-guarded) in [entityForms.ts](src/api/entityForms.ts);
  `fieldsFromShape` now unions `sh:property` across the closure, **deduping by
  `sh:path` with the most-derived (target) shape winning**. Same walk applied to
  `orGroupsFromShape` so inherited `sh:or` groups count too.
- Each `FieldSpec` carries an optional `origin` (the source shape's `rdfs:label`).
  [EntityForm.vue](src/components/metadata/EntityForm.vue) shows a small origin tag
  per field, but only when the type composes ≥2 shapes — so simple types stay clean
  and composed types visibly "indicate the combination" (the original ask).
- **Distinct from property-level `sh:node`** (nested sub-forms) — left unchanged.
- **Gate green:** lint + typecheck clean; `test:unit` = 334 passed (64 files), incl.
  5 new closure cases (union, origin tags, dedupe/override, cycle, inherited `sh:or`).
- *Follow-up option:* full section-by-origin grouping in the form (deferred — would
  fight the title-first field ordering; per-field tags chosen instead).

---

## 15. Live RDF graph — "Living specimen plate" (2026-06-15) — ✅ done

Replaced the sidecar's static one-hop RDF tree with an interactive, instance-focused
node-link graph (design prototype: `design/proposal-rdf-graph.html`, approved).

- **Pure model** [graphModel.ts](src/components/metadata/graphModel.ts) (+ spec): splits a
  focused record's triples into **relations** (object IRIs under `apiBase()` = other FDP
  records) and **attributes** (literals + external/vocabulary IRIs). `curie()` for compact
  predicate labels. Reuses `apiBase`/`iriToId`/`shortLabel`/`classify`/`NS` from rdf.ts.
- **Component** [RdfGraphView.vue](src/components/metadata/RdfGraphView.vue): reworked from
  the static tree into a compact hand-rolled **force canvas** (reactive positions + rAF
  loop, no new dep). Type-colored nodes (`--t-*`), focus node enlarged; attribute "specimen
  tags" (predicate → value, rust literal / accent IRI) on dashed leaders. **Relations** +
  **Attributes** toggles, wheel-zoom, drag-pan, node-drag, hover-spotlight, refocus+expand
  with back-history, fit. Honours `prefers-reduced-motion` (settles statically).
- **Refocus fetch**: `useRecordTurtle(id)` added to [useRecord.ts](src/composables/useRecord.ts)
  — cached raw-turtle `GET /{id}`; root ("") served at `/`.
- **Overlay**: [RdfGraphOverlay.vue](src/components/metadata/RdfGraphOverlay.vue) (Teleport,
  `role=dialog`, Esc/backdrop close, scroll-lock) mirroring `ContainerBrowser`. The
  [RdfPreviewPanel.vue](src/components/metadata/RdfPreviewPanel.vue) **Graph** chip opens it
  (the 308px sidecar is too narrow); serialization tabs stay inline as the non-visual
  alternative.
- **Gate green**: lint + typecheck clean; `test:unit` = 340 (65 files) incl. graphModel (7)
  + RdfGraphView (5). Live-verified headlessly (overlay opens, layers toggle, refocus, Esc).
- *Notes:* no new deps / no server change. A deep-linkable `/graph` route was left out of
  scope (overlay chosen). The old static-tree `RdfGraphView` is fully replaced.

---

## 16. Repository (FDP root) form bypassed the SHACL form generator — ✅ done (2026-06-16)

**Symptom:** the FAIR Data Point (root) edit form showed none of its composed/inherited
schema (FAIRDataPoint → MetadataService → DataService → Resource) — "the same issue" as
the catalog form before task 14.

**Root cause (identified):** [RepositoryEditView.vue](src/views/RepositoryEditView.vue)
**hand-rolled three fields** (title/description/publisher) and read/wrote them directly —
it never used the SHACL shape. The task-14 fix (closure-aware `fieldsFromShape`) lives in
the *entity* form pipeline (`useEntityShape` → `EntityForm`), which RepositoryEditView
bypassed. Verified empirically that `fieldsFromShape` on the real `/fdp-api/spec` already
returns all 24 fields across the 4-level FDP chain — so the generator was never the
problem; the root form was simply on a different, hardcoded path.

**Systematic fix:** routed RepositoryEditView through the *same* pipeline as
`EntityEditView`/`EntityCreateView` — `specFor(root)` (classIri = FAIRDataPoint) →
`useEntityShape` → `EntityForm` → `modelFromTurtle`/`applyEditTurtle` RMW (keeps root
specifics: `apiBase()` subject, `readGraph("")`/`putGraph("")`, `["repository"]`
invalidation). Now **all** metadata edit/create forms derive fields from one
closure-aware generator (`grep useEntityShape src/views` = the only three forms), so a
deeper hierarchy can't silently lose inherited properties again.
- Also taught [useEntityShape.ts](src/composables/useEntityShape.ts) the root spec URL
  (`/fdp-api/spec`, not `/fdp-api//spec`).
- The closure walk (`fieldsFromShape` + server `shape_closure`) is unbounded + cycle-safe,
  so it handles arbitrary depth; the server `/spec` serves the full closure for every type.
- **Gate green:** lint + typecheck clean; `test:unit` = 340 (65 files). Steward-gated form
  not headlessly verifiable (anon redirect), but the field generation is proven via the
  real `/spec` + shared pipeline.

---

## 17. Authoring form: repeatable multi-value fields + reference-form ideas — planned (2026-06-16)

**Motivation:** the dynamic record form renders multi-valued properties (`dcat:keyword`,
`owl:sameAs`, `skos:exactMatch` — the `keywords`/`iris` field kinds) as a **single text
input** whose value is `array.join(", ")`, re-parsed on every keystroke by
`parseKeywords()` ([EntityForm.vue:127-134](src/components/metadata/EntityForm.vue#L127-L134)).
That round-trip is lossy mid-typing: typing `foo,` parses to `["foo"]` and re-renders as
`foo`, so the comma is eaten — the field the help text calls "Comma-separated" actively
refuses commas. The old client
([FAIRDataPoint-client `ShaclForm`](https://github.com/FAIRDataTeam/FAIRDataPoint-client/tree/develop/src/components/ShaclForm))
instead renders one input per value with per-row remove (×) and an "Add" (+) button, gated
on `sh:minCount`/`sh:maxCount`. A review of that implementation surfaced three more ideas
worth porting (17.3–17.5), each independent of the core fix.

**Key enabler:** the model/RDF layers already represent these as `string[]` end-to-end
(`emptyModel` → `[]`, `modelFromTurtle` → `many()`, `applyModel` → `setLiterals`/`setIris`),
and `setLiterals`/`setIris` already `.trim()` and drop blanks
([rdf.ts:143-159](src/api/rdf.ts#L143)). So 17.1–17.2 are a **presentation-only** change —
no serialization, parsing, or round-trip logic moves. The comma-join lives solely in the
form widget.

### 17.1 `RepeatableInput` component — core
- New [src/components/metadata/RepeatableInput.vue](src/components/metadata/RepeatableInput.vue):
  props `modelValue: string[]`, `type: "text" | "url"`, `label`, `placeholder?`,
  `minCount?` (default 0), `maxCount?` (default ∞).
- One `<input>` per entry (bound by index); a remove button per row
  (`<AppIcon name="x">`) shown while `count > minCount`; an "Add" button below
  (`<AppIcon name="plus">`) hidden once `count >= maxCount`. Empty array → just the Add
  button. Emits `update:modelValue` on every edit/add/remove.
- A11y: per-row `aria-label` `"{label} (value N)"`; remove `"Remove {label} value N"`;
  add `"Add {label}"`.
- Nicety (preserves the old power-user flow): a paste handler that splits comma-separated
  pasted text into multiple rows via the existing `parseKeywords` (keeps it used + tested).
- **Test** `RepeatableInput.spec.ts`: Add appends; remove splices the right index; Add
  hidden at `maxCount`; remove hidden at `minCount`; emits arrays; paste splits on commas.

### 17.2 Wire into `EntityForm` + carry cardinality — core
- Replace the `keywords`/`iris` branch in `EntityForm.vue` with `<RepeatableInput
  :type="f.kind === 'iris' ? 'url' : 'text'" …>`; delete the now-dead `asList` helper.
- Add optional `minCount?`/`maxCount?` to `FieldSpec`; populate both from
  `sh:minCount`/`sh:maxCount` in `fieldsFromShape` so add/remove gating is shape-accurate
  (the `single` detection already reads `maxCount`).
- Drop "Comma-separated" from the static `keywords`/`sameAs`/`exactMatch` help strings
  (→ e.g. "Add one value per row.").
- **Test**: extend `entityForms.spec.ts` to assert `fieldsFromShape` sets `minCount`/
  `maxCount`; add a round-trip test (multi-value edit incl. a blank row → correct triples,
  blanks dropped). New `EntityForm.spec.ts`: mount a `keywords` field, assert add/remove
  drives the bound model. Keep the `parseKeywords` test.

### 17.3 `sh:group` sectioning + `sh:order` ordering — enhancement
- The reference groups fields into titled sections (`sh:group` → `<h2>` + comment) and
  sorts by `sh:order`; neo renders a flat list sorted title→description→alpha with `origin`
  badges. Read `sh:group` (PropertyGroup `rdfs:label`/`rdfs:comment`) and `sh:order` in
  `fieldsFromShape`; render grouped sections in `EntityForm`, falling back to the current
  flat+sorted layout when a shape declares neither (so nothing regresses for the bundled
  DCAT shapes). `sh:order` becomes the primary sort key, current rank the tiebreaker.
- **Decide:** whether `origin` badges and `sh:group` sections coexist or the group
  subsumes origin grouping. **Verify** the server `/spec` actually serves `sh:group`/
  `sh:order` before building UI on them; if absent, this is a server-coordinated change.
- **Test**: a shape with two groups + orders yields ordered sections; a shape with neither
  renders the existing flat layout unchanged.

### 17.4 Per-field server-validation annotation — enhancement
- Today a failed save shows one banner with a flat `violations` list
  ([EntityCreateView.vue:162-167](src/views/EntityCreateView.vue#L162)). The reference maps
  the SHACL validation report (`focusNode` + `resultPath` → field) and shows the message
  inline under the offending control. Map server violations to `FieldSpec.key` by predicate
  (`resultPath`) and render the message beneath that field in `EntityForm`; keep the banner
  for node-level / unmapped violations. Show a field's error only once it's dirty (touched),
  per the reference, to avoid shouting on first paint.
- Depends on `parseFdpError` violations carrying the `resultPath`/predicate — **confirm**
  the server error shape includes it; if not, coordinate the server change.
- **Test**: a violation with a known path annotates that field; an unmapped one stays in the
  banner.

### 17.5 Live Turtle preview on the authoring form — optional
- The reference offers a collapsible "View RDF" turtle preview on the form. Neo shows RDF
  panels on record/detail surfaces but not while authoring. Add a collapsible read-only
  `TurtleEditor` (already used by `LicensesView`) to `EntityCreateView`/`EntityEditView`
  fed by `buildCreateTurtle`/`applyEditTurtle`, so authors see exactly what will be saved.
- **Test**: editing a field updates the previewed Turtle.

### 17.6 Gate
- `npm run lint && npm run typecheck && npm run test:unit` green; live-verify add/remove on
  a dataset's Keywords (create form is steward-gated — verify signed in, or via the
  component test if anon redirect blocks headless).

**Sequencing:** 17.1–17.2 are the requested fix and ship together. 17.3–17.5 are
independent follow-ons (each its own PR); 17.3 and 17.4 may need a server-spec/error-shape
confirmation first — surface that before building, per the repo's "don't improvise
underspecified contracts" rule.

---

## 18. Internationalization — multilingual UI (vue-i18n) — infra + shell done; 18.7 deferred (2026-06-30)

**Motivation:** the client was English-only — every user-facing string hardcoded in
`.vue` templates, `<script setup>` blocks, and a few `.ts` modules. This phase answers the
long-standing "Internationalization scope for v1" open question (CLAUDE.md) and lets a user
switch the UI language at runtime. **Launch languages:** English (`en`, baseline),
Brazilian Portuguese (`pt-BR`), Dutch (`nl`), Spanish (`es`), German (`de`), French (`fr`).

**Decisions (agreed with the maintainer):**
- **Rollout:** build the full i18n infrastructure + all 6 locale bundles now; fully convert
  the **app shell** + 2 flagship views this phase. The remaining ~75 views/components follow
  in tracked sub-passes (18.7) using the identical `useI18n()` pattern.
- **Translations:** all 5 non-English bundles are machine-authored and **flagged for
  native-speaker review** (FAIR/RDF terms — catalog, schema, SHACL, IRI, steward).
- **RDF labels:** the chosen UI locale also drives RDF-literal language preference
  (`useLabels` / `api/languages.ts`) — one coherent language choice.
- **No browser storage** (CLAUDE.md): locale is in-memory, defaulted from
  `navigator.language` each load (mirrors the `theme` store). A deployer can pin a default
  via `/config.js` (`defaultLocale`). Server-profile persistence is a future option.

**New dependency:** `vue-i18n@^11` — the standard Vue 3 i18n library; clears the CLAUDE.md
"don't add a dep casually" bar (no existing primitive solves UI translation).

### 18.1 i18n core + locale catalog — ✅
- `src/i18n/index.ts` (`createI18n`, `legacy: false`, `en` fallback; `translate`/`hasMessage`
  helpers for non-component `.ts` modules), `src/i18n/locales.ts` (`SUPPORTED_LOCALES`
  endonyms, `matchSupportedLocale`, `resolveInitialLocale`), `runtimeConfig.ts`
  `defaultLocale` + `runtimeDefaultLocale()`.

### 18.2 Locale message bundles — ✅
- `src/i18n/messages/{en,pt-BR,nl,es,de,fr}.ts`. `en.ts` is the source of truth and exports
  the `Messages` type; the other five are typed `: Messages` (compile-time key parity) and
  flagged machine-authored. Named interpolation + plural (`a | b`) forms.

### 18.3 Locale store + switcher — ✅
- `src/stores/locale.ts` (in-memory; `setLocale` updates i18n locale, `<html lang/dir>`, and
  exposes `rdfLang`). `src/components/shared/LanguageSwitcher.vue` in `AppHeader` beside
  `ThemeToggle` (endonym menu, globe trigger, keyboard-navigable, i18n `aria-label`).
- Wire `app.use(i18n)` in `main.ts` (sets `<html lang/dir>` on boot); add `defaultLocale`
  to `public/config.js`. PrimeVue locale dictionary is **deferred** — no locale-bearing
  PrimeVue widgets (Calendar/Paginator/Dialog) are in use, so it would be dead code today;
  add it when one lands. **Test** `LanguageSwitcher.spec.ts`.

### 18.4 Convert the app shell — ✅
- `App.vue`, `AppHeader`, `AppFooter`, `UserMenu`, `ThemeToggle` (computed switch → keyed),
  `AppErrorBoundary`, `NotFoundView`, `AuthCallbackView`.

### 18.5 Centralized errors + validation — ✅
- `api/errorMessages.ts` (21 codes → `errors.*` keys via `translate`/`hasMessage`, keeping
  the server-message fallback) and the parameterized `validateConstraints` messages in
  `api/entityForms.ts` (`validation.*`).

### 18.6 Flagship views + locale-aware formatting + RDF coordination — ✅
- Convert `MetadataBrowseView` and `SearchView` (incl. plural results count). Route
  `MetricsDashboardView` number formatting and `TimeSeriesChart` date/time formatting through
  the active locale. `useLabels` passes `rdfLang` into `fetchLabels` + the `queryKeys.labels`
  key (`api/queries.ts`); `orderedLanguages()` (`api/languages.ts`) orders by the active UI
  locale first.

### 18.7 Remaining surfaces — 🔄 in progress, batched (each its own commit)
Same `useI18n()` + namespaced-keys pattern as the shell (18.4–18.6); ~50 surfaces, worked in
coherent batches. **SHACL editor is NOT here** — replaced via Phase 19 (its own translations).
- ✅ **Batch 1 — Schema-admin chrome** (`SchemaEditorView`, 2026-07-01): `schemaAdmin.*`
  namespace across all 6 bundles; list/id/actions/testbed/errors converted (lede + test-help
  use `<i18n-t>` for embedded markup). Gate green (494 tests, parity holds).
- ⬜ Batch 2 — ODRL editor (`OdrlComposer`, `PolicyEditorView`, `OdrlPreview`).
- ⬜ Batch 3 — Admin (`UsersAdminView`, `ResourceDefinitionAdminView`, `SettingsView`,
  `SettingEditor`, `ResetPanel`, `AutocompleteSourcesEditor`, `SearchFiltersEditor`).
- ⬜ Batch 4 — Metrics (`MetricsDashboardView`, `PrivacyDisclosure`, `TimeRangePicker`,
  `TimeSeriesChart` series labels).
- ⬜ Batch 5 — Account (`ProfileView`, `ApiKeysView`) + Appearance (`AppearanceView`).
- ⬜ Batch 6 — Metadata authoring (`EntityForm`, `EntityCreate/EditView`, `RepositoryEditView`,
  `RepeatableInput`, `AboutSidecar`).
- ⬜ Batch 7 — Metadata display (`RecordDetailView`, `PropList`, `RdfGraphView`,
  `ContainerBrowser`, `StewardDashboardView`, misc cards).
- ⬜ Batch 8 — SPARQL (`SparqlPlaygroundView`, `SparqlEditor`, `SparqlResultsTable`) + Licenses
  (`LicensesView`) + `AttributionsView`.
- App is multilingual-capable throughout the shell + editor; these batches extend it to the rest.

### 18.8 Gate — ✅ (lint + typecheck + 428 unit tests green; build OK)
- `npm run lint && npm run typecheck && npm run test:unit` green; `i18n.spec.ts` +
  `locales.spec.ts` + `locale.spec.ts` + `LanguageSwitcher.spec.ts` (26 new tests) assert
  key parity, resolution precedence, and switching. Still **TODO** (manual): switch each of the 6
  languages → shell/footer/menu/404/error states change, `<html lang>` updates, reload
  reverts to browser language, `defaultLocale` in `/config.js` boots in that locale, and a
  German UI issues `GET /labels?...&lang=de`.

**Sequencing:** 18.1–18.2 done; 18.3 unblocks the visible switcher; 18.4–18.6 are the
this-phase extraction; 18.7 is explicitly out of this phase.

---

## 19. Integrate the "Contour" visual SHACL editor — ✅ complete (2026-07-01)

**Motivation:** a separate, feature-rich standalone editor ("Contour", sibling repo —
Vue 3 + n3, no Vue Flow/Pinia/router, custom i18n, builds single-file) is more complete at
SHACL modeling than the in-client editor and is **already translated to the same 6
languages**. Rather than translate the current editor in 18.7 (throwaway) we replace its
engine with Contour's and graft on the FDP-specific integration. Decision: **Option A**
(adopt Contour's engine), recorded after a feature inventory of both + a file-level design.

**Sourcing:** the two repos stay **independent projects** — we **copy** the needed
functionality from Contour into the client (vendoring) and adapt it here; **no npm package,
submodule, or iframe link, and no changes to Contour itself.** Copied files carry a header
crediting Contour + the source commit so a future re-sync is traceable. Contour continues to
ship as its own standalone app.

**Key facts driving the design:**
- **Clean Turtle boundary.** [SchemaEditorView.vue](src/views/SchemaEditorView.vue) is a
  lifecycle host whose entire server contract is Turtle strings: `getSchemaTurtle(id)` in,
  `putSchema(id, turtle)` out, `validateSample(id, sample)` → `SchemaViolation[]`, plus the
  schema list/slug/protected/delete logic. Contour's engine is also Turtle-in/out, so the
  host + server wiring stay; the editor *body* is swapped underneath.
- **Multi-shape mismatch (the crux).** FDP's model ([model.ts](src/components/shacl-editor/model.ts))
  is genuinely multi-shape (`SchemaDocument { shapes: ShapeModel[] }`) and `parse.spec.ts`
  exercises it; the Vue Flow canvas (inter-shape edges + resource-type ghost nodes) depends
  on it. Contour ([../Contour/src/types.ts](../Contour/src/types.ts)) is primary-shape +
  flat `nestedShapes[]` (with a designed-but-inactive `ShapesDoc` peer model). **Resolution:
  keep FDP's `shapes[]` as the document wrapper; use Contour's richer per-shape `Field`
  engine inside it.**
- **Contour `Field` is richer:** language-tagged `sh:name`/`sh:description` (+ translations),
  field-level `sh:or` (`orTypes`), `sh:inversePath`, `sh:message`/`sh:severity`, tagged
  `sh:in` (literal vs IRI). These are the features we gain.
- **i18n is compatible:** Contour's nested messages, `{name}` interpolation and `{one,other}`
  plurals map 1:1 to vue-i18n. Work = normalize tags (`nl-NL→nl`, `es-ES→es`, `de-DE→de`,
  `fr-FR→fr`; `en`/`pt-BR` already match), namespace under `schemaEditor.*`, swap Contour's
  `useI18n` for vue-i18n's, and **drop its `localStorage`** (draft/recent/`contour.locale`) —
  CLAUDE.md forbids storage; server is source of truth.
- **Canvas (revised after 19.2b — decided with the maintainer):** now that Contour's own
  `Canvas` (field workbench) + `GraphView` (RDF graph overview) are ported, the editor
  **uses Contour's surfaces and FDP's Vue Flow `ShaclCanvas`/`graph.ts` are retired** (19.6).
  The two FDP-only features — resource-type ghost nodes + server-violation badges on the
  graph — become **tracked follow-ups** layered onto Contour's `GraphView` (19.8), not
  blockers. This dissolves the original 19.3 (no `buildShapeGraph` adapter needed).
- **Multi-shape:** Contour's engine already handles multiple peer top-level `sh:NodeShape`s —
  `parseShacl` keeps the first as primary and the rest in `nestedShapes[]`, and `generateShacl`
  re-emits them; round-trip is covered by the ported specs. So no wrapper is required either.

### 19.1 i18n merge groundwork — ✅ (2026-06-30)
- Vendored Contour's 6 bundles to `src/i18n/messages/schema-editor/` (tag-normalized
  `nl-NL→nl`/`es-ES→es`/`de-DE→de`/`fr-FR→fr`; provenance header @ Contour `4117ff2`),
  composed into the one `vue-i18n` instance under `schemaEditor.*`
  ([src/i18n/index.ts](src/i18n/index.ts)). Compile-time parity via a typed
  `Record<EditorLocale, EditorMessages>` (typecheck confirmed Contour's translations are
  complete) + runtime parity/empty/plural-shape spec.
- **Refinement vs plan:** rather than rewrite ~300 component call sites, added a thin
  `useI18n` **shim** at
  [src/components/shacl-editor/contour/composables/useI18n.ts](src/components/shacl-editor/contour/composables/useI18n.ts)
  presenting Contour's API (`t`/`plural`/`locale`) but backed by the single instance +
  locale store (auto-prefixes `schemaEditor.`, resolves `{one,other}` plurals via `tm`).
  Vendored components (19.2) keep their `../composables/useI18n` import unchanged.
- Gate green: lint + typecheck + 444 unit tests (16 new). No UI wired yet.

**Port style (decided):** adopt Contour's behaviours as **first-class FDP code held to the
full strict config** — no tsconfig carve-out. **Hybrid:** copy-then-adapt the intricate RDF
engine faithfully (keep its logic + tests, satisfy the strict flags); re-port UI/state/
styling into client idioms (19.2b+). The two extra strict flags (`noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`) that Contour didn't use are satisfied with behavior-preserving
`!` at checked index sites + `?: T | undefined` on the model's optional props.

### 19.2a Port the engine — ✅ (2026-07-01)
- Vendored `types.ts`, `shacl.ts` (parse/generate + F4 adapters), `rdf.ts`, `data.ts`,
  `validation.ts`, `jsonld.ts`, `composables/{useSchema,useDrag}.ts` into
  `src/components/shacl-editor/contour/` (provenance header @ `4117ff2`); conformed to the
  full strict config. The i18n shim (19.1) stays importing `@/i18n` (no cycle under one
  program). Contour's 9 model specs ported and passing (parse/generate/roundtrip/
  preservation/useSchema/validation/shapes.adapter/jsonld) — 133 engine tests.
- Gate green: lint + typecheck + 573 unit tests. No components/CSS yet (19.2b), nothing wired
  into the live editor (19.4).

### 19.2b Re-port the editor components — ✅ (2026-07-01)
- Vendored all 14 components to `contour/components/` (`Canvas`/`Inspector`/`Palette`/
  `FieldCard`/`FieldInput`/`FormPreview`/`PreviewField`/`OrTypesEditor`/`TranslationsEditor`/
  `InValuesEditor`/`PrefixEditor`/`GraphView`/`Icon`/`WidgetIcon`), conformed to the full
  strict config (a handful of `!` at checked index sites; `FieldCard`'s widget computed
  defaults to `TextFieldEditor`). They keep the `useI18n` shim import.
- **CSS:** ported Contour's single 1845-line `style.css` → `contour/editor.css`, generated by
  `scope-css.mjs`: every selector prefixed under a `.contour-editor` root (so Contour's
  generic classes — `.btn`, `.field`, `.canvas` — don't collide with the app), Contour's
  `:root` dropped and replaced by a **token bridge** mapping its names to the client's design
  tokens (theme-aware; dark mode follows). Colliding token names (`--font-mono`,
  `--shadow-1/2`) are omitted so they inherit the client's globals.
- **Deviations from the plan (pragmatic, flagged):** (1) kept Contour's self-contained
  `Icon`/`WidgetIcon` rather than remapping ~13 call sites to `AppIcon` (risk/effort; the
  visual result is equivalent — can migrate later). (2) One **scoped stylesheet** rather than
  per-component `<style scoped>` blocks — achieves the same isolation + theming without
  shredding 1845 lines by hand (lower regression risk); components stay faithful copies. A
  one-line eslint override turns off `vue/multi-word-component-names` for the vendored
  components (single-word names by origin). Dropped `marked`/font deps (not needed).
- Not wired into the live editor yet (19.4 renders these under a `.contour-editor` root and
  imports `editor.css`). Gate green: lint + typecheck + 573 tests + build.

### 19.3 Multi-shape + canvas — ✅ dissolved by the canvas decision (2026-07-01)
- No `buildShapeGraph` adapter (Vue Flow retired). No document wrapper: Contour's engine
  already parses/round-trips multiple peer shapes (primary + `nestedShapes[]`), verified by
  the ported round-trip/adapter specs. The editor renders through Contour's own surfaces.

### 19.4a Encapsulated `ContourEditor.vue` — ✅ (2026-07-01)
- Built [contour/ContourEditor.vue](src/components/shacl-editor/contour/ContourEditor.vue):
  Contour's editor body (visual workbench Palette·Canvas·Inspector / SHACL-code tab / form
  preview + RDF `GraphView` overlay + issues strip + undo/redo), under a `.contour-editor`
  root that imports `editor.css`, driven by Contour's `useSchema`. Contour's app chrome
  (file I/O, examples, recent, draft autosave, language menu) is intentionally omitted.
- **Code tab uses the client's Monaco `TurtleEditor`** (client-idiomatic) instead of porting
  Contour's ~200-line textarea autocomplete; edits parse → `load` back into the store.
- Added `load(schema)` to the ported `useSchema` store (replaces the doc + resets history) so
  the host can open a different server schema. Exposes `loadTurtle(ttl)` / `getTurtle()`.
- Standalone + green (typecheck + lint + 575 tests); not yet wired into `SchemaEditorView`.

### 19.4b Wire into `SchemaEditorView` + server — ✅ code-complete (2026-07-01)
- [SchemaEditorView.vue](src/views/SchemaEditorView.vue) rewritten: the three old tab bodies
  (ShaclCanvas/FormDesigner/ShaclFormPreview + Monaco + tidy) are replaced by a single
  `<ContourEditor ref>`. Kept the FDP lifecycle: schema list, id/slug, save/delete, protected
  handling, and the server sample-validation testbed. `load(id)` → `getSchemaTurtle` →
  `editorRef.loadTurtle`; `onSave` → `editorRef.getTurtle()` → `putSchema`. Editor handle typed
  explicitly (the component instance type widens to `any`). Old editor imports/undo/tidy/parse
  state removed; dead tab CSS dropped.
- Gate green: lint + typecheck + 575 tests + build (the SchemaEditorView chunk now bundles the
  editor + its scoped CSS). **⚠ Not yet exercised in a browser** — there are no component/E2E
  tests that mount the editor in the view, so rendering, styling, drag-drop, and the live
  server save/validate round-trip are **unverified** until 19.7 (manual/dev-server check).
- Deferred to 19.8: mapping the testbed's server violations back onto editor fields (the old
  canvas badge behaviour) — for now they show in the result panel as before.

### 19.5 No storage / locale self-management — ✅ confirmed clean (2026-07-01)
- Audited the vendored `contour/` tree: **no `localStorage`/`sessionStorage`** (the only match
  is a comment in the `useI18n` shim noting what we left out), **no** Contour locale
  self-management (`detectInitial`/`navigator.language`/`contour.locale` — the shim + client
  locale store own it), and `usePersistence`/Contour's `App.vue` (draft autosave, recent) were
  never copied in. CLAUDE.md's no-browser-storage rule holds.
- No dead deps to prune: nothing imports `marked`/`@fontsource/*` and neither is in the client
  `package.json` — the port added only `vue-i18n`. Nothing to change.

### 19.6 Retire old editor internals — ✅ (2026-07-01)
- Deleted the orphaned old editor (nothing live imported it after 19.4b): components
  `ShaclCanvas`/`ShapeNodeCard` (Vue Flow), `FormDesigner`/`FieldCard`/`FieldInspector`/
  `GroupInspector`/`SchemaInspector`/`WidgetPalette`/`ShaclFormPreview`; engine
  `model`/`parse`/`serialize`/`mutations`/`graph`/`widgets`/`preview`/`violations`/`status`/
  `factories`/`dragImage`; the `shaclEditor` Pinia store; and all their specs (~81 tests).
- **Kept** `TurtleEditor.vue` (shared Monaco wrapper — used by the new editor, ODRL preview,
  and Licenses). Removed the now-unused `@vue-flow/{core,background,controls}` deps + the
  vite `vendor-flow` chunk rule; fixed two stale ODRL doc comments that referenced deleted
  files.
- Gate green: lint + typecheck + build + 494 tests. Editor surface is now solely the vendored
  Contour editor.

### 19.7 Gate + live verify — ✅ PASS (2026-07-01)
- Gate green (lint + typecheck + 575 tests + build). **Live-verified** against the running
  fdpneo stack via Playwright (dev server on `:5173` — the CORS/OIDC-allowed origin; admin
  OIDC login through Keycloak):
  - ✅ editor renders natively in the FDP shell, themed via the scoped `.contour-editor` +
    token bridge (no leaking/unstyled CSS); Visual/SHACL-code(Monaco)/Form-Preview tabs + Graph.
  - ✅ schema list loads; loading `dataset` (a real server schema) populates the editor.
  - ✅ **save (PUT) → 200**, **sample-validate (POST /validate) → 200 "Conforms"**,
    delete → 204 — full server round-trip.
  - ✅ header language switch also translates the editor (DE: `Visueller Editor` / `SHACL-Code`
    / `Formularvorschau`).
- **Bug found + fixed during verify:** the ported serializer emits `:`/`rdfs:`/`dash:`-namespaced
  terms (minted group IRIs, group labels, editor widgets), but parsing a schema whose Turtle
  omits those `@prefix` lines (the starter, hand-written schemas) produced Turtle with unbound
  prefixes → server 400 `"Prefix ':' not bound"`. Fixed in `ContourEditor` via
  `ensureRequiredPrefixes()` — merges any missing `DEFAULT_PREFIXES` on load/parse (existing
  declarations win). Re-verified: save now 200. **(This fix is uncommitted.)**

### 19.8 Deferred FDP-only editor features — ✅ (2026-07-01)
The two features the old Vue Flow canvas had, re-added onto Contour's surfaces.
- **Server-validation → field annotation.** `ContourEditor` takes a `violations` prop (from the
  testbed's `POST /validate`), maps each `resultPath` to the matching field by CURIE, and passes
  a per-field map through `Canvas` → `FieldCard`, which renders an inline warning + red border.
  Live-verified: a sample missing `dct:title` flags the `dct:title` field with "Less than 1
  values on …".
- **Resource-type ghost nodes.** `SchemaEditorView` derives `{classIri,label}` from
  `useResourceTypes` (`specFor`) → `ContourEditor` → `GraphView`, which renders dashed/italic
  ghost nodes for registered types no shape here targets (CURIE-normalized match). Live-verified:
  the graph shows Catalog/Dataset/DataService/Distribution/FAIRDataPoint as ghosts.
- **Bug caught by the thorough test + fixed:** `GraphView` uses `<Teleport to="body">`, which
  moved the overlay outside the `.contour-editor` root so the scoped `editor.css` never reached
  it (overlay rendered unstyled/collapsed — a latent 19.2b defect). Fixed by wrapping the
  teleported content in a `.contour-editor` div.
- **Thorough live test** (Playwright, admin OIDC, against the running stack): add-widget (via
  palette) ✅, undo ✅, publish (PUT 200) ✅, failing-sample validate → field badge ✅, graph
  overlay + ghost nodes ✅, language→DE translates editor ✅, delete (204) ✅. Gate: lint +
  typecheck + 494 tests + build green. **(19.8 changes uncommitted.)**

**Sequencing:** 19.1 is independent (do first). 19.2→19.3→19.4 are the core swap and land
together or as a tight series behind the existing editor until 19.4 flips it. 19.5–19.6 are
cleanup once 19.4 is proven; 19.7 gates the phase (**done**). 19.8 is optional polish. The
editor-independent 18.7 surfaces can proceed in parallel since they don't touch the editor.

---

## Open items

- ~~Theme tokens and final design system~~ — addressed by Phase 13
  (`design/proposal-specimen-archive.html` + tokens.css extraction).
- Accessibility audit pass once visual surfaces stabilize.
- ~~Internationalization — not in scope for v1~~ — now in progress as **Phase 18**
  (vue-i18n; en + pt-BR/nl/es/de/fr). Infra + shell first; remaining surfaces in 18.7.
