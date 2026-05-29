import { describe, expect, it, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAuthStore } from "./auth";
import { __setUserManager } from "@/auth/userManager";

function makeUser(opts: { expired?: boolean; profile?: Record<string, unknown>; token?: string }) {
  return {
    profile: opts.profile ?? {},
    access_token: opts.token ?? "token-1",
    expired: opts.expired ?? false,
  } as unknown as import("oidc-client-ts").User;
}

interface MockManager {
  signinRedirect: ReturnType<typeof vi.fn>;
  signoutRedirect: ReturnType<typeof vi.fn>;
  signinRedirectCallback: ReturnType<typeof vi.fn>;
  signinSilent: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
}

function installMockManager(): MockManager {
  const m: MockManager = {
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    signoutRedirect: vi.fn().mockResolvedValue(undefined),
    signinRedirectCallback: vi.fn(),
    signinSilent: vi.fn(),
    getUser: vi.fn().mockResolvedValue(null),
  };
  __setUserManager(m as unknown as import("oidc-client-ts").UserManager);
  return m;
}

describe("auth store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("extracts roles from the default realm_access.roles claim", () => {
    installMockManager();
    const store = useAuthStore();
    store.user = makeUser({
      profile: { realm_access: { roles: ["admin", "steward"] } },
    });
    expect(Array.from(store.roles)).toEqual(["admin", "steward"]);
  });

  it("returns no roles when the claim is missing or malformed", () => {
    installMockManager();
    const store = useAuthStore();
    store.user = makeUser({ profile: { realm_access: { roles: "not-an-array" } } });
    expect(store.roles).toHaveLength(0);
  });

  it("derives role helpers (admin implies steward)", () => {
    installMockManager();
    const store = useAuthStore();
    store.user = makeUser({ profile: { realm_access: { roles: ["admin"] } } });
    expect(store.isAdmin).toBe(true);
    expect(store.isSteward).toBe(true); // admin implies steward
    expect(store.hasRole("admin")).toBe(true);
    expect(store.hasRole("nope")).toBe(false);

    store.user = makeUser({ profile: { realm_access: { roles: ["steward"] } } });
    expect(store.isAdmin).toBe(false);
    expect(store.isSteward).toBe(true);
  });

  it("handleCallback returns the redirectTo carried through OIDC state", async () => {
    const mgr = installMockManager();
    const u = makeUser({});
    (u as unknown as { state: unknown }).state = { redirectTo: "/dashboard" };
    mgr.signinRedirectCallback.mockResolvedValue(u);

    const store = useAuthStore();
    const target = await store.handleCallback();
    expect(target).toBe("/dashboard");
    expect(store.isAuthenticated).toBe(true);
  });

  it("handleCallback falls back to the in-memory intendedRedirect when state is empty", async () => {
    const mgr = installMockManager();
    const u = makeUser({});
    (u as unknown as { state: unknown }).state = null;
    mgr.signinRedirectCallback.mockResolvedValue(u);

    const store = useAuthStore();
    store.setIntendedRedirect("/records/abc");
    const target = await store.handleCallback();
    expect(target).toBe("/records/abc");
    expect(store.intendedRedirect).toBe(null); // consumed
  });

  it("login stashes intendedRedirect when one is passed", async () => {
    const mgr = installMockManager();
    const store = useAuthStore();
    await store.login("/dashboard");
    expect(store.intendedRedirect).toBe("/dashboard");
    expect(mgr.signinRedirect).toHaveBeenCalledOnce();
  });

  it("silentRenew updates the user on success and surfaces an error otherwise", async () => {
    const mgr = installMockManager();
    const store = useAuthStore();
    mgr.signinSilent.mockResolvedValueOnce(makeUser({ token: "fresh" }));
    await store.silentRenew();
    expect(store.accessToken).toBe("fresh");

    mgr.signinSilent.mockRejectedValueOnce(new Error("network"));
    await store.silentRenew();
    expect(store.error?.message).toBe("network");
  });
});
