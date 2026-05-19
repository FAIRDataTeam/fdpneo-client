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
import "./styles/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin);
app.use(PrimeVue, {
  // TODO: configure theme tokens to match the agreed visual design once
  // Claude Design produces it. Defaults are fine for scaffolding.
  ripple: false,
});

app.mount("#app");
