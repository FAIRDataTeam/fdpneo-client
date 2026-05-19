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

## Open items

- Theme tokens and final design system (likely arrives via Claude Design
  handoff; see UX-DESIGN-BRIEF.md).
- Accessibility audit pass once visual surfaces stabilize.
- Internationalization — not in scope for v1 but the messaging layer should
  not block it.
