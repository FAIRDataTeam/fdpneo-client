# FAIR Data Point v2 — Reference Web Client

A Vue 3 single-page application providing the reference web interface for the FAIR Data Point v2 server. Lets data stewards manage metadata, schemas, and access policies; lets data consumers browse and query metadata; provides a dashboard of usage metrics.

This repository contains the **client** implementation. The server lives in the sibling `server/` project (`fdpneo-server`).

> **Status: implemented.** All four surfaces (metadata browsing/search, SHACL editor, ODRL editor, metrics dashboard) are built and covered by unit tests. See the audit notes and `CLAUDE.md` for current conventions.

## What the client does

The client provides four user-facing surfaces:

- **Metadata browsing and search.** Tree navigation through the FDP container hierarchy, faceted and free-text search, record detail views with RDF available in multiple serializations, SPARQL playground for advanced users.
- **Visual SHACL editor.** Node-based canvas for authoring and editing SHACL schemas. Shapes are nodes; properties and constraints sit on nodes; inter-shape relationships are edges. Live preview of the serialized SHACL and validation against test data. Functionally inspired by [ProjectOak](https://github.com/luizbonino/ProjectOak); the UX is designed against the rest of the client rather than copied directly.
- **Visual ODRL editor.** Guided form-based editor for authoring Offers within the FDP ODRL profile. Choose actions, add constraints (party, role, organization, time window), set conflict strategy. Live preview of the resulting RDF.
- **Metrics dashboard.** Charts and time-series rendered from the server's anonymous metrics API. Per-resource drill-down for stewards.

## Technology stack

| Concern | Choice |
|---|---|
| Framework | Vue 3 (Composition API) |
| Language | TypeScript 5 (strict) |
| Build | Vite |
| State | Pinia |
| Server cache | TanStack Query (Vue) |
| OIDC client | `oidc-client-ts` |
| Components | PrimeVue |
| Diagram canvas | Vue Flow |
| Routing | Vue Router |
| HTTP | Axios |
| API types | Generated from server OpenAPI via `openapi-typescript` |
| Testing | Vitest, Playwright |

## Architecture summary

The client is stateless across reloads: all persistent state lives in the FDP server. Authentication is OIDC Authorization Code flow with PKCE, handled directly between the client and the configured identity provider — the FDP server is not in the authentication path beyond validating bearer tokens.

For the full architecture context, see the server architecture document (in the `fdp-server` repository under `docs/architecture/`), especially **Section 13** (Client application). Architectural decisions that affect the client (ODRL profile scope, LDP semantics, authorization model) are documented in the server ADRs (`fdp-server/docs/adr/`).

## Repository layout

```
client/
├── README.md                       ← this file
├── docs/
├── src/
│   ├── views/                      ← page-level components
│   ├── components/
│   │   ├── shacl-editor/           ← visual SHACL schema editor
│   │   ├── odrl-editor/            ← visual ODRL policy editor
│   │   ├── metadata/               ← record views, search, browsing
│   │   └── metrics/                ← dashboard widgets
│   ├── stores/                     ← Pinia stores
│   ├── composables/                ← shared composition functions
│   ├── api/                        ← Axios clients + OpenAPI-generated types (schema.ts)
│   ├── router/
│   ├── styles/
│   └── main.ts                     ← Vitest specs are colocated as *.spec.ts beside their sources
├── tests/
│   └── e2e/                        ← Playwright (smoke)
├── public/
├── package.json
└── vite.config.ts
```

## Getting started

```bash
# clone, then:
npm install
cp .env.example .env       # configure VITE_FDP_API_URL, VITE_OIDC_AUTHORITY, VITE_OIDC_CLIENT_ID
npm run generate-api       # (optional) regenerate src/api/schema.ts from a running server's OpenAPI
npm run dev
```

Point the client at a running FDP server (see the `fdp-server` repository for development setup).

## Why a separate repository

Server and client release independently. Server uses Python tooling; client uses Node tooling. CI configurations differ. Test infrastructure differs. Issue triage differs. The OpenAPI-generated types make the contract between them explicit, and contract breaks show up at compile time on the client side.

## License

To be determined; expected to match the server.

## See also

- Server repository: `fdpneo-server` (sibling `server/` project)
- Server architecture document: in `fdp-server` under `docs/architecture/`
- FDP specifications: [specs.fairdatapoint.org](https://specs.fairdatapoint.org)
- ProjectOak (SHACL editor reference): [github.com/luizbonino/ProjectOak](https://github.com/luizbonino/ProjectOak)
