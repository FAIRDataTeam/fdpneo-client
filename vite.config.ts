/**
 * Vite configuration.
 *
 * Networking model: **CORS-only** (TASKS 11.1). The client talks to the FDP
 * server directly at its absolute origin (`VITE_FDP_API_URL`); there is no dev
 * proxy. The server answers cross-origin requests via its `CORSMiddleware`,
 * whose `FDP_CORS_allow_origins` allow-list must include the SPA's exact origin
 * — `http://localhost:5173` and `http://127.0.0.1:5173` are *different* origins
 * to the browser, and the OIDC `redirect_uri` (Keycloak) must use the same
 * spelling as `VITE_PUBLIC_ORIGIN`. A dev-time mismatch is warned about at
 * startup (see `src/main.ts`). In production the SPA is served from the same
 * origin as the API, or from a CDN with the API origin configured at build
 * time.
 */

import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(() => {
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
    },
    build: {
      target: "es2022",
      sourcemap: true,
      rollupOptions: {
        output: {
          // Split the visual editors out — they're heavy (Vue Flow + N3) and
          // only loaded when stewards open them.
          manualChunks: {
            "vendor-vue": ["vue", "vue-router", "pinia"],
            "vendor-flow": ["@vue-flow/core", "@vue-flow/background", "@vue-flow/controls"],
            "vendor-rdf": ["n3"],
            "vendor-charts": ["chart.js", "vue-chartjs"],
            "vendor-monaco": ["monaco-editor"],
          },
        },
      },
    },
  };
});
