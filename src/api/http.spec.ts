/**
 * HTTP interceptor regression: a 401 attempts silent renew once and retries
 * the failed request with the refreshed token. A second 401 propagates.
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { AxiosHeaders, AxiosError } from "axios";
import { http } from "./http";
import { useAuthStore } from "@/stores/auth";
import { __setUserManager } from "@/auth/userManager";

describe("http interceptor", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("retries a 401 after silent renew and succeeds with the refreshed token", async () => {
    const signinSilent = vi.fn().mockResolvedValue({
      profile: {},
      access_token: "fresh",
      expired: false,
    });
    __setUserManager({
      signinRedirect: vi.fn(),
      signoutRedirect: vi.fn(),
      signinRedirectCallback: vi.fn(),
      signinSilent,
      getUser: vi.fn().mockResolvedValue(null),
    } as unknown as import("oidc-client-ts").UserManager);

    const auth = useAuthStore();
    auth.user = {
      profile: {},
      access_token: "stale",
      expired: false,
    } as unknown as import("oidc-client-ts").User;

    let calls = 0;
    const adapter = vi.fn((config: { headers?: AxiosHeaders }) => {
      calls++;
      const authHeader = config.headers?.get?.("Authorization");
      if (calls === 1) {
        const err = new AxiosError("Unauthorized");
        err.response = {
          status: 401,
          statusText: "Unauthorized",
          headers: {},
          config,
          data: null,
        } as never;
        err.config = config as never;
        return Promise.reject(err);
      }
      return Promise.resolve({
        data: { ok: true, sent: authHeader },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      });
    });

    http.defaults.adapter = adapter as never;

    const res = await http.get<{ ok: boolean; sent: string }>("/records/abc");
    expect(res.data.ok).toBe(true);
    expect(res.data.sent).toBe("Bearer fresh");
    expect(signinSilent).toHaveBeenCalledOnce();
    expect(calls).toBe(2);
  });

  it("propagates a second 401 without re-retrying", async () => {
    const signinSilent = vi.fn().mockResolvedValue({
      profile: {},
      access_token: "fresh",
      expired: false,
    });
    __setUserManager({
      signinRedirect: vi.fn(),
      signoutRedirect: vi.fn(),
      signinRedirectCallback: vi.fn(),
      signinSilent,
      getUser: vi.fn().mockResolvedValue(null),
    } as unknown as import("oidc-client-ts").UserManager);

    const auth = useAuthStore();
    auth.user = {
      profile: {},
      access_token: "stale",
      expired: false,
    } as unknown as import("oidc-client-ts").User;

    const adapter = vi.fn((config: { headers?: AxiosHeaders }) => {
      const err = new AxiosError("Unauthorized");
      err.response = {
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config,
        data: null,
      } as never;
      err.config = config as never;
      return Promise.reject(err);
    });
    http.defaults.adapter = adapter as never;

    await expect(http.get("/records/abc")).rejects.toThrow();
    expect(signinSilent).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
  });
});
