# Secure Development Guidance — fdp-client

Audience: any agent (or human) extending the Vue/TypeScript client. Read this before
touching how server data is rendered, how tokens are handled, or how external links and
embeds are built. Two parts: **(A) fix the 2026-06-10 audit finding**, then **(B) standing
rules**. Reference: `../../SECURITY-AUDIT-2026-06-10.md`.

---

## Part A — Remediation to implement now

### A-1 (Low–Med) — Validate URL schemes before binding user-controlled values into `:href`/`:src`

**Problem.** `components/metadata/PropList.vue` binds metadata-derived IRIs straight into
href: `<a :href="record.publisherUri">` (line 42) and `<a :href="record.licenseUri">`
(line 45). RDF metadata is user-controlled and partly public, so a record carrying
`publisherUri = "javascript:…"` yields a clickable script link (DOM-XSS on click). Vue
does not sanitize `:href`. The production CSP (`script-src 'self'`) mitigates this but is
not the primary defense and is absent in `npm run dev`.

**Fix.**
1. Add a small helper, e.g. `src/composables/useSafeHref.ts`:
   ```ts
   const SAFE = new Set(["http:", "https:", "mailto:"]);
   export function safeHref(raw: string | null | undefined): string | undefined {
     if (!raw) return undefined;
     try {
       const u = new URL(raw, window.location.origin);
       return SAFE.has(u.protocol) ? u.href : undefined;
     } catch {
       return undefined;
     }
   }
   ```
   (Reject `javascript:`, `data:`, `vbscript:`, `file:` etc. by allowlist, not blocklist.)
2. Bind through it everywhere a record/metadata value becomes a link or image source:
   `:href="safeHref(record.publisherUri)"`. When it returns `undefined`, render plain
   text instead of an anchor (don't emit a dead/clickable link).
3. Audit **all** `:href`/`:src`/`window.open`/`location.assign` bindings that carry
   server-derived values (today: `PropList.vue`; check distribution `downloadURL`/
   `accessURL` rendering, dashboards, and search results as they're built).

**Acceptance.** A unit test that `safeHref("javascript:alert(1)")` → `undefined` and that
`PropList.vue` renders text (no `<a>`) for a `javascript:` publisher URI; normal `https:`
URIs still render as links.

---

## Part B — Standing secure-development rules

### 1. Server data is untrusted — never feed it to a code/markup sink
No `v-html`, `innerHTML`, `outerHTML`, `document.write`, `eval`, or `new Function` on any
value that originated from the API, RDF metadata, the IdP token, or the URL. The codebase
is clean of these today (RecordCard uses a segment-splitter, not `v-html`) — keep it that
way. Highlighting, rich text, and previews must be built from escaped segments, not raw
HTML.

### 2. URLs from data go through `safeHref` (rule added by A-1)
Any `:href`, `:src`, `window.open`, `location.*`, or `<form :action>` whose value is
influenced by server/metadata/user input must pass an allowlist scheme check first.
External links additionally need `rel="noopener noreferrer"` with `target="_blank"`
(already the pattern in `SparqlPlaygroundView.vue` and `ProfileView.vue` — match it).

### 3. Token handling stays minimal and tab-scoped
Keep OIDC Authorization-Code + PKCE; never enable the implicit flow. Tokens stay in
`sessionStorage` via `WebStorageStateStore` (`auth/userManager.ts`) — do **not** move them
to `localStorage`, cookies without `HttpOnly`, or any global. Attach the bearer only to
the FDP API base URL via the existing axios interceptor (`api/http.ts`); never send it to
a third-party origin or log it. The `sessionStorage` choice is the main thing standing
between an XSS bug and token theft, so rules 1–2 protect it — treat them as linked.

### 4. Don't widen what the build trusts
`script-src 'self'` is the backbone of the client CSP (`deploy/fdp-headers.conf`). Avoid
inline event handlers, inline `<script>`, and `unsafe-eval`/`unsafe-inline` for scripts.
If a dependency demands them, find another dependency or isolate it — don't relax the CSP.
`connect-src` is injected at container start with the real API+IdP origins; keep new
network targets explicit, not wildcarded.

### 5. Validate runtime config, fail safe
Runtime values (`window.__FDP_CONFIG__`, `GET /config` OIDC bootstrap) come from outside
the bundle. Treat them as untrusted: an unexpected `issuer`/`client_id` should fall back
to the `.env` defaults (current behaviour in `userManager.ts`), not silently redirect auth
to an attacker-named authority. Don't build redirect URIs from unvalidated input.

### 6. Dependencies and CI
The `npm audit` (high/critical gate) + CycloneDX SBOM workflow (`security-scan.yml`) must
stay green. Triage new advisories with a recorded rationale rather than bumping the gate
threshold. Prefer well-maintained, minimal dependencies for anything that renders
server data.

### 7. Before merging anything that renders server data or touches auth
- Grep your diff for `v-html`, `innerHTML`, `:href`, `:src`, `eval`, `Function`,
  `localStorage`, `window.open`.
- Confirm every data-derived URL goes through `safeHref` and every data-derived string
  reaches the DOM as text (Vue interpolation / bound text), not markup.
- Run the unit suite (including the token-storage and `safeHref` tests) and `eslint`.

---

*Keep this file current: when A-1 lands, note it as done and fold its lesson into rule 2.*
