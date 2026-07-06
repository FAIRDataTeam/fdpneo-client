# Changelog

All notable changes to the FAIR Data Point v2 web client (`fdp-client`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries prior to 0.5.0 were reconstructed retroactively from the release tags,
their annotations, and the release commit messages; the matching GitHub release
pages carry the fuller notes.

## [0.5.0] — 2026-07-06

Restyle onto the shared **FAIR Ecosystem** design system, a WCAG 2.2 AA
accessibility pass, and an admin **Backup & Restore** guidance surface.

### Added

- **FAIR Ecosystem redesign (P1–P5)** — a re-skin, not a rebuild: FAIR token
  layers (colour/type/spacing/effects), IBM Plex Sans + Mono, a cool-slate dark
  palette, and the FDP teal `data-tool` accent. New shell (node-and-edge glyph +
  wordmark, sticky tab bar, search pill); browse **direction 2a** (persistent
  container tree that lazy-nests over SPARQL, type-spined cards, reusable working
  sidecar); record detail with an **"Access — in effect"** plain-language ODRL
  summary; unified **Search + SPARQL** surface; reskinned SHACL/ODRL editors,
  Metrics, and Admin (Chart.js + Monaco follow the palette and the dark toggle).
- **Backup & Restore** — a new admin-only, informational page at `/admin/backup`
  mirroring the server operator runbook (ADR-0016). Backup/restore/import are
  CLI-only, so the page calls no API — it renders copy-to-clipboard snippets for
  `fdp backup dump` / `restore` / `import --rebase` / `import --from <url>` /
  `fdp search reindex` plus the two caveats (reindex after a bare `fdp pid
  rebase`; `record_audit` keeps historical IRIs).

### Changed

- **Deployer white-labeling now targets FAIR token names** — `branding.theme` /
  `themeDark` overrides must use `--tool-accent`, `--fair-bg`, `--fair-surface`,
  `--fair-text-strong`, … The old `--accent` / `--paper` / `--ink` keys are
  ignored (see `public/config.js`).
- **Navigation** — the top bar carries the public surfaces (Browse, Search) for
  everyone and the authenticated tools (Schemas, Policies, Metrics) for the roles
  that can use them; those are no longer duplicated in the user menu.
- Standalone SPARQL playground and Advanced Search views folded into the unified
  Search surface; `/advanced-search` redirects to `/search`.
- The transitional v2→FAIR alias bridge and dead "Specimen Archive" CSS removed —
  every surface now uses `--fair-*` / `--tool-*` tokens directly.

### Accessibility

- WCAG 2.2 AA audit (axe-core across browse, record, search, metrics, schemas,
  policies — light + dark, anonymous + admin) plus keyboard/focus checks.
  Contrast of the neutral text greys nudged to clear 4.5:1 on the cool-slate
  grounds; a contrast-aware on-accent text token; ARIA fixes (facet checkboxes,
  the metrics chart canvas, empty links, the RDF-panel toggle group, list
  markup); verified focus rings and Escape-to-close on overlays. Violations down
  ~67%.

## [0.4.0] — 2026-07-01

Multilingual UI + the Contour visual SHACL editor.

### Added

- **Internationalization (Phase 18)** — full vue-i18n rollout: English plus
  Brazilian Portuguese, Dutch, Spanish, German, and French, with a header
  language switcher (in-memory, defaulted from the browser, overridable via
  `/config.js`).
- **Contour visual SHACL editor (Phase 19)** — the Contour-based workbench
  (palette · form canvas · inspector, plus a node-link graph view) replacing the
  earlier visual editor.

## [0.3.0] — 2026-06-15

Persistent identifiers (ADR-0014).

### Added

- Consume the server's dual `/config` bases: record IRIs root at the
  persistent-identifier base (`fdp_url`) while API calls target the serving
  origin (`serving_url`); `iriToId` maps a displayed IRI to a fetchable path so
  the two bases can differ in production.
- Surface the dual-identifier properties — optional `dct:identifier`,
  `owl:sameAs`, and `skos:exactMatch` in resource forms, plus an "Identifiers"
  block in the record sidecar listing equivalent foreign identifiers.

## [0.2.0] — 2026-06-15

Phase 12 interface refinements (interface notes 1–28).

### Added

- Schema management UI, structured settings editors, a consistent per-record RDF
  box with an inline RDF + graph view in the resource sidecar, real
  breadcrumbs/containers, advanced search, metrics dashboard fixes, SHACL editor
  `sh:or` + broader DASH widget coverage, DASH widget rendering in record forms,
  and an ISO language dropdown.

## [0.1.0] — 2026-06-10

First tagged release of the FAIR Data Point v2 web client (Vue 3 / TypeScript).

### Added

- Metadata browsing and editing, SHACL/ODRL editors, a metrics dashboard, OIDC
  auth (Authorization Code + PKCE), and the 2026-06 security hardening.

[0.5.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.5.0
[0.4.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.4.0
[0.3.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.3.0
[0.2.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.2.0
[0.1.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.1.0
