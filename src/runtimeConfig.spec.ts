/**
 * Persistent-identifier base vs serving origin (ADR-0014).
 *
 * Before `/config` resolves — and always in dev — both bases fall back to the
 * bootstrap origin (`runtimeApiUrl`). Once the server reports them they diverge:
 * record IRIs root at `fdp_url`, API calls go to `serving_url`.
 */

import { afterEach, describe, expect, it } from "vitest";
import { runtimeApiUrl, runtimePidBase, runtimeServingBase, setServerBases } from "./runtimeConfig";

afterEach(() => {
  // Clear the module-level bases so each test starts from the env fallback.
  setServerBases({});
});

describe("server identifier bases", () => {
  it("both bases fall back to the bootstrap origin until /config sets them", () => {
    const fallback = runtimeApiUrl();
    expect(runtimePidBase()).toBe(fallback);
    expect(runtimeServingBase()).toBe(fallback);
  });

  it("diverge once the server reports fdp_url and serving_url", () => {
    setServerBases({ fdpUrl: "https://w3id.org/example/fdp", servingUrl: "https://api.example.org" });
    expect(runtimePidBase()).toBe("https://w3id.org/example/fdp");
    expect(runtimeServingBase()).toBe("https://api.example.org");
  });

  it("ignores blank values and falls back per-base", () => {
    setServerBases({ fdpUrl: "  ", servingUrl: "https://api.example.org" });
    expect(runtimePidBase()).toBe(runtimeApiUrl()); // blank → fallback
    expect(runtimeServingBase()).toBe("https://api.example.org");
  });
});
