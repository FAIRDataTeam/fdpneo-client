/**
 * Application entrypoint.
 *
 * Wires together: Vue, Pinia (state), Vue Router (navigation),
 * TanStack Query (server cache), PrimeVue (UI components), and the OIDC
 * auth singleton.
 *
 * Side-effect imports load global stylesheets and the OIDC user manager.
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import PrimeVue from "primevue/config";

import App from "./App.vue";
import { router } from "./router";
import { useAuthStore } from "./stores/auth";
import { useConfigStore } from "./stores/config";
import { configureOidc } from "./auth/userManager";
import { applyBranding } from "./composables/useBranding";
import "./styles/main.css";

// CORS-only networking (TASKS 11.1): the SPA calls the FDP server cross-origin,
// so the browser's origin must match both the server's CORS allow-list and the
// OIDC redirect URI. localhost and 127.0.0.1 are distinct origins; a mismatch
// here is the usual cause of "server unreachable" on save. Warn loudly in dev.
if (import.meta.env.DEV) {
  const configured = window.__FDP_CONFIG__?.publicOrigin || import.meta.env.VITE_PUBLIC_ORIGIN;
  if (configured && window.location.origin !== configured) {
    console.warn(
      `[fdp] Origin mismatch: app loaded at ${window.location.origin} but ` +
        `VITE_PUBLIC_ORIGIN is ${configured}. Cross-origin API writes and OIDC ` +
        `may fail (CORS / redirect_uri). Open the app at ${configured}, or align ` +
        `VITE_PUBLIC_ORIGIN, the server's FDP_CORS_allow_origins, and the Keycloak ` +
        `redirect URI to the same host spelling.`,
    );
  }
}

// Apply deployer white-label token overrides before mount so there's no flash of
// the default palette (this only injects a stylesheet; it needs no Pinia/router).
applyBranding();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin);
app.use(PrimeVue, { ripple: false });

// Bootstrap sequence (order matters):
//  1. Read `/config` so OIDC settings + feature flags come from the server, not
//     hardcoded env (TASKS 10.1). Best-effort: on failure the store keeps
//     permissive features and `configureOidc(null)` leaves the `.env` fallback.
//  2. Feed the resolved OIDC block into the user manager BEFORE it is first
//     constructed (loadStoredUser triggers that).
//  3. Hydrate any persisted OIDC session before mounting so the router guard
//     sees real auth state on first navigation (no flash of redirect-to-login).
const config = useConfigStore(pinia);
const auth = useAuthStore(pinia);
void config
  .load()
  .then(() => configureOidc(config.oidc))
  .then(() => auth.loadStoredUser())
  .finally(() => app.mount("#app"));
