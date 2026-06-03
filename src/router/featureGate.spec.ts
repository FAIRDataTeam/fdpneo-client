/**
 * `routeFeatureBlocked` gates routes on the server's feature flags: a route is
 * blocked only when it declares a `meta.feature` the server reports `false`.
 */

import { describe, expect, it } from "vitest";
import { routeFeatureBlocked } from "./index";
import type { FeatureFlags } from "@/api/config";

const ALL_ON: FeatureFlags = {
  metrics: true,
  sparql: true,
  data_provider: true,
  search: true,
  index: true,
};

describe("routeFeatureBlocked", () => {
  it("never blocks a route with no feature requirement", () => {
    expect(routeFeatureBlocked({ title: "Browse" }, { ...ALL_ON, search: false })).toBe(false);
  });

  it("blocks a feature route when the flag is disabled", () => {
    expect(routeFeatureBlocked({ feature: "search" }, { ...ALL_ON, search: false })).toBe(true);
  });

  it("allows a feature route when the flag is enabled", () => {
    expect(routeFeatureBlocked({ feature: "metrics" }, ALL_ON)).toBe(false);
  });
});
