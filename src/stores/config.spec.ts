/**
 * Bootstrap-config store: load success populates OIDC + features; a failed load
 * (old/unreachable server) must keep permissive defaults so the app still boots.
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const fetchBootstrapConfig = vi.fn();
vi.mock("@/api/config", () => ({
  fetchBootstrapConfig: () => fetchBootstrapConfig(),
}));

import { useConfigStore } from "./config";

beforeEach(() => {
  setActivePinia(createPinia());
  fetchBootstrapConfig.mockReset();
});

describe("config store", () => {
  it("defaults to permissive features before load", () => {
    const store = useConfigStore();
    expect(store.loaded).toBe(false);
    expect(store.isEnabled("search")).toBe(true);
    expect(store.isEnabled("metrics")).toBe(true);
  });

  it("adopts server features + OIDC on a successful load", async () => {
    fetchBootstrapConfig.mockResolvedValueOnce({
      fdp_url: "http://localhost:8000",
      fdp_namespace: "http://localhost:8000/",
      fdp_version: "0.1.0",
      oidc: { issuer: "http://idp", audience: "fdp", client_id_hint: "fdp-client" },
      profile: { name: "default", version: "1" },
      features: { metrics: true, sparql: true, data_provider: true, search: false, index: false },
    });

    const store = useConfigStore();
    await store.load();

    expect(store.available).toBe(true);
    expect(store.loaded).toBe(true);
    expect(store.oidc?.issuer).toBe("http://idp");
    expect(store.profile?.name).toBe("default");
    // Server says search is off → hidden; metrics stays on.
    expect(store.isEnabled("search")).toBe(false);
    expect(store.isEnabled("metrics")).toBe(true);
  });

  it("keeps permissive features when /config fails", async () => {
    fetchBootstrapConfig.mockRejectedValueOnce(new Error("500"));

    const store = useConfigStore();
    await store.load();

    expect(store.available).toBe(false);
    expect(store.loaded).toBe(true);
    expect(store.oidc).toBeNull();
    expect(store.isEnabled("search")).toBe(true);
  });
});
