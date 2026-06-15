/**
 * Runtime configuration — so one built image serves any deployment.
 *
 * Vite bakes `import.meta.env.VITE_*` at **build** time, which would pin a
 * single image to one API origin. To keep the GHCR image reusable, the
 * container writes `/config.js` at start-up (from `$FDP_API_URL` /
 * `$FDP_PUBLIC_ORIGIN`), and that script sets `window.__FDP_CONFIG__` before the
 * app boots. These helpers read it, falling back to the build-time `VITE_*`
 * values (for `npm run dev` / static hosting) and finally to sensible defaults.
 *
 * `public/config.js` ships an empty default so dev and tests work unchanged.
 */

/**
 * Deployer white-label overrides — so an organisation can match its look & feel
 * without rebuilding the image (set in `/config.js` alongside `apiUrl`). Theme
 * keys are CSS custom properties; only an allowlisted subset is honoured (see
 * `useBranding`). Logos should be same-origin or `data:` URIs to stay within the
 * documented `img-src` CSP.
 */
export interface BrandingConfig {
  /** Organisation name; takes precedence over the repository title in the header lockup. */
  orgName?: string;
  /** Logo image (light theme). When set, replaces the built-in FDP Neo lockup. */
  logoUrl?: string;
  /** Optional dark-theme logo variant; falls back to `logoUrl`. */
  logoUrlDark?: string;
  /** Light-theme token overrides, e.g. `{ "--accent": "#7a1f2b" }`. */
  theme?: Record<string, string>;
  /** Dark-theme token overrides. */
  themeDark?: Record<string, string>;
}

export interface FdpRuntimeConfig {
  /** Absolute origin of the FDP API, e.g. `https://fdp.example`. Empty/"/" = same origin. */
  apiUrl?: string;
  /** The origin this SPA is served from (OIDC redirect_uri base). */
  publicOrigin?: string;
  /** Optional deployer white-label overrides (colors, logo, org name). */
  branding?: BrandingConfig;
}

declare global {
  interface Window {
    __FDP_CONFIG__?: FdpRuntimeConfig;
  }
}

function read(key: "apiUrl" | "publicOrigin"): string | undefined {
  const v = typeof window !== "undefined" ? window.__FDP_CONFIG__?.[key]?.trim() : undefined;
  return v ? v : undefined;
}

/** Deployer white-label overrides, or an empty object when none are configured. */
export function runtimeBranding(): BrandingConfig {
  return (typeof window !== "undefined" && window.__FDP_CONFIG__?.branding) || {};
}

/**
 * Bootstrap API base URL: runtime → build-time `VITE_FDP_API_URL` → same origin
 * (`/`). This is the origin the app boots from and fetches `GET /fdp-api/config`
 * through, i.e. where the API is actually reachable — the **serving** origin.
 */
export function runtimeApiUrl(): string {
  return read("apiUrl") || import.meta.env.VITE_FDP_API_URL || "/";
}

/**
 * Persistent-identifier (PID) base vs serving origin — ADR-0014.
 *
 * A record's canonical IRI (its RDF subject) is minted under the server's
 * `fdp_url` (a W3ID/PURL namespace), which is decoupled from `serving_url`, the
 * origin where the API answers. In dev they coincide; in production they differ:
 * a record displayed as `{fdp_url}/catalog/x` is fetched at `{serving_url}/catalog/x`.
 *
 * Both are learned from `GET /fdp-api/config` at startup (`stores/config.ts`).
 * Until that resolves — and always in dev — they fall back to the bootstrap
 * origin, so nothing breaks before config loads.
 */
let serverFdpUrl: string | undefined;
let serverServingUrl: string | undefined;

/** Record the server's PID base (`fdp_url`) and serving origin (`serving_url`) from `/config`. */
export function setServerBases(bases: { fdpUrl?: string; servingUrl?: string }): void {
  serverFdpUrl = bases.fdpUrl?.trim() || undefined;
  serverServingUrl = bases.servingUrl?.trim() || undefined;
}

/** The persistent-identifier base: record IRIs (subjects) are rooted here. Use for display/linking PIDs. */
export function runtimePidBase(): string {
  return serverFdpUrl ?? runtimeApiUrl();
}

/** The serving/API origin: all API calls (CRUD, SPARQL, docs) are reached here. */
export function runtimeServingBase(): string {
  return serverServingUrl ?? runtimeApiUrl();
}

/** Public origin for OIDC redirects: runtime → `VITE_PUBLIC_ORIGIN` → this window's origin. */
export function runtimePublicOrigin(): string {
  return (
    read("publicOrigin") ||
    import.meta.env.VITE_PUBLIC_ORIGIN ||
    (typeof window !== "undefined" ? window.location.origin : "")
  );
}
