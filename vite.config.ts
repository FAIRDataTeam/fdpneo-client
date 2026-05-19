/**
 * Vite configuration.
 *
 * The dev server proxies API requests to the FDP server so the SPA can use
 * relative URLs (`/api/*`, `/sparql`) without CORS complications during local
 * development. In production the SPA is served from the same origin as the
 * API or via a CDN with the API origin configured at build time.
 */

import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_FDP_API_URL || "http://localhost:8000";

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // Proxy API and SPARQL requests to the FDP server in dev so the SPA
        // can use relative URLs without dealing with CORS.
        "/api": { target: apiUrl, changeOrigin: true },
        "/sparql": { target: apiUrl, changeOrigin: true },
        "/openapi.json": { target: apiUrl, changeOrigin: true },
      },
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
          },
        },
      },
    },
  };
});
