/**
 * OIDC UserManager singleton + test seam.
 *
 * Kept out of the Pinia store so unit tests can swap in a stub without
 * recompiling the store module. The first real call to `getUserManager()`
 * constructs the manager from the server config (via `configureOidc`) with the
 * `.env` `VITE_OIDC_*` values as fallback; `__setUserManager` short-circuits
 * that for tests.
 */

import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { OIDCBootstrap } from "@/api/config";
import { runtimePublicOrigin } from "@/runtimeConfig";

let instance: UserManager | null = null;

// OIDC values resolved from the server's `GET /config` at startup. They take
// precedence over the `.env` `VITE_OIDC_*` fallbacks. `configureOidc` must run
// before the first `getUserManager()` (see `src/main.ts`).
let override: { authority?: string; client_id?: string } = {};

/**
 * Feed server-provided OIDC settings in. `issuer` becomes the `authority` and
 * `client_id_hint` (when present) the `client_id`; both fall back to `.env`.
 * Passing `null` (config unavailable) leaves the `.env` fallbacks in force.
 *
 * Note: the server also reports an `audience`, but injecting it into the auth
 * request varies by IdP (Auth0 wants `extraQueryParams.audience`; Keycloak
 * doesn't), so we don't force it here — `authority`/`client_id` are what the
 * client needs to align with the server.
 */
export function configureOidc(oidc: OIDCBootstrap | null): void {
  if (!oidc) return;
  const next: { authority?: string; client_id?: string } = {};
  if (oidc.issuer) next.authority = oidc.issuer;
  if (oidc.client_id_hint) next.client_id = oidc.client_id_hint;
  override = next;
}

function build(): UserManager {
  return new UserManager({
    authority: override.authority ?? import.meta.env.VITE_OIDC_AUTHORITY,
    client_id: override.client_id ?? import.meta.env.VITE_OIDC_CLIENT_ID,
    redirect_uri: `${runtimePublicOrigin()}/auth/callback`,
    post_logout_redirect_uri: runtimePublicOrigin(),
    response_type: "code",
    scope: "openid profile email",
    loadUserInfo: false,
    automaticSilentRenew: true,
    // Keep tokens in sessionStorage, not the default localStorage (security
    // audit R-06): they are scoped to the tab, cleared on close, and not shared
    // across tabs — reducing the window for XSS token theft. Silent renew /
    // the IdP SSO session re-establishes the session within a tab.
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  });
}

export function getUserManager(): UserManager {
  if (!instance) instance = build();
  return instance;
}

/** Test-only seam. Do not import from production code. */
export function __setUserManager(stub: UserManager): void {
  instance = stub;
}

/** Reset the singleton + config override so a subsequent build re-reads env. */
export function __resetUserManager(): void {
  instance = null;
  override = {};
}
