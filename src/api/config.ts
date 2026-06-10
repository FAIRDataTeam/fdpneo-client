/**
 * Bootstrap config — `GET /config`.
 *
 * The server self-describes its OIDC settings, the active metadata profile, and
 * which optional features are enabled. The client reads this once at startup
 * (see `src/stores/config.ts` + `src/main.ts`) so OIDC isn't hardcoded in
 * `.env` and optional UI can be gated on `features`.
 *
 * `/fdp-api/config` is public (anonymous-readable). If it fails — an older server, or a
 * downstream (Postgres/OIDC) outage returns 500 — the caller falls back to the
 * `.env` OIDC values and a permissive feature set so the app still boots.
 */

import { http } from "./http";
import type { components } from "./schema";

export type BootstrapConfig = components["schemas"]["BootstrapConfig"];
export type FeatureFlags = components["schemas"]["FeatureFlags"];
export type OIDCBootstrap = components["schemas"]["OIDCBootstrap"];
export type ProfileBootstrap = components["schemas"]["ProfileBootstrap"];

/** Fetch the server's bootstrap config. Throws on any non-2xx (caller falls back). */
export async function fetchBootstrapConfig(): Promise<BootstrapConfig> {
  const res = await http.get<BootstrapConfig>("/fdp-api/config");
  return res.data;
}
