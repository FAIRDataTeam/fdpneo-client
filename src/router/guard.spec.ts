/**
 * Verifies that anonymous users hitting a `requiresAuth` route are pushed
 * through `auth.login()` and the in-app navigation is cancelled, while
 * authenticated users pass through cleanly.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { __setUserManager } from "@/auth/userManager";

function withRouter(requireAuth: boolean) {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div/>" } },
      {
        path: "/secret",
        name: "secret",
        component: { template: "<div/>" },
        meta: { requiresAuth: requireAuth },
      },
    ],
  });
}

describe("router auth guard", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("redirects anon users to OIDC login and aborts the navigation", async () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined);
    __setUserManager({
      signinRedirect,
      signoutRedirect: vi.fn(),
      signinRedirectCallback: vi.fn(),
      signinSilent: vi.fn(),
      getUser: vi.fn().mockResolvedValue(null),
    } as unknown as import("oidc-client-ts").UserManager);

    const router = withRouter(true);
    router.beforeEach(async (to) => {
      if (!to.meta.requiresAuth) return true;
      const auth = useAuthStore();
      if (auth.isAuthenticated) return true;
      auth.setIntendedRedirect(to.fullPath);
      await auth.login(to.fullPath);
      return false;
    });

    await router.push("/secret").catch(() => {
      // navigation cancelled — expected
    });
    expect(signinRedirect).toHaveBeenCalledOnce();
    expect(useAuthStore().intendedRedirect).toBe("/secret");
  });

  it("lets authenticated users through requiresAuth routes", async () => {
    __setUserManager({
      signinRedirect: vi.fn(),
      signoutRedirect: vi.fn(),
      signinRedirectCallback: vi.fn(),
      signinSilent: vi.fn(),
      getUser: vi.fn().mockResolvedValue(null),
    } as unknown as import("oidc-client-ts").UserManager);

    const router = withRouter(true);
    router.beforeEach((to) => {
      if (!to.meta.requiresAuth) return true;
      const auth = useAuthStore();
      return auth.isAuthenticated ? true : false;
    });

    const auth = useAuthStore();
    auth.user = {
      profile: {},
      access_token: "t",
      expired: false,
    } as unknown as import("oidc-client-ts").User;

    await router.push("/secret");
    expect(router.currentRoute.value.path).toBe("/secret");
  });
});
