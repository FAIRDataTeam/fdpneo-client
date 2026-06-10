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

export interface FdpRuntimeConfig {
  /** Absolute origin of the FDP API, e.g. `https://fdp.example`. Empty/"/" = same origin. */
  apiUrl?: string;
  /** The origin this SPA is served from (OIDC redirect_uri base). */
  publicOrigin?: string;
}

declare global {
  interface Window {
    __FDP_CONFIG__?: FdpRuntimeConfig;
  }
}

function read(key: keyof FdpRuntimeConfig): string | undefined {
  const v = typeof window !== "undefined" ? window.__FDP_CONFIG__?.[key]?.trim() : undefined;
  return v ? v : undefined;
}

/** API base URL: runtime → build-time `VITE_FDP_API_URL` → same origin (`/`). */
export function runtimeApiUrl(): string {
  return read("apiUrl") || import.meta.env.VITE_FDP_API_URL || "/";
}

/** Public origin for OIDC redirects: runtime → `VITE_PUBLIC_ORIGIN` → this window's origin. */
export function runtimePublicOrigin(): string {
  return (
    read("publicOrigin") ||
    import.meta.env.VITE_PUBLIC_ORIGIN ||
    (typeof window !== "undefined" ? window.location.origin : "")
  );
}
