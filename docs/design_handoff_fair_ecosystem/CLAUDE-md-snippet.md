# Paste into the repo's `CLAUDE.md`

Add this section to `CLAUDE.md` (repo root) so every Claude Code session discovers the redesign spec:

```markdown
## Design: FAIR Ecosystem re-skin

The client is being restyled from the "Specimen Archive" theme onto the shared **FAIR
Ecosystem** design system. The authoritative spec is
`docs/design_handoff_fair_ecosystem/MIGRATION.md` — token crosswalk, per-surface→file mapping,
and phased plan (P1–P5). Visual references (light & dark) live in that folder's `reference/`.

This is a **re-skin, not a rebuild**: information architecture, routes, and the stack (Vue 3 +
PrimeVue + Vue Flow) stay; only the visual language changes. Foundations first (tokens, fonts,
remove the paper grain/vignette, `data-tool="fdp"`, dark palette), then per-surface.
```
