/**
 * Authentication store.
 *
 * Manages the OIDC session via `oidc-client-ts`. The library handles its own
 * token storage (an explicit exception to CLAUDE.md's no-browser-storage
 * rule).
 *
 * The `intendedRedirect` field carries the in-app path a user was heading to
 * when they hit a `requiresAuth` route. It is held in memory only — a hard
 * reload during the IdP round-trip drops it; the user lands on `/`. For the
 * primary path (no reload), the same value is mirrored into the OIDC `state`
 * parameter so it survives the redirect even in incognito or hard-reload
 * scenarios. CLAUDE.md forbids browser storage for app state, but allows the
 * OIDC library's own storage; the state parameter rides inside that.
 *
 * Surface:
 *   - `user`             — the active OIDC user object, or null.
 *   - `isAuthenticated`  — derived boolean.
 *   - `accessToken`      — derived bearer string, or null.
 *   - `roles`            — string[] read from the configured claim path.
 *   - `error`            — last login/callback error (for the callback view).
 *   - `intendedRedirect` — in-memory `returnTo`; nulled when consumed.
 *   - `login(returnTo)`  — initiates the OIDC redirect flow.
 *   - `logout()`         — clears local session and end-session redirects.
 *   - `handleCallback()` — completes the redirect at /auth/callback; returns
 *                           the original returnTo (or "/").
 *   - `silentRenew()`    — refreshes the token without UI; concurrent callers
 *                           share a single in-flight promise.
 *   - `loadStoredUser()` — rehydrate from the OIDC library's storage on boot.
 *   - `setIntendedRedirect(path)` / `clearError()` — helpers used by the
 *                           router guard and the callback view.
 */

import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/auth/userManager";

function readPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== "object") return undefined;
  const segments = path.split(".").filter(Boolean);
  let cursor: unknown = source;
  for (const seg of segments) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[seg];
  }
  return cursor;
}

function extractRoles(profile: unknown, claimPath: string): string[] {
  const value = readPath(profile, claimPath);
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function getRolesClaim(): string {
  return import.meta.env.VITE_OIDC_ROLES_CLAIM || "realm_access.roles";
}

/** Pull the original returnTo out of the OIDC user's signed state, if any. */
function readReturnFromState(u: User | null): string | null {
  if (!u) return null;
  const state = (u as unknown as { state?: unknown }).state;
  if (!state || typeof state !== "object") return null;
  const target = (state as Record<string, unknown>).redirectTo;
  return typeof target === "string" ? target : null;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const error = ref<Error | null>(null);
  const intendedRedirect = ref<string | null>(null);

  let renewInFlight: Promise<User | null> | null = null;

  const isAuthenticated = computed(
    () => user.value !== null && !user.value.expired,
  );

  const accessToken = computed<string | null>(() =>
    user.value?.access_token ?? null,
  );

  const roles = computed<readonly string[]>(() =>
    user.value ? extractRoles(user.value.profile, getRolesClaim()) : [],
  );

  function setIntendedRedirect(path: string | null): void {
    intendedRedirect.value = path;
  }

  function clearError(): void {
    error.value = null;
  }

  async function login(returnTo: string | null = null): Promise<void> {
    clearError();
    if (returnTo) intendedRedirect.value = returnTo;
    try {
      // The `state` payload rides inside oidc-client-ts's own (already
      // permitted) storage, so this survives the IdP round-trip even when
      // the SPA is hard-reloaded by the redirect.
      await getUserManager().signinRedirect({
        state: returnTo ? { redirectTo: returnTo } : undefined,
      });
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw error.value;
    }
  }

  async function logout(): Promise<void> {
    clearError();
    try {
      await getUserManager().signoutRedirect();
    } finally {
      user.value = null;
      intendedRedirect.value = null;
    }
  }

  async function handleCallback(): Promise<string> {
    clearError();
    try {
      const completed = await getUserManager().signinRedirectCallback();
      user.value = completed;
      const fromState = readReturnFromState(completed);
      const target = fromState ?? intendedRedirect.value ?? "/";
      intendedRedirect.value = null;
      return target;
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      throw error.value;
    }
  }

  async function silentRenew(): Promise<User | null> {
    if (renewInFlight) return renewInFlight;
    renewInFlight = (async () => {
      try {
        const renewed = await getUserManager().signinSilent();
        user.value = renewed;
        return renewed;
      } catch (e) {
        error.value = e instanceof Error ? e : new Error(String(e));
        return null;
      } finally {
        renewInFlight = null;
      }
    })();
    return renewInFlight;
  }

  async function loadStoredUser(): Promise<void> {
    try {
      user.value = await getUserManager().getUser();
    } catch {
      user.value = null;
    }
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
    clearError,
  };
});
