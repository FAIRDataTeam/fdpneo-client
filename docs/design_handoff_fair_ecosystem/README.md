# Handoff: FDPneo Client → FAIR Ecosystem redesign

## Overview
This package restyles the **FAIR Data Point v2 web client** (`fdpneo-client`) from its
current "Specimen Archive" theme onto the shared **FAIR Ecosystem design system**. It is a
**re-skin, not a rebuild**: the Vue 3 information architecture, routes, screens, and stack
stay; the visual language changes.

The primary spec is **`MIGRATION.md`** — read it first and work from it. This README just
orients you.

## About the design files
The `reference/` HTML files are **design references** — prototypes built in HTML to show the
intended look, layout, and behavior. **Do not copy them into the app.** Recreate their look
in the existing `fdpneo-client` environment (Vue 3 + TypeScript + PrimeVue + Vue Flow),
using its established components and patterns. The HTML uses inline styles and a small
web-component shell purely so the prototype runs standalone; production code stays Vue/SFC.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and component treatments are final and
specified as exact tokens in `MIGRATION.md` §4. Recreate pixel-faithfully using PrimeVue +
custom components, driven by the design tokens — not hard-coded hexes.

## What's in this package
| File | What it is | How to use |
|---|---|---|
| `MIGRATION.md` | The full spec: scope, foundations, token crosswalk, PrimeVue theming, per-surface mapping, UX changes, phased plan. | **Execute from this.** |
| `fair-tokens/` | The FAIR Ecosystem token CSS (colors, typography, spacing, effects, fonts) — the source of truth for values. | Drop into `src/styles/` (see §3). |
| `theme-and-bridge.css` | The `.theme-dark` cool-slate palette + a v2→FAIR alias bridge so existing component CSS keeps compiling during migration. | Import after the tokens; retire the bridge per §8. |
| `reference/*.html` | The visual mockups (browse direction 2a + explorations, all surfaces, and the migration guide). | Open in a browser to check intended look/behavior. |
| `reference/fdp.svg` | The FDP tool glyph (node-and-edge mark). | Use for the header/logo. |

## Target codebase (for context)
- Vue 3 (Composition API) + TypeScript, Vite, Pinia, TanStack Query
- **PrimeVue** components; **Vue Flow** for the SHACL canvas
- OIDC auth (no username/password screens); no `localStorage`/`sessionStorage` for user data
- WCAG 2.2 AA floor; keyboard-first SHACL editor
- Current styles live in `src/styles/tokens.css` + `src/styles/main.css`

## Start here
1. `MIGRATION.md` §1–3 — scope + foundations (tokens, fonts, remove atmosphere, dark mode). Land these first.
2. §4 — token crosswalk (every current token → its FAIR target).
3. §6 — per-surface mapping to the actual `.vue` files.
4. §8 — phased plan (P1–P5) + definition of done.
