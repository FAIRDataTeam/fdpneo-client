# Security Policy

The FAIR Data Point client is the web UI for an FDP server that may hold
sensitive (including clinical) metadata. We welcome coordinated disclosure.

## Reporting a vulnerability

**Please report privately — do not open a public issue or PR.**

- **Preferred:** GitHub *private vulnerability reporting* — the **Security** tab →
  **Report a vulnerability** on this repository.
- **Email:** `security@CHANGE-ME.example` (replace with the project's real
  security contact before publishing).

Include the affected version/commit, a reproduction, and the impact. We aim to
acknowledge within **3 business days**; we credit reporters unless they ask
otherwise. Please give us reasonable time to fix before public disclosure.

## Supported versions

Pre-1.0 software: security fixes land on `main`.

| Version | Supported |
|---------|-----------|
| `main`  | ✅        |
| < 0.1   | ❌        |

## Built-in protections

- **Auth:** Authorization-Code + PKCE via `oidc-client-ts`; no implicit flow.
- **Token storage:** access/refresh tokens are kept in `sessionStorage`
  (tab-scoped, cleared on close), not `localStorage`.
- **XSS:** Vue auto-escaping; no `v-html`/`innerHTML` sinks. User-controlled
  metadata IRIs bound into `:href` pass through a scheme allowlist
  (`http`/`https`/`mailto`, in `src/composables/safeUrl.ts`) so a crafted
  `javascript:`/`data:` IRI cannot run script on click.

## Deployment (serving layer)

Serve the SPA over HTTPS with a strict **Content-Security-Policy** and the usual
security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
HSTS). A recommended production CSP is documented in [`index.html`](index.html)
and in the server's `docs/security/deployment-hardening.md`. Set `connect-src`
to your API and IdP origins.

## Automated scanning

CI runs `npm audit` (gated at high/critical) and publishes a CycloneDX SBOM on
every pull request, on pushes to `main`, and weekly —
[`.github/workflows/security-scan.yml`](.github/workflows/security-scan.yml).
