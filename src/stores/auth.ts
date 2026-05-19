/**
 * Authentication store.
 *
 * Owns the OIDC session via `oidc-client-ts`. The store exposes:
 *
 *   - `user`             — the active OIDC user object, or null.
 *   - `isAuthenticated`  — derived from `user` and `user.expired`.
 *   - `accessToken`      — the current bearer token (or null).
 *   - `roles`            — flattened role set, read from the configured
 *                          claim path on the ID token profile.
 *   - `error`            — the most recent auth-flow failure, or null.
 *   - `intendedRedirect` — where the user wanted to go before being asked
 *                          to sign in. Set by the router guard, consumed by
 *                          the callback view. In-memory only.
 *
 * No browser storage for app state (per CLAUDE.md). `oidc-client-ts` manages
 * its own session-storage for the OIDC artifacts; that's tooling state, not
 * application state, and is unavoidable for code-flow PKCE.
 */

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/auth/userManager";

const DEFAULT_ROLES_CLAIM = "realm_access.roles";

function readRoles(profile: User["profile"] | undefined, path: string): readonly string[] {
  if (!profile) return [];
  const parts = path.split(".");
  let cursor: unknown = profile;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== "object") return [];
    cursor = (cursor as Record<string, unknown>)[part];
  }
  if (Array.isArray(cursor)) return cursor.filter((v): v is string => typeof v === "string");
  return [];
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const error = ref<Error | null>(null);
  const intendedRedirect = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null && !user.value.expired);
  const accessToken = computed(() => user.value?.access_token ?? null);

  const roles = computed<readonly string[]>(() => {
    const claim = import.meta.env.VITE_OIDC_ROLES_CLAIM ?? DEFAULT_ROLES_CLAIM;
    return readRoles(user.value?.profile, claim);
  });

  function setIntendedRedirect(path: string | null) {
    intendedRedirect.value = path;
  }

  function consumeIntendedRedirect(): string | null {
    const next = intendedRedirect.value;
    intendedRedirect.value = null;
    return next;
  }

  async function login(redirectTo?: string): Promise<void> {
    if (redirectTo) setIntendedRedirect(redirectTo);
    try {
      await getUserManager().signinRedirect({
        state: { redirectTo: redirectTo ?? intendedRedirect.value ?? null },
      });
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw error.value;
    }
  }

  async function logout(): Promise<void> {
    try {
      await getUserManager().signoutRedirect();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    }
    user.value = null;
  }

  async function handleCallback(): Promise<string | null> {
    try {
      const result = await getUserManager().signinRedirectCallback();
      user.value = result;
      const state = result.state as { redirectTo?: string | null } | null;
      return state?.redirectTo ?? consumeIntendedRedirect();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw error.value;
    }
  }

  async function silentRenew(): Promise<void> {
    try {
      const next = await getUserManager().signinSilent();
      if (next) user.value = next;
    } catch (e) {
      // Silent-renew failures are expected (no refresh token, IdP unreachable).
      // Surface them as state but don't throw — callers decide whether to
      // re-prompt for an interactive login.
      error.value = e instanceof Error ? e : new Error(String(e));
    }
  }

  async function loadStoredUser(): Promise<void> {
    try {
      user.value = await getUserManager().getUser();
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    user,
    isAuthenticated,
    accessToken,
    roles,
    error,
    intendedRedirect,
    login,
    logout,
    handleCallback,
    silentRenew,
    loadStoredUser,
    setIntendedRedirect,
    consumeIntendedRedirect,
    clearError,
  };
});
