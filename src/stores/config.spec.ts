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

const setServerBases = vi.fn();
vi.mock("@/runtimeConfig", () => ({
  setServerBases: (...args: unknown[]) => setServerBases(...args),
  // http.ts (pulled in transitively) and auth read these.
  runtimeApiUrl: () => "http://localhost:8000",
  runtimePidBase: () => "http://localhost:8000",
  runtimeServingBase: () => "http://localhost:8000",
  runtimePublicOrigin: () => "http://localhost:5173",
}));

import { useConfigStore } from "./config";
import { http } from "@/api/http";

beforeEach(() => {
  setActivePinia(createPinia());
  fetchBootstrapConfig.mockReset();
  setServerBases.mockReset();
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
      fdp_url: "https://w3id.org/example/fdp",
      serving_url: "https://api.example.org",
      fdp_namespace: "https://w3id.org/example/fdp/",
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
    // PID base vs serving origin are stored and pushed to the RDF layer (ADR-0014).
    expect(store.fdpUrl).toBe("https://w3id.org/example/fdp");
    expect(store.servingUrl).toBe("https://api.example.org");
    expect(setServerBases).toHaveBeenCalledWith({
      fdpUrl: "https://w3id.org/example/fdp",
      servingUrl: "https://api.example.org",
    });
    // The HTTP client is repointed at the server-declared serving origin.
    expect(http.defaults.baseURL).toBe("https://api.example.org");
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
