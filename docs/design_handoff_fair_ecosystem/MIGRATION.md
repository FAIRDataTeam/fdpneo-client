# FDPneo Client → FAIR Ecosystem — migration spec

Developer handoff for the `fdpneo-client` (Claude Code). This is a **re-skin**, not a
rebuild: the v2 information architecture, screens, and stack stay; only the visual language
changes — from the "Specimen Archive" theme to the shared FAIR Ecosystem design system.

Visual references (in `reference/`):
- `FDP Metadata Browse.html` — locked browse direction **2a** (three-pane + working sidecar) + explorations 1a/1b/1c. Light & dark.
- `FDP Surfaces.html` — 2a across every surface: record detail, unified Search + SPARQL, SHACL editor, ODRL composer, metrics, admin. Light & dark.
- `FDP Redesign — Migration Guide.html` — the same spec, formatted for human review.

Token values are authoritative in `fair-tokens/` (copied from the design system). Author new
code against the `--fair-*` / `--tool-*` names.

---

## 1 · Scope — what changes, what stays

**Changes (visual only):** design tokens (color, type, spacing, radii, shadows); fonts
(Fraunces / Hanken Grotesk / Spline Sans → IBM Plex Sans + Mono); remove the paper grain +
accent vignette; component skins (PrimeVue preset + custom components); a few UX affordances (§7).

**Stays (do not touch):** Vue 3 + TS, PrimeVue, Vue Flow, Pinia, TanStack Query; OIDC auth
(no username/password screens); routes, IA, the four surfaces + admin; no
`localStorage`/`sessionStorage` for user data; WCAG 2.2 AA + keyboard-first SHACL editor.

---

## 2 · The visual shift in one line

From a **warm editorial archive** (cream paper, serif display, film grain, slate-blue) to a
**flat cool-slate instrument** for linked data: crisp grey surfaces, IBM Plex throughout, a
teal "node" accent, and the **node-and-edge** graph motif as the recurring figure. Borders do
the separating; shadows are reserved for lifted/floating surfaces only. No gradients, no
textures, no photographic washes.

---

## 3 · Foundations to install first

Land these before anything else — every surface consumes them.

1. **Adopt the FAIR tokens.** The style entry chain is `src/main.ts` → `import "./styles/main.css"`
   → `@import "./tokens.css"`. Copy this package's `fair-tokens/` into `src/styles/fair-tokens/`
   and `theme-and-bridge.css` into `src/styles/`, then replace the body of
   `src/styles/tokens.css` with imports of the FAIR layers:
   ```css
   @import "./fair-tokens/fonts.css";
   @import "./fair-tokens/colors.css";
   @import "./fair-tokens/typography.css";
   @import "./fair-tokens/spacing.css";
   @import "./fair-tokens/effects.css";
   @import "./theme-and-bridge.css";   /* dark palette + v2→FAIR alias bridge */
   ```
   The alias bridge keeps existing component CSS (which references `--paper`, `--ink`, `--accent`,
   …) compiling against FAIR values, so the whole app reskins in P1 without edits; retire the
   bridge per surface as you migrate component CSS to the `--fair-*` / `--tool-*` names.
   > Heads-up: `tokens.css` is also consumed by `useBranding` (runtime deployer re-skin, Phase
   > 13.6) — keep the same custom-property *names* it overrides so branding still works.
2. **Swap fonts.** Load IBM Plex Sans (400/500/600/700) + IBM Plex Mono; remove the Fraunces /
   Hanken Grotesk / Spline Sans faces. **There is no serif display tier** — headings are IBM
   Plex Sans bold with `letter-spacing:-0.02em`.
3. **Delete the atmosphere.** Remove `body::before` (grain) and `body::after` (accent vignette)
   from `main.css`. Backgrounds are solid cool slate. The only permitted motif is the
   graph-paper dot grid, reserved for canvas/graph surfaces (SHACL editor, sidecar graph).
4. **Set the tool accent.** Put `data-tool="fdp"` on the app root (`App.vue` shell) so
   `--tool-accent` resolves to FDP teal everywhere.
5. **Dark mode.** Keep the existing `.theme-dark` toggle; replace its palette with the
   cool-slate set in `theme-and-bridge.css`. **Watch the ink-conflation trap:** `--fair-ink` is
   dark in light mode but reads *light* in dark mode (so it can serve as text/structure on dark
   surfaces). Primary buttons that use it as a *fill* (`background: var(--fair-ink); color:#fff`)
   would then be white-on-near-white — give those an explicit dark-slate fill + light text in
   dark mode (the `.pbtn` rule in `theme-and-bridge.css`).

---

## 4 · Token crosswalk (v2 → FAIR)

Left: the current FDPneo token + value. Right: the FAIR token to point it at.

| FDPneo token | v2 value | → FAIR token | value |
|---|---|---|---|
| `--paper` | `#f5f1e8` | `--fair-bg` | `#eef1f5` |
| `--surface` | `#fffdf7` | `--fair-surface` | `#ffffff` |
| `--surface-2` | `#f1ece0` | `--fair-canvas` / `--fair-highlight` | `#e7ecf2` / `#e3e8ef` |
| `--line` | `#e2dccc` | `--fair-separator` | `#e8ecf1` |
| `--line-strong` | `#d0c7b3` | `--fair-border` | `#dde3ea` |
| `--ink` | `#14181f` | `--fair-text-strong` / `--fair-ink` | `#1f2733` |
| `--ink-2` | `#2a2f38` | `--fair-text` | `#384049` |
| `--muted` | `#6b7280` | `--fair-text-muted` | `#6b7480` |
| `--muted-2` | `#8a8f99` | `--fair-text-light` | `#9aa4b2` |
| `--accent` | `#2d5b89` | `--tool-accent` (= node) | `#0e857f` |
| `--accent-deep` | `#1f4567` | `--fair-node-darker` | `#0a5f5b` |
| `--accent-soft` | `#e8eef5` | `--fair-node-tint` / `--tool-accent-tint` | `#e2f2f0` |
| `--accent-line` | `#c1d0e0` | `--fair-node-soft` | `#b6ddd9` |
| `--signal` | `#b5532a` | `--fair-warning` (or `--tool-train` `#c8622a`) | `#8a6d00` |
| `--signal-soft` | `#f6e8dd` | `--fair-warning-tint` | `#f7f0d9` |
| `--ok` | `#2f7a4a` | `--fair-success` | `#2e7d32` |
| `--warn` | `#8a6b0a` | `--fair-warning` | `#8a6d00` |
| `--font-sans` | Hanken Grotesk | `--fair-font-sans` | IBM Plex Sans |
| `--font-serif` | Fraunces | *(removed)* | use `--fair-font-sans` bold |
| `--font-mono` | Spline Sans Mono | `--fair-font-mono` | IBM Plex Mono |
| `--r-1 … --r-4` | 4 / 8 / 12 / 18 | `--fair-radius-sm…xl` | 4 / 6 / 10 / 14 |
| `--shadow-1 / -2` | warm slate | `--fair-shadow-1…4` | cool slate |

### Record-kind color system (`--t-*`)
Keep this system — it drives type tags, card spines, and lineage-rail nodes, and users value
it. Remap it onto the ecosystem's per-tool accent family (mid-chroma siblings) so kinds stay
distinct without leaving the palette:

| Kind | FAIR token | hue |
|---|---|---|
| `--t-fdp` | `--fair-ink` | slate |
| `--t-catalog` | `--tool-fdp` | teal `#0e857f` |
| `--t-dataset` | `--tool-directory` | blue `#2a6fdb` |
| `--t-distribution` | `--tool-station` | green `#2f8f5b` |
| `--t-biobank` | `--tool-framework` | indigo `#5a4bc4` |
| `--t-publication` | `--tool-identifier` | gold `#b07a1e` |

> Note: the linked-data *accent* stays teal (`--tool-accent`) ecosystem-wide; the `--t-*`
> hues are for **record-kind differentiation** only (tags, spines, graph nodes).

---

## 5 · PrimeVue theming

**Current setup (confirmed):** PrimeVue **4.1** is registered minimally in `src/main.ts` —
`app.use(PrimeVue, { ripple: false })` — with **no `theme` preset** and **no `@primevue/themes`**
dependency. Components are therefore dressed by the app's own token CSS, not an Aura preset.
Keep this lightweight approach; two options, in order of preference:

- **Preferred — theme via tokens + passthrough (no new dependency).** Continue styling PrimeVue
  through the CSS custom properties the app already controls, now pointing at FAIR values (the
  token swap in §3 does most of this for free). For component internals that need it, use
  PrimeVue's `pt` / global `ptOptions` passthrough to attach FAIR tokens: focus rings →
  `--fair-focus-ring-accent`; primary/checkbox/active → `--tool-accent`; borders →
  `--fair-border`; inputs → `--fair-surface-input`; radii → `--fair-radius-md`.
- **Alternative — adopt PrimeVue styled mode.** Only if you want PrimeVue to own its theming:
  add `@primevue/themes`, `definePreset` on Aura, map `primary` → teal node scale and `surface`
  → cool-slate greys, wire `colorScheme.light`/`.dark` to the FAIR values, and pass
  `theme: { preset, options: { darkModeSelector: '.theme-dark' } }`. Heavier; adds a dependency
  and a second source of truth alongside the token CSS.
- Keep `ripple:false`; transitions 100–120ms; no bounce, no long fades.
- For components the design system ships (Button, Badge, Input, Tabs, Breadcrumbs, DataTable,
  StatusDot), match their look 1:1. Custom pieces (SHACL canvas node, ODRL constraint chip,
  sidecar graph) are built to the same tokens.

**Library-specific theming (confirmed deps):**
- **Chart.js** (`chart.js` + `vue-chartjs`) drives the metrics charts — set dataset/grid/tick
  colors from the FAIR tokens (bars/lines → `--tool-accent`, grid → `--fair-separator`, ticks →
  `--fair-text-light`); read them via `getComputedStyle` so charts re-color on the dark toggle.
- **Monaco** (`monaco-editor`) is the SPARQL editor — register a light and a dark Monaco theme
  keyed to the FAIR code-surface tokens (`--fair-code-bg`, `--fair-text`, node/warning for
  keywords/strings) and switch it with `.theme-dark`.
- **Vue Flow** is the SHACL canvas — style nodes/edges/handles/background with the FAIR tokens
  (see §6, SHACL row).

---

## 6 · Per-surface mapping

| Surface | Files | Treatment |
|---|---|---|
| **App shell** | `App.vue`, `components/shared/AppHeader.vue`, `AppFooter.vue` | 56px sticky header: FDP glyph + wordmark, tab nav (Browse · Search · Schemas · Policies · Metrics), search pill (`/` shortcut), `+ New`, avatar. Remove serif hero treatment. Set `data-tool="fdp"`. |
| **Metadata browse** | `MetadataBrowseView.vue`, `components/metadata/*` | Direction **2a**: persistent container tree (left) · dataset list w/ type-color spines (center) · **working sidecar** (right). Retire the serif hero + catalog-grid-only layout. |
| **Record detail** | `RecordDetailView.vue`, `RecordHero`/`StatStrip`/`PropList`/`DistributionList`/`AboutSidecar` | Hero (type eyebrow + title + lede + actions) → stat strip → distributions → working sidecar incl. an **"Access — in effect"** card (plain-language ODRL summary + inheritance note). Keep state badge + steward transitions. |
| **Search + SPARQL** | `SearchView.vue` + `SparqlPlaygroundView.vue` (**unify**) | One surface, two modes via a **Text search / SPARQL** toggle. Text = query bar + schema-driven facet rail + result rows w/ match highlight. SPARQL = editor + results (table/boolean/Turtle) + in-memory history. Fold the standalone playground route into Search; keep `/sparql` as a deep-link that opens SPARQL mode. |
| **SHACL editor** | `SchemaEditorView.vue`, `components/shacl-editor/contour/*` (Vue Flow) | Skin the canvas as the node-and-edge language: shape = node (accent header + property rows w/ datatype/cardinality chips), `sh:node` = arrowed edge, dot-grid canvas, dashed **ghost nodes** for registered-but-unshaped types. Keep schema list + serialized-TTL preview + sample testbed. Preserve keyboard-first interaction. |
| **ODRL editor** | `PolicyEditorView.vue`, `components/odrl-editor/*` | Plain-language composer: "Allow *read* for role X" / "Forbid *modify* unless…", constraint chips, template gallery, version list, live RDF preview. Surface **"deny wins"** inline. Never expose ODRL vocabulary outside the preview. |
| **Metrics** | `MetricsDashboardView.vue`, `components/metrics/*` | KPI row · activity time-series · country bars · top-resources (IRI). Flat & restrained (no analytics-tool gloss). Keep privacy hints ("daily-rotated", no query text/identity) + sign-in gate. Charts use `--tool-accent`. |
| **Admin** | `UsersAdminView`, `ApiKeysView`, `ResourceDefinitionAdminView`, `SettingsView`, `AppearanceView` | Left admin sub-nav + DataTable: role badges, status dots, right-aligned row actions. Identity is OIDC-sourced (no profile-edit forms). |

---

## 7 · UX improvements to fold in

- **Reinstate a persistent container tree** in browse (v2 dropped it). Schema-driven, not
  hard-coded — render whatever container types the deployment profile declares (e.g.
  `BiobankCollection → Biobank → Sample`).
- **Working sidecar** as a reusable component: metadata property list → mini graph visualizer
  (record + neighbors) → RDF-syntax tabs (Turtle/JSON-LD/RDF-XML) → access-in-effect →
  validation + PID resolve. Used on both browse and record detail.
- **Facets adapt to unknown schemas** — generated from the server's declared facetable fields;
  handle 3 or 14 facets gracefully.
- **Consumer vs steward** — same route, conditional sections (steward: state transitions,
  access, provenance; consumer: content + clear path to the data).
- **Hidden ≠ locked** — access-filtered records are simply absent; never render a locked/teaser
  row. Show a sign-in nudge to widen results.
- **Accessibility** — WCAG 2.2 AA minimum; visible 3px focus ring (`--fair-focus-ring-accent`),
  never removed; color never the sole signal (pair status dots with text); design the keyboard
  model into the SHACL canvas from the start.

---

## 8 · Phased plan & definition of done

| Phase | Work |
|---|---|
| **P1** | **Foundations.** Tokens, fonts, remove atmosphere, `data-tool`, dark palette, PrimeVue token/passthrough wiring (§5). Whole app reskins via the alias bridge; nothing visually broken. |
| **P2** | **Shell + browse + record detail.** The everyday consumer/steward path; ship the working-sidecar component here. |
| **P3** | **Search + SPARQL unify.** Toggle, facet rail, results, history. |
| **P4** | **SHACL + ODRL editors.** Canvas skin + composer; the most custom work. |
| **P5** | **Metrics + admin**, then retire the alias bridge and delete dead Specimen-Archive CSS. |

**Definition of done (per surface):**
- No Fraunces/Hanken/Spline references; no grain/vignette; no hard-coded hexes — only
  `--fair-*` / `--tool-*`.
- Light & dark both pass AA contrast (mind the ink-fill trap on primary buttons).
- Matches the mockup for that surface; keyboard + focus verified.

**Common pitfalls:** (1) overloading `--fair-ink` for both text and button fills in dark mode;
(2) hard-coding the container tree instead of reading the profile; (3) Chart.js / Monaco / Vue
Flow reading stale colors on the dark toggle — resolve them from CSS vars at render, not once at
boot; (4) reintroducing shadows on flat page content.

---

## 9 · Placing this package in the repo

This folder is written to sit at **`docs/design_handoff_fair_ecosystem/`** (matching the
existing `docs/design_handoff_visual_schema_editor/` convention).

- `docs/design_handoff_fair_ecosystem/` — `README.md`, `MIGRATION.md`, `reference/`, and the
  source `fair-tokens/` + `theme-and-bridge.css` (reference copies).
- When executing P1, copy `fair-tokens/` → `src/styles/fair-tokens/` and `theme-and-bridge.css`
  → `src/styles/`, then wire the imports as in §3.
- The current-state screenshots already in `docs/manual-assets/` (`01-browse.png`,
  `03-record-detail.png`, `04-search.png`, `05-sparql.png`, `08-schemas.png`, `09-policies.png`,
  `14-metrics.png`, `12-users.png`, …) are the **before**; `reference/` here is the **after**.

**Point Claude Code at it.** Add to `CLAUDE.md` so every session discovers the spec (exact
text in `CLAUDE-md-snippet.md` in this folder):

```markdown
## Design: FAIR Ecosystem re-skin
The client is being restyled from the "Specimen Archive" theme onto the shared FAIR Ecosystem
design system. The authoritative spec is `docs/design_handoff_fair_ecosystem/MIGRATION.md`
(token crosswalk, per-surface→file mapping, phased plan P1–P5). Visual references (light/dark)
are in that folder's `reference/`. This is a re-skin, not a rebuild — IA, routes, and stack stay.
```
