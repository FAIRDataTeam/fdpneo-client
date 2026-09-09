# Changelog

All notable changes to the FAIR Data Point v2 web client (`fdp-client`).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries prior to 0.5.0 were reconstructed retroactively from the release tags,
their annotations, and the release commit messages; the matching GitHub release
pages carry the fuller notes.

## [Unreleased]

## [0.6.6] — 2026-09-09

### Fixed

- **An expired session now ends instead of looping.** When silent token renewal
  failed (IdP SSO session gone), the stale user stayed in the store: `isAdmin`
  kept the footer readiness probe polling every minute with a dead token
  (thousands of 401s on a live deployment) and public pages errored instead of
  rendering anonymously. A failed renew now clears the session (store + OIDC
  storage), idempotent reads are replayed once **without** the token so public
  content still loads, writes are never re-sent, and the header shows a
  "Session expired — sign in again" prompt.
- **Metrics dashboard: 4xx and 5xx are separate KPIs**, with hints — a single
  "error responses" number mixed scanner 404s and auth 401s with real server
  errors.

## [0.6.5] — 2026-09-02

### Changed

- **FDP-O namespace dual-accept** (server 0.16 / ADR-0026). The server moved
  its vocabulary from the unregistered `https://w3id.org/fdp/o#` to the
  published FDP Ontology namespace `https://w3id.org/fdp/fdp-o#`. The client
  now matches both: the root type map (`FAIRDataPoint`/`MetadataService` new,
  `FAIRDataPoint`/`Repository` legacy) and the `metadataState` read from
  `/meta` (new predicate first, legacy fallback), so this client works against
  pre- and post-0.16 servers alike. The display `fdp:` prefix compacts the new
  namespace.

## [0.6.4] — 2026-09-02

### Added

- **FDP Indexes panel in Settings** (admins). Manage the indexes this FDP
  announces itself to (server 0.15 / ADR-0025): list environment + runtime
  targets with their last ping outcome, add/remove runtime targets, and
  "Ping now" with per-target results. API types regenerated against 0.15.

## [0.6.3] — 2026-09-02

### Added

- **"Publish immediately" on create.** The create form gains an opt-in checkbox
  that sends `Prefer: publication-state=PUBLISHED` (server 0.15, ADR-0010 §4
  amendment) so a record can be born visible instead of requiring a second
  publish step. Default unchanged (DRAFT).

### Fixed

- **Descriptions keep their line breaks.** Multi-paragraph descriptions (the
  repository hero and record detail) rendered as one mashed-together block —
  HTML whitespace collapsing; now rendered with `white-space: pre-line`.
- **Language-relaxed shapes keep their form fields.** Server 0.15 relaxes
  title/description/keyword to `sh:or (xsd:string | rdf:langString)`; the shape
  parser did not descend into `sh:or`, which would have silently dropped those
  fields from create/edit forms. It now flattens datatype-only unions and
  activates the language-aware editor for `rdf:langString` alternatives.
- **Publisher/creator names** (with server 0.15): the `/labels` service now
  resolves `foaf:name`/`vcard:fn`, so agent IRIs render as names instead of
  raw URLs. (Client already routed them through `/labels`.)

## [0.6.2] — 2026-09-01

### Fixed

- **No more "Erasmus MC" sample branding in a live deployment.** The browse
  view's title fell back to the hardcoded sample deployment name whenever the
  repository root record hadn't loaded (or couldn't load — e.g. a CORS
  misconfiguration), and the default repository description shown when the root
  record has no `dct:description` mentioned "Erasmus MC researchers" in all six
  languages. The title now falls back to the deployment host (never sample
  text, completing interface note 12.1), and the default description is
  deployment-neutral.

### Added

- **Record detail surfaces Creator, Language, and Spatial coverage**, alongside
  the existing Publisher/License/Themes. Each IRI-valued property is resolved to
  a human label via the server's `/labels` service and rendered as a clickable
  link (falling back to a terse label when the service can't resolve it); plain
  literal values render as text. Edit forms are unaffected — they still bind the
  raw IRI so the actual value stays visible while editing. (Fuller resolution of
  ROR / ORCID / DOI / EU-vocabulary / GeoNames IRIs is a server `/labels` change.)

## [0.6.1] — 2026-07-06

### Fixed

- **Record "Contents" now lists a container's children by actual containment**
  (`dct:isPartOf`) instead of the parent type's *declared* child-type links. A
  deployment profile can leave those links off (e.g. a `catalog`
  resource-definition with `children: []`) while the records are correctly
  parented; the old gating then hid every child, so clicking a catalog reached a
  dead end with no datasets. Contents matches the browse tree again, and
  distributions are excluded (the dataset page shows them in their own section).

## [0.6.0] — 2026-07-06

Interactive admin Backup & Restore against the server's new v0.9.0 admin API.

### Added

- **Interactive Backup & Restore** (`/admin/backup`, admin only) driving the
  server's job-based admin API (ADR-0016 §5 amendment): start → poll → download.
  - Backup: create a dump (optionally excluding the audit log), watch it run,
    see a result summary (graphs, quads, audit rows, data model), and download
    the archive as `fdp-backup-<id>.zip`.
  - Restore: upload a `.zip`, choose Merge / Overwrite (mutually exclusive),
    exclude-audit, or Dry run; a destructive-action confirmation guards a
    non-dry-run restore, and a dry run reports what *would* change.
  - New `api/backup.ts` client and a `useBackupJob` polling composable (polls
    every 1.5s only while QUEUED/RUNNING; stops on completion).

### Changed

- The Backup & Restore page (informational in 0.5.0) is now interactive when the
  server exposes the admin backup API. Errors are surfaced specifically: 403
  (needs the admin role), 409 (archive not ready), and 413 — an upload over the
  server's 10 MiB limit points you to the `fdp backup restore` CLI.

### Not changed

- **Import** (rebase / reference-FDP crawl) stays **CLI-only** — it's shown as a
  reference note, with no HTTP UI (ADR-0016).

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

[0.6.4]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.6.4
[0.6.3]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.6.3
[0.6.2]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.6.2
[0.6.1]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.6.1
[0.6.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.6.0
[0.5.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.5.0
[0.4.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.4.0
[0.3.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.3.0
[0.2.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.2.0
[0.1.0]: https://github.com/FAIRDataTeam/fdpneo-client/releases/tag/v0.1.0
