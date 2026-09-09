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
 *                           share a single in-flight promise. When the IdP
 *                           refuses (SSO session gone), the local session is
 *                           ended: `user` is cleared, the stored token removed,
 *                           and `sessionExpired` raised — so admin-gated polling
 *                           stops and the app degrades to anonymous instead of
 *                           re-sending a dead token forever.
 *   - `sessionExpired`   — true after a failed renew until the next sign-in.
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
  const sessionExpired = ref(false);

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

  function hasRole(role: string): boolean {
    return roles.value.includes(role);
  }

  // Modify/create on metadata is governed by the bundled FDP offer, which
  // grants those actions to the "steward" role; "admin" implies steward.
  const isSteward = computed(() => hasRole("steward") || hasRole("admin"));
  const isAdmin = computed(() => hasRole("admin"));

  function setIntendedRedirect(path: string | null): void {
    intendedRedirect.value = path;
  }

  function clearError(): void {
    error.value = null;
  }

  async function login(returnTo: string | null = null): Promise<void> {
    clearError();
    sessionExpired.value = false;
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
      sessionExpired.value = false;
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
      } catch {
        // Silent renew runs in the background (from the 401 interceptor), so a
        // failure here must NOT write the store-wide `error.value` — doing so
        // surfaces a stale "renew failed" banner over unrelated views. But the
        // session IS over: leaving the stale user in place kept `isAdmin` true,
        // so the footer readiness poll re-sent the dead token every minute
        // (thousands of 401s on a live deployment) and public pages errored
        // instead of rendering anonymously. End it here; the caller replays
        // idempotent reads anonymously and the header shows a sign-in prompt.
        await endExpiredSession();
        return null;
      } finally {
        renewInFlight = null;
      }
    })();
    return renewInFlight;
  }

  async function endExpiredSession(): Promise<void> {
    user.value = null;
    intendedRedirect.value = null;
    sessionExpired.value = true;
    try {
      // Drop the dead token from the OIDC store too, or a reload would
      // rehydrate it and start the 401 loop again.
      await getUserManager().removeUser();
    } catch {
      // best effort — the in-memory session is already gone
    }
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
    hasRole,
    isSteward,
    isAdmin,
    error,
    intendedRedirect,
    sessionExpired,
    login,
    logout,
    handleCallback,
    silentRenew,
    loadStoredUser,
    setIntendedRedirect,
    clearError,
  };
});
