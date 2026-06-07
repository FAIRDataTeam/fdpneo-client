# FAIR Data Point v2 — Documentation

Documentation for deploying and using the FAIR Data Point v2 reference
implementation (the `fdp-client` SPA + the `fdp-server` API + GraphDB,
PostgreSQL, and Keycloak).

## Guides

- **[Deployment Guide](./deployment.md)** — install the client, server, and
  backing services; configuration reference; production hardening; operations
  cheat-sheet.
- **[User Manual](./user-manual.md)** — install in 5 steps, then browse, search,
  publish records, and administer schemas, ODRL policies, licenses, and users.

## Other docs in this repo

- [server-requests/](./server-requests/) — coordination specs for server-side
  changes the client depends on (e.g. the `/users` admin facade).
- [design_handoff_visual_schema_editor/](./design_handoff_visual_schema_editor/) —
  design reference for the visual SHACL editor.

## External references

- FAIR Data Point specifications — <https://specs.fairdatapoint.org>
- `fdp-server` repository — architecture docs (`docs/architecture/`) and ADRs
  (`docs/adr/`).
