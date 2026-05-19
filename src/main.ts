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
import "./styles/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin);
app.use(PrimeVue, { ripple: false });

// Hydrate any persisted OIDC session before mounting so the router guard sees
// the real authenticated state on first navigation (avoids a flash of
// "redirect to login" on reload).
const auth = useAuthStore(pinia);
void auth.loadStoredUser().finally(() => app.mount("#app"));
