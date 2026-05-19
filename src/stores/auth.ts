/**
 * Authentication store.
 *
 * Manages the OIDC session via oidc-client-ts. Surfaces:
 *
 *   - `user`            — the active OIDC user object, or null.
 *   - `isAuthenticated` — derived boolean.
 *   - `roles`           — flattened role set from the IdP claims.
 *   - `login()`         — initiates the OIDC redirect flow.
 *   - `logout()`        — clears local session and redirects to end-session.
 *   - `handleCallback()` — completes the redirect at /auth/callback.
 *   - `silentRenew()`   — refreshes the token without UI.
 *
 * The store does NOT store user data beyond the OIDC user object. Profile
 * attributes (name, email) are read from the token's claims on demand.
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { UserManager, type User } from "oidc-client-ts";

const userManager = new UserManager({
  authority: import.meta.env.VITE_OIDC_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: `${import.meta.env.VITE_PUBLIC_ORIGIN}/auth/callback`,
  post_logout_redirect_uri: import.meta.env.VITE_PUBLIC_ORIGIN,
  response_type: "code",
  scope: "openid profile email",
  loadUserInfo: false,
});

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => user.value !== null && !user.value.expired);
  const accessToken = computed(() => user.value?.access_token ?? null);

  // TODO: extract roles from the configured claim path (matches server config).
  const roles = computed<readonly string[]>(() => {
    if (!user.value?.profile) return [];
    return [];
  });

  async function login(): Promise<void> {
    await userManager.signinRedirect();
  }

  async function logout(): Promise<void> {
    await userManager.signoutRedirect();
    user.value = null;
  }

  async function handleCallback(): Promise<void> {
    user.value = await userManager.signinRedirectCallback();
  }

  async function silentRenew(): Promise<void> {
    user.value = await userManager.signinSilent();
  }

  async function loadStoredUser(): Promise<void> {
    user.value = await userManager.getUser();
  }

  return {
    user,
    isAuthenticated,
    accessToken,
    roles,
    login,
    logout,
    handleCallback,
    silentRenew,
    loadStoredUser,
  };
});
