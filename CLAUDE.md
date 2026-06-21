# Claude Code context — fdp-client

This file is read automatically by Claude Code on every session. It establishes the project context and conventions so each session starts informed.

## What this project is

The reference web client for FAIR Data Point v2 — a Vue 3 + TypeScript single-page application that talks to the FDP server (separate repository: `fdp-server`). The client renders four user-facing surfaces:

1. **Metadata browsing and search** — catalog navigation, record detail views, faceted and free-text search, SPARQL playground.
2. **Visual SHACL editor** — node-based canvas for authoring schemas, functionally inspired by [ProjectOak](https://github.com/luizbonino/ProjectOak).
3. **Visual ODRL editor** — guided editor for authoring access policies within the FDP ODRL profile.
4. **Metrics dashboard** — charts rendered from the server's anonymous metrics API.

The architecture for both server and client is documented in the `fdp-server` repository under `docs/architecture/`. Refer to Section 13 ("Client application") in particular, and the relevant ADRs (ODRL profile, LDP semantics, authorization model).

## Architectural ground rules

- **The client is stateless across reloads.** All persistent state lives in the FDP server. Local state is UI state only: form drafts, expanded/collapsed sections, current view. Use Pinia for cross-component UI state; don't try to mirror server data.
- **No browser storage for app state.** No `localStorage` or `sessionStorage` for user data. The OIDC library handles auth tokens with its own storage strategy. Beyond that, in-memory only.
- **OIDC happens directly between client and IdP.** The FDP server is not in the authentication path — it only validates the bearer tokens the client sends. Don't proxy auth flows through the server.
- **API types come from OpenAPI.** Don't hand-write request/response types. Run `npm run generate-api` to regenerate from the server's OpenAPI spec; the generated types are the contract.
- **Visual editors must respect server-side validation.** The SHACL editor and ODRL editor produce RDF that the server will validate; the editors are not the source of truth on what's valid. Surface server validation errors back to the user with useful pointers, but don't try to replicate full validation client-side.

## Tech stack

- Vue 3 with the Composition API (`<script setup>` style)
- TypeScript 5, strict mode
- Vite for build and dev server
- Pinia for state
- TanStack Query (Vue) for server cache
- Vue Router for routing
- Axios for HTTP, with auth interceptor
- `oidc-client-ts` for OIDC Authorization Code + PKCE
- PrimeVue for components and forms
- Vue Flow for the SHACL editor canvas
- Vitest for unit/component tests
- Playwright for e2e

## Common commands

```bash
# Install dependencies
npm install

# Generate API types from the server OpenAPI
npm run generate-api

# Start dev server (default http://localhost:5173)
npm run dev

# Build for production
npm run build

# Tests
npm test              # Vitest, watch mode
npm run test:unit     # Vitest, single run
npm run test:coverage # Vitest, single run + v8 coverage report
npm run test:e2e      # Playwright — MANUAL (needs the docker stack up); not run in CI

# Lint and format
npm run lint
npm run format

# Type check
npm run typecheck
```

## Code conventions

- **`<script setup lang="ts">` for every component.** Options API is not used.
- **Composables for shared logic.** Anything reused across components (auth state, API access, form helpers) goes in `src/composables/`.
- **One Pinia store per concern, not per page.** Stores own UI state that crosses components; per-page state lives in the page component.
- **No `any` without a comment.** TypeScript strict mode is on. Use `unknown` and narrow when you genuinely don't know the type.
- **Server data goes through TanStack Query.** Don't manually `useState` server responses. Query keys are stable and documented in `src/api/queries.ts`; the fetchers live in `src/composables/use*.ts`.
- **PrimeVue components first, custom components only when needed.** Don't reach for headless libraries if PrimeVue has the primitive.
- **Tailwind is not in use.** Styles live in component `<style scoped>` blocks or in `src/styles/` for global. Design tokens go in `src/styles/tokens.css` as CSS variables.
- **Accessibility is a feature, not a polish step.** Every interactive element has a label or aria-label. Modal focus traps. Keyboard navigation in the SHACL editor canvas. Color is never the sole signal.

## Repository layout

```
src/
├── views/                  Page-level components (route targets)
├── components/
│   ├── shacl-editor/       Visual SHACL schema editor (Vue Flow)
│   ├── odrl-editor/        Visual ODRL policy editor (guided forms)
│   ├── metadata/           Record browsing, detail views, search
│   ├── metrics/            Dashboard widgets and charts
│   └── shared/             Cross-feature UI primitives
├── stores/                 Pinia stores
├── composables/            Shared composition functions
├── api/                    Axios clients + OpenAPI-generated types
│   ├── schema.ts           ← DO NOT EDIT, regenerated from server (npm run generate-api)
│   └── queries.ts          TanStack Query keys
├── router/                 Vue Router config
├── styles/                 Global styles, design tokens
└── main.ts                 App entry point
tests/
└── e2e/                    Playwright (smoke)
# Vitest specs are colocated as *.spec.ts beside the source they test (e.g. src/api/rdf.spec.ts)
```

## Visual editor specifics

The SHACL editor is the most complex part of the client. Functional reference: [ProjectOak](https://github.com/luizbonino/ProjectOak). UX is designed for this app, not copied.

Required functionality:
- Node-based canvas where SHACL shapes are nodes and inter-shape relationships (`sh:node`, `sh:class`) are edges
- Per-node property editor (constraints, datatypes, cardinality)
- Live preview of serialized SHACL (`.ttl`)
- Import existing `.ttl` to populate the canvas
- Validation against sample RDF, with violations annotated on the relevant nodes
- Undo/redo

The ODRL editor is guided rather than canvas-based:
- Step-through wizard: pick action(s), add constraints from the supported vocabulary, set conflict strategy
- The editor must refuse to construct policies outside the FDP profile (Permissions and Prohibitions only; supported actions only; supported constraint operands only). The server will reject them anyway; the editor should not let the user get that far.
- Live preview of the resulting RDF

## What not to do

- **Don't use `localStorage` or `sessionStorage` for user data.** It breaks in private browsing modes and isn't shared across devices. Server is the source of truth.
- **Don't bypass the auth interceptor.** Every API call goes through the Axios instance that adds the bearer and handles 401 renewals.
- **Don't hand-modify `src/api/schema.ts`.** It is regenerated from the server OpenAPI (`npm run generate-api`); edits will be lost.
- **Don't introduce a CSS framework casually.** The design tokens approach is intentional. If you think we need Tailwind or similar, raise it as a discussion first.
- **Don't optimize prematurely.** TanStack Query handles most caching needs. Reach for memoization only when there's a measured problem.
- **Don't add a new top-level dependency without checking.** The stack is intentionally focused. The bar for adding a new dep is "we cannot solve this reasonably with what we have".

## When working on a task

1. If the change affects the API contract, the server repo needs a coordinated change. Don't edit the generated types directly — update the server's OpenAPI and regenerate.
2. Component changes: write the component, then a Vitest unit test. Visual changes that span pages may need a Playwright check too.
3. Run the gate before declaring done: `npm run lint && npm run typecheck && npm run test:unit`.
4. The SHACL and ODRL editors are the parts most likely to be wrong in subtle ways. When changing them, test the round-trip: import known-good `.ttl`, modify, export, and diff against the expected output.

## Open questions

- Which exact SHACL features the visual editor supports out of the gate (all of `sh:`, or a curated subset matching the FDP profile)
- Whether to ship a "raw RDF mode" alongside the visual editors for power users
- Whether the metrics dashboard exposes anything beyond what the server's anonymous API returns (currently no, but stewards have asked)
- Internationalization scope for v1

Document choices in PRs when the docs don't yet have an answer.
