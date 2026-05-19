/**
 * OIDC UserManager singleton + test seam.
 *
 * Kept out of the Pinia store so unit tests can swap in a stub without
 * recompiling the store module. The first real call to `getUserManager()`
 * constructs the manager from env; `__setUserManager` short-circuits that
 * for tests.
 */

import { UserManager } from "oidc-client-ts";

let instance: UserManager | null = null;

function build(): UserManager {
  return new UserManager({
    authority: import.meta.env.VITE_OIDC_AUTHORITY,
    client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
    redirect_uri: `${import.meta.env.VITE_PUBLIC_ORIGIN}/auth/callback`,
    post_logout_redirect_uri: import.meta.env.VITE_PUBLIC_ORIGIN,
    response_type: "code",
    scope: "openid profile email",
    loadUserInfo: false,
    automaticSilentRenew: true,
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

/** Reset the singleton so a subsequent `getUserManager()` rebuilds from env. */
export function __resetUserManager(): void {
  instance = null;
}
