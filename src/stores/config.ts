/**
 * Bootstrap-config store.
 *
 * Holds the server's `GET /config` payload — OIDC settings, the active profile,
 * and feature flags — loaded once at startup before OIDC init (see
 * `src/main.ts`). The OIDC block is fed into `userManager.ts`; `features` gates
 * optional UI (search/metrics/sparql) in the router and header.
 *
 * **Fallback policy:** features default to *permissive* (everything on) and the
 * load is best-effort. If `/config` fails (old server, or a 500 from a
 * downstream outage), we keep the permissive defaults and `available` stays
 * false — so a degraded server never hides working UI, and `userManager` falls
 * back to the `.env` OIDC values. A feature is only hidden when the server
 * *explicitly* reports it disabled.
 *
 * In-memory only (CLAUDE.md): re-fetched on every reload.
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import {
  fetchBootstrapConfig,
  type BootstrapConfig,
  type FeatureFlags,
  type OIDCBootstrap,
} from "@/api/config";

// Everything on: a server that doesn't answer never hides working UI.
const PERMISSIVE: FeatureFlags = {
  metrics: true,
  sparql: true,
  data_provider: true,
  search: true,
  index: true,
  user_management: true,
};

export const useConfigStore = defineStore("config", () => {
  const features = ref<FeatureFlags>({ ...PERMISSIVE });
  const oidc = ref<OIDCBootstrap | null>(null);
  const profile = ref<BootstrapConfig["profile"]>(null);
  /** True once `load()` has run (success or fallback). */
  const loaded = ref(false);
  /** True only when `/config` was fetched successfully. */
  const available = ref(false);

  async function load(): Promise<void> {
    try {
      const cfg = await fetchBootstrapConfig();
      features.value = cfg.features;
      oidc.value = cfg.oidc;
      profile.value = cfg.profile;
      available.value = true;
    } catch {
      // Keep permissive defaults + env OIDC fallback (see module docstring).
      available.value = false;
    } finally {
      loaded.value = true;
    }
  }

  /** A feature is enabled unless the server explicitly reported it false. */
  function isEnabled(feature: keyof FeatureFlags): boolean {
    return features.value[feature] !== false;
  }

  return { features, oidc, profile, loaded, available, load, isEnabled };
});
