# Claude Code handoff — fdp-client

This file is the operator's note. It tells Claude Code (and any human picking
this up) what's already in place and what to do first.

## What's already here

- **`CLAUDE.md`** at the repo root with conventions, the four user-facing
  surfaces, and the architectural rules (no browser storage for app state,
  OIDC directly between client and IdP, OpenAPI types are the contract).
- **`UX-DESIGN-BRIEF.md`** — the brief for the four UI surfaces, intended
  as input to Claude Design or as a reference for the implementation.
- **`package.json`** with the agreed dependency stack: Vue 3, TypeScript,
  Vite, Pinia, TanStack Query, oidc-client-ts, PrimeVue, Vue Flow,
  Chart.js, plus dev tooling (ESLint, Prettier, Vitest, Playwright,
  openapi-typescript, vue-tsc).
- **TypeScript configs** (`tsconfig.json` references three project tsconfigs
  — `app`, `node`, `vitest`) in strict mode.
- **Vite config** with the dev-server proxy to the FDP API on :8000.
- **Vitest config** with jsdom for unit tests.
- **ESLint flat config** with Vue + TypeScript + Prettier integration.
- **Application skeleton** under `src/`:
  - `main.ts` — bootstrap.
  - `App.vue` — shell with navigation.
  - `router/index.ts` — seven routes, four real surfaces + auth callback.
  - Seven view stubs in `views/`.
  - `api/http.ts` — Axios instance with interceptor scaffolding.
  - `stores/auth.ts` — OIDC store scaffolding.
- **First smoke test** in `src/App.spec.ts`.
- **Playwright e2e config** and a smoke test in `tests/e2e/smoke.spec.ts`.
- **`TASKS.md`** — prioritized implementation backlog.

## First-session checklist

In order:

1. **Ensure Node 22+** is installed (`node --version`).
2. **Install dependencies:** `npm install`.
3. **Configure environment:** `cp .env.example .env` (defaults match the FDP
   server's dev compose stack).
4. **Confirm the baseline works:**
   - `npm run typecheck` — clean.
   - `npm run lint` — clean.
   - `npm run test:unit` — smoke test passes.
   - `npm run dev` — dev server starts on :5173; the page loads.
5. **Read** `CLAUDE.md`, then `UX-DESIGN-BRIEF.md`, then skim Section 13 of
   the server's architecture doc (in the `fdp-server` repository under
   `docs/architecture/README.md`).
6. **Pick up Phase 0.2 from `TASKS.md`** — generate OpenAPI types. This
   requires the FDP server to be running (see fdp-server's HANDOFF.md
   for setup).

## What is deliberately not here

- **No `src/api/schema.ts`** yet. It's generated from the server's OpenAPI
  spec via `npm run generate-api`. Task 0.2 produces it.
- **No theme tokens / design system.** `src/styles/main.css` has placeholder
  values. The agreed design system will replace them — likely arriving via
  Claude Design handoff. The components use semantic CSS variables so
  swapping them is mechanical.
- **No actual view implementations.** The seven views in `src/views/` are
  scaffolds. Phases 1–6 in `TASKS.md` build them out.
- **No auth flow yet.** `stores/auth.ts` is scaffolded; Phase 1.1 wires it.

## Coordination with the server repo

API contract changes happen on the server side. When the server's OpenAPI
spec changes, regenerate types here:

```bash
npm run generate-api
```

If you find a gap between what the server provides and what a view needs,
flag it — the answer is usually to extend the server, not to work around it
in the client.

## When stuck

The architecture document in `fdp-server/docs/architecture/` and the ADRs in
`fdp-server/docs/adr/` cover the controversial decisions for both server and
client. Section 13 specifically addresses the client. If a question is not
answered there, prefer surfacing the ambiguity over guessing.
