/**
 * OIDC UserManager factory.
 *
 * Pulled out of the auth store so tests can mock it. The store imports
 * `getUserManager()` and never constructs a `UserManager` directly.
 *
 * Configuration comes from Vite-injected env vars (see `env.d.ts`). The flow
 * is Authorization Code + PKCE, with no userinfo round-trip — claims come
 * from the ID token.
 */

import { UserManager } from "oidc-client-ts";

let instance: UserManager | undefined;

export function getUserManager(): UserManager {
  if (!instance) {
    instance = new UserManager({
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
  return instance;
}

/**
 * Override the UserManager used at runtime. Intended for tests.
 */
export function __setUserManager(mgr: UserManager | undefined): void {
  instance = mgr;
}
