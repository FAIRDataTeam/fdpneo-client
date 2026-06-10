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

import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Client version, read from package.json at config time and inlined as a
// compile-time constant (see `__APP_VERSION__` in env.d.ts). Surfaced in the
// footer's About dialog.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
) as { version: string };

export default defineConfig(() => {
  return {
    plugins: [vue()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
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
          // Split heavy vendors into stable, cacheable chunks. Function form
          // (matched on module id) because Vite 8's Rolldown bundler takes
          // `manualChunks` as a function, not the object map Rollup accepted.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@vue-flow")) return "vendor-flow";
            if (id.includes("monaco-editor")) return "vendor-monaco";
            if (id.includes("chart.js") || id.includes("vue-chartjs")) return "vendor-charts";
            if (/node_modules\/n3\//.test(id)) return "vendor-rdf";
            if (/node_modules\/(vue|vue-router|pinia|@vue)\//.test(id)) return "vendor-vue";
            return;
          },
        },
      },
    },
  };
});
